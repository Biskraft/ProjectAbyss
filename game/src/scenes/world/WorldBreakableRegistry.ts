import type { Container } from 'pixi.js';
import type { Breakable } from '@entities/Breakable';

export class WorldBreakableRegistry {
  readonly breakables: Breakable[] = [];

  add(breakable: Breakable, entityLayer?: Container): void {
    this.breakables.push(breakable);
    if (entityLayer && !breakable.container.parent) entityLayer.addChild(breakable.container);
  }

  clear(): void {
    for (const breakable of this.breakables) breakable.destroy();
    this.breakables.length = 0;
  }

  includes(breakable: Breakable): boolean {
    return this.breakables.includes(breakable);
  }

  removeAt(index: number): void {
    const breakable = this.breakables[index];
    breakable.destroy();
    this.breakables.splice(index, 1);
  }

  update(dtMs: number): void {
    for (const breakable of this.breakables) breakable.update(dtMs);
  }
}
