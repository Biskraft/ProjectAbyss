import { hazardToElement } from '@combat/ElementAffinity';
import type { Enemy } from '@entities/Enemy';
import type { Player } from '@entities/Player';
import type { DamageNumberManager } from '@ui/DamageNumber';
import type { HUD } from '@ui/HUD';
import type { ScreenFlash } from '@effects/ScreenFlash';
import type { FluidSpawnerManager } from '@systems/FluidSpawner';
import type { TileMutator } from '@systems/TileMutator';
import { placePlayerAt } from './PlayerPlacementHelpers';
import {
  applyTileHazards,
  CYRO_FROZEN_MS,
  CYRO_TICK_MS,
  CYRO_TICK_PCT,
  type HazardTarget,
  MAGMA_BURN_DURATION_MS,
} from '@systems/TileHazards';

interface TileHazardFeedbackGame {
  camera: {
    shake: (amount: number) => void;
  };
  hitstopFrames: number;
}

interface PlayerHazardFeedbackDeps {
  game: TileHazardFeedbackGame;
  hud: HUD;
  damageNumbers: DamageNumberManager;
  screenFlash: ScreenFlash;
  setDeathHitstopFrames?: (frames: number) => void;
}

interface ApplyPlayerSpikeHitFeedbackInput extends PlayerHazardFeedbackDeps {
  player: Player;
  onRumble?: () => void;
}

interface ApplyPlayerTileHazardsInput extends PlayerHazardFeedbackDeps {
  player: Player;
  grid: number[][];
  tileMutator: TileMutator;
  dtMs: number;
}

interface ApplyPlayerWaterfallHazardsInput extends PlayerHazardFeedbackDeps {
  player: Player;
  grid: number[][];
  fluidSpawners: FluidSpawnerManager;
  dtMs: number;
}

interface ApplyEnemyTileHazardsInput {
  enemies: Enemy<string>[];
  grid: number[][];
  tileMutator: TileMutator;
  damageNumbers: DamageNumberManager;
  dtMs: number;
}

function createPlayerHazardTarget(player: Player): HazardTarget {
  const box = player.getHurtAABB();
  return {
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    get hp() { return player.hp; },
    set hp(value: number) { player.hp = value; },
    get maxHp() { return player.maxHp; },
    get invincible() { return player.invincible; },
    get burnRemainingMs() { return player.burnRemainingMs; },
    set burnRemainingMs(value: number | undefined) { player.burnRemainingMs = value ?? 0; },
    get burnTickAccum() { return player.burnTickAccum; },
    set burnTickAccum(value: number | undefined) { player.burnTickAccum = value ?? 0; },
    get chargedTickAccum() { return player.chargedTickAccum; },
    set chargedTickAccum(value: number | undefined) { player.chargedTickAccum = value ?? 0; },
    get acidTickAccum() { return player.acidTickAccum; },
    set acidTickAccum(value: number | undefined) { player.acidTickAccum = value ?? 0; },
    get prevInElectric() { return player.prevInElectric; },
    set prevInElectric(value: boolean | undefined) { player.prevInElectric = value ?? false; },
    get electricTickAccum() { return player.chargedTickAccum; },
    set electricTickAccum(value: number | undefined) { player.chargedTickAccum = value ?? 0; },
    get chargedStateMs() { return player.chargedStateMs; },
    set chargedStateMs(value: number | undefined) { player.chargedStateMs = value ?? 0; },
    get cyroTickAccum() { return player.cyroTickAccum; },
    set cyroTickAccum(value: number | undefined) { player.cyroTickAccum = value ?? 0; },
    get cyroSlowRemainingMs() { return player.cyroSlowRemainingMs; },
    set cyroSlowRemainingMs(value: number | undefined) { player.cyroSlowRemainingMs = value ?? 0; },
    extinguishFireDebuffs: () => player.extinguishFireDebuffs(),
  };
}

export function applyPlayerTileHazardsWithFeedback(input: ApplyPlayerTileHazardsInput): void {
  const { player } = input;
  if (player.hp <= 0) return;

  applyTileHazards(createPlayerHazardTarget(player), input.grid, input.tileMutator, input.dtMs, {
    onDamage: (amount, src) => {
      if (player.invincible) return;
      const dmg = Math.max(1, Math.floor(amount));
      player.hp -= dmg;
      player.lastDamageSource = src;
      input.hud.flashDamage();
      input.damageNumbers.spawn(
        player.x + player.width / 2,
        player.y - 8,
        dmg,
        src === 'thunder',
      );
      if (src === 'thunder') {
        input.game.camera.shake(6);
        input.game.hitstopFrames = 8;
        input.screenFlash.flashDamage(true);
      } else if (src === 'magma' || src === 'fire') {
        input.game.camera.shake(2);
      }
      if (player.hp <= 0) {
        player.hp = 0;
        player.onDeath();
        input.setDeathHitstopFrames?.(8);
        input.screenFlash.flashDamage(true);
      }
    },
    onBurnApplied: () => player.triggerFlash(),
  });
}

export function applyPlayerSpikeHitFeedback(input: ApplyPlayerSpikeHitFeedbackInput): void {
  const { player } = input;
  const dmg = Math.max(1, Math.floor(player.maxHp * 0.2));
  player.lastDamageSource = 'spike';
  player.hp -= dmg;
  input.hud.flashDamage();
  player.invincible = true;
  player.invincibleTimer = 1000;

  input.game.hitstopFrames = 16;
  input.game.camera.shake(5);
  input.onRumble?.();
  input.screenFlash.flashDamage(true);
  player.triggerFlash();
  input.damageNumbers.spawn(
    player.x + player.width / 2,
    player.y - 8,
    dmg,
    true,
  );

  placePlayerAt(player, player.lastSafeX, player.lastSafeY, {
    resetVelocity: true,
    savePreviousPosition: true,
  });

  if (player.hp <= 0) {
    player.hp = 0;
    player.onDeath();
    input.setDeathHitstopFrames?.(8);
    input.screenFlash.flashDamage(true);
  }
}

export function applyPlayerWaterfallHazardsWithFeedback(
  input: ApplyPlayerWaterfallHazardsInput,
): void {
  const { player } = input;
  const playerBox = player.getHurtAABB();
  const waterfallType = input.fluidSpawners.queryFluidAtAabb(
    playerBox.x,
    playerBox.y,
    playerBox.width,
    playerBox.height,
    input.grid,
  );
  if (waterfallType === 'water') {
    player.extinguishFireDebuffs();
  } else if (waterfallType === 'acid' && !player.invincible) {
    let acc = player.acidTickAccum ?? 0;
    acc += input.dtMs;
    while (acc >= 100) {
      acc -= 100;
      const dmg = Math.max(1, Math.floor(player.maxHp * 0.005));
      player.hp -= dmg;
      player.lastDamageSource = 'acid';
      input.hud.flashDamage();
      input.damageNumbers.spawn(player.x + player.width / 2, player.y - 8, dmg, false);
    }
    player.acidTickAccum = acc;
  } else if (waterfallType === 'magma') {
    const wasBurning = (player.burnRemainingMs ?? 0) > 0;
    player.burnRemainingMs = MAGMA_BURN_DURATION_MS;
    if (!wasBurning && !player.invincible) {
      const dmg = Math.max(1, Math.floor(player.maxHp * 0.10));
      player.hp -= dmg;
      player.lastDamageSource = 'magma';
      input.hud.flashDamage();
      input.damageNumbers.spawn(player.x + player.width / 2, player.y - 8, dmg, false);
      input.game.camera.shake(2);
      player.triggerFlash();
    }
  } else if (waterfallType === 'cyro') {
    player.extinguishFireDebuffs();
    player.cyroSlowRemainingMs = CYRO_FROZEN_MS;
    let acc = player.cyroTickAccum ?? 0;
    acc += input.dtMs;
    while (acc >= CYRO_TICK_MS) {
      acc -= CYRO_TICK_MS;
      if (!player.invincible) {
        const dmg = Math.max(1, Math.floor(player.maxHp * CYRO_TICK_PCT));
        player.hp -= dmg;
        player.lastDamageSource = 'cyro';
        input.hud.flashDamage();
        input.damageNumbers.spawn(player.x + player.width / 2, player.y - 8, dmg, false);
      }
    }
    player.cyroTickAccum = acc;
  }
  if (player.hp <= 0) {
    player.hp = 0;
    player.onDeath();
    input.screenFlash.flashDamage(true);
  }
}

export function applyEnemyTileHazardsWithFeedback(input: ApplyEnemyTileHazardsInput): void {
  for (const enemy of input.enemies) {
    if (!enemy.alive || enemy.hp <= 0) continue;
    applyTileHazards(enemy, input.grid, input.tileMutator, input.dtMs, {
      onDamage: (amount, src) => {
        const mult = enemy.elementMultiplier(hazardToElement(src));
        if (mult <= 0) return;
        const dmg = Math.max(1, Math.floor(amount * mult));
        enemy.hp -= dmg;
        enemy.showHpBarFlash();
        input.damageNumbers.spawn(enemy.x + enemy.width / 2, enemy.y - 8, dmg, src === 'thunder');
        if (enemy.hp <= 0) {
          enemy.hp = 0;
          enemy.onDeath();
        }
      },
    });
  }
}
