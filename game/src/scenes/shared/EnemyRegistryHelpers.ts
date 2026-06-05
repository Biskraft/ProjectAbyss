import type { Container } from 'pixi.js';
import type { Enemy } from '@entities/Enemy';
import type { CombatEntity } from '@combat/HitManager';
import { detachDisplayObject } from '@scenes/shared/DisplayObjectLifecycleHelpers';

export function addEnemyToRegistry(
  enemies: Enemy<string>[],
  enemy: Enemy<string>,
  entityLayer?: Container,
): void {
  enemies.push(enemy);
  if (entityLayer && !enemy.container.parent) entityLayer.addChild(enemy.container);
}

export function removeEnemyAt(enemies: Enemy<string>[], index: number): void {
  const enemy = enemies[index];
  if (enemy) detachDisplayObject(enemy.container);
  enemies.splice(index, 1);
}

export function clearEnemies(enemies: Enemy<string>[]): void {
  for (const enemy of enemies) {
    detachDisplayObject(enemy.container);
  }
  enemies.length = 0;
}

export function countAliveEnemies(enemies: readonly Enemy<string>[]): number {
  return enemies.filter((enemy) => enemy.alive).length;
}

export function getAliveEnemiesAsCombatTargets(
  enemies: readonly Enemy<string>[],
  isAllowed?: (enemy: Enemy<string>) => boolean,
): CombatEntity[] {
  return enemies.filter(
    (enemy): enemy is Enemy<string> => enemy.alive && (!isAllowed || isAllowed(enemy)),
  ) as CombatEntity[];
}

export function countDefeatedEnemies(enemies: readonly Enemy<string>[]): number {
  return enemies.filter((enemy) => !enemy.alive).length;
}

export function hasAnyEnemy(enemies: readonly Enemy<string>[]): boolean {
  return enemies.length > 0;
}

export function hasAliveEnemyWithin(
  enemies: readonly Enemy<string>[],
  x: number,
  y: number,
  range: number,
): boolean {
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    if (Math.abs(enemy.x - x) < range && Math.abs(enemy.y - y) < range) return true;
  }
  return false;
}

export function updateEnemies(enemies: readonly Enemy<string>[], dtMs: number): void {
  for (const enemy of enemies) enemy.update(dtMs);
}

export function renderEnemies(enemies: readonly Enemy<string>[], alpha: number): void {
  for (const enemy of enemies) enemy.render(alpha);
}
