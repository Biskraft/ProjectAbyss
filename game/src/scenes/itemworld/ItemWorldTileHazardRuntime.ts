import { GAME_HEIGHT, GAME_WIDTH, type Game } from '../../Game';
import type { Player } from '@entities/Player';
import type { Enemy } from '@entities/Enemy';
import type { BreakableProp } from '@entities/BreakableProp';
import type { BurnableProp } from '@entities/BurnableProp';
import type { HUD } from '@ui/HUD';
import type { DamageNumberManager } from '@ui/DamageNumber';
import type { ScreenFlash } from '@effects/ScreenFlash';
import type { AshRemnantManager } from '@effects/AshRemnant';
import type { GrassClumpFireSystem } from '@effects/GrassClumpFire';
import type { FluidSystem, FluidCellBounds } from '@effects/FluidSystem';
import type { FluidCrestFoamManager } from '@effects/FluidCrestFoam';
import type { FluidSpawnerManager } from '@systems/FluidSpawner';
import type { TileMutator } from '@systems/TileMutator';
import type { TileMutatorRenderer } from '@systems/TileMutatorRenderer';
import {
  applyTileHazards,
  CYRO_FROZEN_MS,
  CYRO_TICK_MS,
  CYRO_TICK_PCT,
  MAGMA_BURN_DURATION_MS,
} from '@systems/TileHazards';
import { hazardToElement } from '@combat/ElementAffinity';
import {
  IW_ROOM_H_PX,
  IW_ROOM_H_TILES,
  IW_ROOM_W_PX,
  IW_ROOM_W_TILES,
} from './ItemWorldMapController';

interface ItemWorldTileHazardRuntimeDeps {
  game: Game;
  getFullGrid: () => number[][];
  getCurrentRoom: () => { col: number; row: number };
  getTileMutator: () => TileMutator;
  getTileMutatorRenderer: () => TileMutatorRenderer | null | undefined;
  getBurnableProps: () => BurnableProp[];
  getBreakableProps: () => BreakableProp[];
  getAshRemnant: () => AshRemnantManager;
  getGrassClumpFire: () => GrassClumpFireSystem;
  getFluidSystem: () => FluidSystem;
  getFluidSpawners: () => FluidSpawnerManager;
  getFluidCrestFoam: () => FluidCrestFoamManager;
  getPlayer: () => Player;
  getEnemies: () => Enemy<string>[];
  getHud: () => HUD;
  getDamageNumbers: () => DamageNumberManager;
  getScreenFlash: () => ScreenFlash;
  destroyBreakablePropWithEffects: (prop: BreakableProp, source: 'fire') => void;
}

export class ItemWorldTileHazardRuntime {
  private fluidGridDirty = false;

  constructor(private readonly deps: ItemWorldTileHazardRuntimeDeps) {}

  markFluidGridDirty(): void {
    this.fluidGridDirty = true;
  }

  getActiveTileBounds(roomBuffer = 2): FluidCellBounds {
    const fullGrid = this.deps.getFullGrid();
    const gridH = fullGrid.length;
    const gridW = fullGrid[0]?.length ?? 0;
    if (!gridH || !gridW) return { minGx: 0, minGy: 0, maxGx: 0, maxGy: 0 };

    const cam = this.deps.game.camera;
    const halfW = (GAME_WIDTH / cam.zoom) * 0.5;
    const halfH = (GAME_HEIGHT / cam.zoom) * 0.5;
    const padX = IW_ROOM_W_PX * roomBuffer;
    const padY = IW_ROOM_H_PX * roomBuffer;
    const viewL = cam.renderX - halfW - padX;
    const viewR = cam.renderX + halfW + padX;
    const viewT = cam.renderY - halfH - padY;
    const viewB = cam.renderY + halfH + padY;

    const currentRoom = this.deps.getCurrentRoom();
    const fallbackCx = currentRoom.col * IW_ROOM_W_TILES + Math.floor(IW_ROOM_W_TILES / 2);
    const fallbackCy = currentRoom.row * IW_ROOM_H_TILES + Math.floor(IW_ROOM_H_TILES / 2);
    const fallbackMinGx = fallbackCx - IW_ROOM_W_TILES * roomBuffer;
    const fallbackMaxGx = fallbackCx + IW_ROOM_W_TILES * roomBuffer;
    const fallbackMinGy = fallbackCy - IW_ROOM_H_TILES * roomBuffer;
    const fallbackMaxGy = fallbackCy + IW_ROOM_H_TILES * roomBuffer;
    const minGx = Math.min(
      Number.isFinite(viewL) ? Math.floor(viewL / 16) : fallbackMinGx,
      fallbackMinGx,
    );
    const maxGx = Math.max(
      Number.isFinite(viewR) ? Math.ceil(viewR / 16) : fallbackMaxGx,
      fallbackMaxGx,
    );
    const minGy = Math.min(
      Number.isFinite(viewT) ? Math.floor(viewT / 16) : fallbackMinGy,
      fallbackMinGy,
    );
    const maxGy = Math.max(
      Number.isFinite(viewB) ? Math.ceil(viewB / 16) : fallbackMaxGy,
      fallbackMaxGy,
    );
    return {
      minGx: Math.max(0, minGx),
      minGy: Math.max(0, minGy),
      maxGx: Math.min(gridW - 1, maxGx),
      maxGy: Math.min(gridH - 1, maxGy),
    };
  }

  update(dtMs: number): void {
    const fullGrid = this.deps.getFullGrid();
    if (!fullGrid || !fullGrid.length) return;

    const tileMutator = this.deps.getTileMutator();
    const activeTileBounds = this.getActiveTileBounds();
    tileMutator.tick(fullGrid, dtMs, activeTileBounds);

    this.updateBurnableProps(dtMs);
    this.deps.getGrassClumpFire().update(dtMs, tileMutator, fullGrid, this.deps.getAshRemnant(), 16);
    this.updateBreakableBurnout();
    this.deps.getAshRemnant().update(dtMs);
    this.deps.getTileMutatorRenderer()?.update(tileMutator, fullGrid, dtMs);

    if (this.fluidGridDirty) {
      this.fluidGridDirty = false;
      this.deps.getFluidSystem().refreshFromGrid(fullGrid, activeTileBounds);
    }

    const fluidSystem = this.deps.getFluidSystem();
    const fluidSpawners = this.deps.getFluidSpawners();
    fluidSpawners.update(dtMs, fullGrid, fluidSystem);
    fluidSystem.update(dtMs, activeTileBounds);
    fluidSystem.gravityTick(fullGrid, dtMs, tileMutator, activeTileBounds);
    fluidSpawners.pressureDrain(fullGrid, fluidSystem);
    this.deps.getFluidCrestFoam().update(dtMs, fluidSpawners.getActiveSegments(fullGrid));

    this.applyPlayerHazards(dtMs);
    this.applyEnemyHazards(dtMs);
  }

  private updateBurnableProps(dtMs: number): void {
    const burnableProps = this.deps.getBurnableProps();
    const tileMutator = this.deps.getTileMutator();
    const ashRemnant = this.deps.getAshRemnant();
    for (let i = burnableProps.length - 1; i >= 0; i--) {
      const prop = burnableProps[i];
      prop.update(dtMs);
      if (!prop.destroyed) continue;
      if (prop.spec.anchor !== 'ceiling') {
        ashRemnant.spawn(prop.x + prop.width / 2, prop.y + prop.height - 1, prop.width);
      }
      tileMutator.unregisterBurnable(prop);
      prop.destroy();
      burnableProps.splice(i, 1);
    }
  }

  private updateBreakableBurnout(): void {
    const breakableProps = this.deps.getBreakableProps();
    const tileMutator = this.deps.getTileMutator();
    for (let i = breakableProps.length - 1; i >= 0; i--) {
      const prop = breakableProps[i];
      if (prop.destroyed) {
        tileMutator.unregisterBurnable(prop);
        breakableProps.splice(i, 1);
        continue;
      }
      if (prop.burnedOut) {
        tileMutator.unregisterBurnable(prop);
        this.deps.destroyBreakablePropWithEffects(prop, 'fire');
        breakableProps.splice(i, 1);
      }
    }
  }

  private applyPlayerHazards(dtMs: number): void {
    const player = this.deps.getPlayer();
    if (player.hp <= 0) return;

    const fullGrid = this.deps.getFullGrid();
    const tileMutator = this.deps.getTileMutator();
    applyTileHazards(player, fullGrid, tileMutator, dtMs, {
      onDamage: (amount, src) => {
        if (player.invincible) return;
        const dmg = Math.max(1, Math.floor(amount));
        player.hp -= dmg;
        player.lastDamageSource = src;
        this.deps.getHud().flashDamage();
        this.deps.getDamageNumbers().spawn(
          player.x + player.width / 2,
          player.y - 8,
          dmg,
          src === 'thunder',
        );
        if (src === 'thunder') {
          this.deps.game.camera.shake(6);
          this.deps.game.hitstopFrames = 8;
          this.deps.getScreenFlash().flashDamage(true);
        } else if (src === 'magma' || src === 'fire') {
          this.deps.game.camera.shake(2);
        }
        if (player.hp <= 0) {
          player.hp = 0;
          player.onDeath();
          this.deps.getScreenFlash().flashDamage(true);
        }
      },
      onBurnApplied: () => player.triggerFlash(),
    });

    this.applyWaterfallHazards(player, fullGrid, dtMs);
    if (player.hp <= 0) {
      player.hp = 0;
      player.onDeath();
      this.deps.getScreenFlash().flashDamage(true);
    }
  }

  private applyWaterfallHazards(player: Player, fullGrid: number[][], dtMs: number): void {
    const waterfallType = this.deps.getFluidSpawners().queryFluidAtAabb(
      player.x,
      player.y,
      player.width,
      player.height,
      fullGrid,
    );
    if (waterfallType === 'water') {
      player.extinguishFireDebuffs();
    } else if (waterfallType === 'acid' && !player.invincible) {
      let acc = player.acidTickAccum ?? 0;
      acc += dtMs;
      while (acc >= 100) {
        acc -= 100;
        const dmg = Math.max(1, Math.floor(player.maxHp * 0.005));
        player.hp -= dmg;
        player.lastDamageSource = 'acid';
        this.deps.getHud().flashDamage();
        this.deps.getDamageNumbers().spawn(player.x + player.width / 2, player.y - 8, dmg, false);
      }
      player.acidTickAccum = acc;
    } else if (waterfallType === 'magma') {
      const wasBurning = (player.burnRemainingMs ?? 0) > 0;
      player.burnRemainingMs = MAGMA_BURN_DURATION_MS;
      if (!wasBurning && !player.invincible) {
        const dmg = Math.max(1, Math.floor(player.maxHp * 0.10));
        player.hp -= dmg;
        player.lastDamageSource = 'magma';
        this.deps.getHud().flashDamage();
        this.deps.getDamageNumbers().spawn(player.x + player.width / 2, player.y - 8, dmg, false);
        this.deps.game.camera.shake(2);
        player.triggerFlash();
      }
    } else if (waterfallType === 'cyro') {
      player.extinguishFireDebuffs();
      player.cyroSlowRemainingMs = CYRO_FROZEN_MS;
      let acc = player.cyroTickAccum ?? 0;
      acc += dtMs;
      while (acc >= CYRO_TICK_MS) {
        acc -= CYRO_TICK_MS;
        if (!player.invincible) {
          const dmg = Math.max(1, Math.floor(player.maxHp * CYRO_TICK_PCT));
          player.hp -= dmg;
          player.lastDamageSource = 'cyro';
          this.deps.getHud().flashDamage();
          this.deps.getDamageNumbers().spawn(player.x + player.width / 2, player.y - 8, dmg, false);
        }
      }
      player.cyroTickAccum = acc;
    }
  }

  private applyEnemyHazards(dtMs: number): void {
    const fullGrid = this.deps.getFullGrid();
    const tileMutator = this.deps.getTileMutator();
    const damageNumbers = this.deps.getDamageNumbers();
    for (const enemy of this.deps.getEnemies()) {
      if (!enemy.alive || enemy.hp <= 0) continue;
      applyTileHazards(enemy, fullGrid, tileMutator, dtMs, {
        onDamage: (amount, src) => {
          const mult = enemy.elementMultiplier(hazardToElement(src));
          if (mult <= 0) return;
          const dmg = Math.max(1, Math.floor(amount * mult));
          enemy.hp -= dmg;
          enemy.showHpBarFlash();
          damageNumbers.spawn(enemy.x + enemy.width / 2, enemy.y - 8, dmg, src === 'thunder');
          if (enemy.hp <= 0) {
            enemy.hp = 0;
            enemy.onDeath();
          }
        },
      });
    }
  }
}
