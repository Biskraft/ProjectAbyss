import type { Container } from 'pixi.js';
import type { Enemy } from '@entities/Enemy';
import {
  addEnemyToRegistry,
  clearEnemies,
  countAliveEnemies,
  hasAliveEnemyWithin,
  removeEnemyAt,
} from '@scenes/shared/EnemyRegistryHelpers';

export class WorldEnemyRegistry {
  readonly enemies: Enemy<string>[] = [];

  add(enemy: Enemy<string>, entityLayer?: Container): void {
    addEnemyToRegistry(this.enemies, enemy, entityLayer);
  }

  removeAt(index: number): void {
    removeEnemyAt(this.enemies, index);
  }

  clear(): void {
    clearEnemies(this.enemies);
  }

  aliveCount(): number {
    return countAliveEnemies(this.enemies);
  }

  hasAliveWithin(x: number, y: number, range: number): boolean {
    return hasAliveEnemyWithin(this.enemies, x, y, range);
  }
}
