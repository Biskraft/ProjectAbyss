import type { Container } from 'pixi.js';
import type { BreakableProp } from '@entities/BreakableProp';
import {
  addBreakablePropToRegistry,
  clearBreakableProps,
  removeBreakablePropAt,
  updateBreakableProps,
} from '@scenes/shared/BreakablePropRegistryHelpers';

export class WorldBreakablePropRegistry {
  readonly props: BreakableProp[] = [];

  add(prop: BreakableProp, entityLayer?: Container): void {
    addBreakablePropToRegistry(this.props, prop, entityLayer);
  }

  clear(): void {
    clearBreakableProps(this.props);
  }

  removeAt(index: number): void {
    removeBreakablePropAt(this.props, index);
  }

  update(dtMs: number): void {
    updateBreakableProps(this.props, dtMs);
  }
}
