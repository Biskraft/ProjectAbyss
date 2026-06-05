import type { Enemy } from '@entities/Enemy';
import type { Player } from '@entities/Player';

export interface EnemySpawnInitializationDeps {
  getCollisionGrid: () => number[][];
  getPlayer: () => Player;
}

export function initializeEnemySpawnedEntity(
  enemy: Enemy<string>,
  x: number,
  y: number,
  deps: EnemySpawnInitializationDeps,
): void {
  enemy.x = x;
  enemy.y = y;
  enemy.bindSpawnContext(deps.getCollisionGrid(), deps.getPlayer());
}
