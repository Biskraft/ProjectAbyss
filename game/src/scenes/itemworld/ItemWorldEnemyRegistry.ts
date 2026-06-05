import type { Enemy } from '@entities/Enemy';
import type { Container } from 'pixi.js';
import {
  addEnemyToRegistry,
  clearEnemies,
  countDefeatedEnemies,
  hasAnyEnemy,
  removeEnemyAt,
  renderEnemies,
  updateEnemies,
} from '@scenes/shared/EnemyRegistryHelpers';

export class ItemWorldEnemyRegistry {
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

  defeatedCount(): number {
    return countDefeatedEnemies(this.enemies);
  }

  hasAny(): boolean {
    return hasAnyEnemy(this.enemies);
  }

  update(dtMs: number): void {
    updateEnemies(this.enemies, dtMs);
  }

  render(alpha: number): void {
    renderEnemies(this.enemies, alpha);
  }
}
