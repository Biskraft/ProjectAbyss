import type { Container } from 'pixi.js';
import type { Enemy } from '@entities/Enemy';

export class WorldEnemyRegistry {
  readonly enemies: Enemy<string>[] = [];

  add(enemy: Enemy<string>, entityLayer?: Container): void {
    this.enemies.push(enemy);
    if (entityLayer && !enemy.container.parent) entityLayer.addChild(enemy.container);
  }

  removeAt(index: number): void {
    const enemy = this.enemies[index];
    if (enemy.container.parent) enemy.container.parent.removeChild(enemy.container);
    this.enemies.splice(index, 1);
  }

  clear(): void {
    for (const enemy of this.enemies) {
      if (enemy.container.parent) enemy.container.parent.removeChild(enemy.container);
    }
    this.enemies.length = 0;
  }

  aliveCount(): number {
    return this.enemies.filter((enemy) => enemy.alive).length;
  }

  hasAliveWithin(x: number, y: number, range: number): boolean {
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      if (Math.abs(enemy.x - x) < range && Math.abs(enemy.y - y) < range) return true;
    }
    return false;
  }
}
