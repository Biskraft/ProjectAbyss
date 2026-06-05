import { GameAction } from '@core/InputManager';
import { EGO_SHARD_MAX, SHARD_RECOVERY_MS, type Player } from '@entities/Player';
import { CAST_MIN_GAP_MS } from '@effects/EgoShard';
import type { EgoShardRuntime } from '@effects/EgoShardRuntime';

const TILE_SIZE = 16;

interface EgoShardCastStateDeps {
  player: Player;
  egoShardRuntime: EgoShardRuntime;
  collisionGrid: number[][];
  dtMs: number;
  isCastPressed: boolean;
  hasHeldContainer: boolean;
}

export interface EgoShardCastRuntimeDeps {
  input: {
    isDown(action: GameAction): boolean;
  };
  getPlayer: () => Player;
  getCollisionGrid: () => number[][];
  getEgoShardRuntime: () => EgoShardRuntime;
  hasHeldContainer: () => boolean;
}

export interface EgoShardCastRuntimeAdapterDeps {
  game: {
    input: EgoShardCastRuntimeDeps['input'];
  };
  getPlayer: () => Player;
  getCollisionGrid: () => number[][];
  getEgoShardRuntime: () => EgoShardRuntime;
  hasHeldContainer: () => boolean;
}

export class EgoShardCastRuntimeAdapter {
  constructor(protected readonly deps: EgoShardCastRuntimeAdapterDeps) {}

  update(dtMs: number): void {
    updateEgoShardCastRuntime({
      input: this.deps.game.input,
      getPlayer: this.deps.getPlayer,
      getEgoShardRuntime: this.deps.getEgoShardRuntime,
      getCollisionGrid: this.deps.getCollisionGrid,
      hasHeldContainer: this.deps.hasHeldContainer,
    }, dtMs);
  }
}

export function isEgoShardDebugAbilityEnabled(): boolean {
  return new URLSearchParams(window.location.search).has('debug');
}

export function updateEgoShardCastRuntime(deps: EgoShardCastRuntimeDeps, dtMs: number): void {
  updateEgoShardCastState({
    player: deps.getPlayer(),
    egoShardRuntime: deps.getEgoShardRuntime(),
    collisionGrid: deps.getCollisionGrid(),
    dtMs,
    isCastPressed: deps.input.isDown(GameAction.CAST),
    hasHeldContainer: deps.hasHeldContainer(),
  });
}

export function updateEgoShardCastState(deps: EgoShardCastStateDeps): void {
  const {
    player,
    egoShardRuntime,
    collisionGrid,
    dtMs,
    isCastPressed,
    hasHeldContainer,
  } = deps;
  const shardAbilityOn = isEgoShardDebugAbilityEnabled();

  if (!shardAbilityOn) {
    resetEgoShardCastState(player, egoShardRuntime);
  }

  const castDown = shardAbilityOn && !hasHeldContainer && isCastPressed;
  const canCast = shardAbilityOn
    && !hasHeldContainer
    && player.egoCastCooldownMs <= 0
    && player.egoShardCount > 0;
  const facing: -1 | 1 = player.facingRight ? 1 : -1;
  const { launchX, launchY } = getEgoShardLaunchPoint(player, facing);

  if (castDown && canCast) {
    egoShardRuntime.advanceCharge(dtMs);
    player.isAiming = true;
    const { vx, vy } = egoShardRuntime.getChargedVelocity(facing);
    egoShardRuntime.showPreview(
      launchX,
      launchY,
      vx,
      vy,
      player.activeEnchant,
      (x, y) => isEgoShardPreviewSolidAt(collisionGrid, x, y),
    );
  } else if (!castDown && egoShardRuntime.hasCharge) {
    if (canCast) {
      const { vx, vy } = egoShardRuntime.getChargedVelocity(facing);
      egoShardRuntime.spawn(launchX, launchY, vx, vy, player.activeEnchant);
      player.egoShardCount--;
      player.shardCooldowns.push(SHARD_RECOVERY_MS);
      player.egoCastCooldownMs = CAST_MIN_GAP_MS;
    }
    resetEgoShardCastState(player, egoShardRuntime);
  } else {
    egoShardRuntime.hidePreview();
    player.isAiming = false;
  }

  tickEgoShardCooldowns(dtMs, player, egoShardRuntime);
}

export function resetEgoShardCastState(player: Player, egoShardRuntime: EgoShardRuntime): void {
  egoShardRuntime.resetCharge();
  egoShardRuntime.hidePreview();
  player.isAiming = false;
}

function tickEgoShardCooldowns(dtMs: number, player: Player, egoShardRuntime: EgoShardRuntime): void {
  if (player.egoCastCooldownMs > 0) {
    player.egoCastCooldownMs = Math.max(0, player.egoCastCooldownMs - dtMs);
  }

  const cooldowns = player.shardCooldowns;
  for (let i = cooldowns.length - 1; i >= 0; i--) {
    cooldowns[i] -= dtMs;
    if (cooldowns[i] <= 0) {
      cooldowns.splice(i, 1);
      player.egoShardCount = Math.min(player.egoShardCount + 1, EGO_SHARD_MAX);
      egoShardRuntime.removeOldestShard();
    }
  }
}

function getEgoShardLaunchPoint(player: Player, facing: -1 | 1): { launchX: number; launchY: number } {
  return {
    launchX: player.x + player.width / 2 + facing * 14,
    launchY: player.y + player.height * 0.38 - 5,
  };
}

function isEgoShardPreviewSolidAt(collisionGrid: number[][], x: number, y: number): boolean {
  const gx = Math.floor(x / TILE_SIZE);
  const gy = Math.floor(y / TILE_SIZE);
  const tile = collisionGrid[gy]?.[gx] ?? 0;
  return tile === 1 || tile === 7 || tile === 9 || tile === 12 || tile === 15;
}
