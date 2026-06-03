import type { Enemy } from '@entities/Enemy';

export class ItemWorldEnemyRegistry {
  readonly enemies: Enemy<string>[] = [];

  clear(): void {
    for (const enemy of this.enemies) {
      if (enemy.container.parent) {
        enemy.container.parent.removeChild(enemy.container);
      }
    }
    this.enemies.length = 0;
  }

  defeatedCount(): number {
    return this.enemies.filter(enemy => !enemy.alive).length;
  }

  hasAny(): boolean {
    return this.enemies.length > 0;
  }

  update(dtMs: number): void {
    for (const enemy of this.enemies) enemy.update(dtMs);
  }

  render(alpha: number): void {
    for (const enemy of this.enemies) enemy.render(alpha);
  }
}
