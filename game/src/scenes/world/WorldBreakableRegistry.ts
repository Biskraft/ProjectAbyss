import type { Container } from 'pixi.js';
import type { Breakable } from '@entities/Breakable';
import {
  addEntityToLayer,
  destroyAndClearEntities,
  removeEntityAt,
  updateEntities,
} from '@scenes/shared/EntityLifecycleHelpers';

export class WorldBreakableRegistry {
  readonly breakables: Breakable[] = [];

  add(breakable: Breakable, entityLayer?: Container): void {
    addEntityToLayer(this.breakables, breakable, entityLayer, { onlyAttachIfUnparented: true });
  }

  clear(): void {
    destroyAndClearEntities(this.breakables);
  }

  includes(breakable: Breakable): boolean {
    return this.breakables.includes(breakable);
  }

  removeAt(index: number): void {
    removeEntityAt(this.breakables, index);
  }

  update(dtMs: number): void {
    updateEntities(this.breakables, dtMs);
  }
}
