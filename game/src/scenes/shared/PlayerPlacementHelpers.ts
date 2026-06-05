import type { Player } from '@entities/Player';
import type { Enemy } from '@entities/Enemy';

interface PlayerSize {
  width: number;
  height: number;
}

interface BottomCenterPoint {
  x: number;
  y: number;
}

interface TopLeftPoint {
  x: number;
  y: number;
}

interface PlacePlayerAtOptions {
  collisionGrid?: number[][];
  velocity?: { vx: number; vy: number };
  resetVelocity?: boolean;
  savePreviousPosition?: boolean;
}

interface StopPlayerMotionOptions {
  savePreviousPosition?: boolean;
}

interface RespawnPlayerAtOptions {
  savePreviousPosition?: boolean;
}

interface PreviousPositionSyncTarget {
  savePrevPosition(): void;
}

export function bindPlayerCollisionGrid(player: Player, collisionGrid: number[][]): void {
  player.bindCollisionGrid(collisionGrid);
}

export function playerTopLeftFromBottomCenter(
  point: BottomCenterPoint,
  size: PlayerSize,
): TopLeftPoint {
  return {
    x: Math.round(point.x - size.width / 2),
    y: Math.round(point.y - size.height),
  };
}

export function placePlayerAt(
  player: Player,
  x: number,
  y: number,
  options: PlacePlayerAtOptions = {},
): void {
  player.x = x;
  player.y = y;
  if (options.velocity) {
    player.vx = options.velocity.vx;
    player.vy = options.velocity.vy;
  } else if (options.resetVelocity) {
    player.vx = 0;
    player.vy = 0;
  }
  if (options.collisionGrid) {
    bindPlayerCollisionGrid(player, options.collisionGrid);
  }
  if (options.savePreviousPosition) {
    player.savePrevPosition();
  }
}

export function stopPlayerMotion(player: Player, options: StopPlayerMotionOptions = {}): void {
  player.vx = 0;
  player.vy = 0;
  if (options.savePreviousPosition) {
    player.savePrevPosition();
  }
}

export function respawnPlayerAt(
  player: Player,
  x: number,
  y: number,
  options: RespawnPlayerAtOptions = {},
): void {
  player.x = x;
  player.y = y;
  player.respawn();
  if (options.savePreviousPosition) {
    player.savePrevPosition();
  }
}

export function syncPreviousPositions(...targets: PreviousPositionSyncTarget[]): void {
  for (const target of targets) {
    target.savePrevPosition();
  }
}

export function syncPlayerAndEnemyPreviousPositions(
  player: Player,
  enemies: Enemy<string>[],
): void {
  syncPreviousPositions(player, ...enemies);
}
