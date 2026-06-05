import type { Container } from 'pixi.js';
import type { BurnableProp } from '@entities/BurnableProp';
import {
  addBurnablePropToRegistry,
  clearBurnableProps,
  removeBurnablePropAt,
} from '@scenes/shared/BurnablePropRegistryHelpers';

export class WorldBurnablePropRegistry {
  readonly props: BurnableProp[] = [];

  add(prop: BurnableProp, entityLayer?: Container): void {
    addBurnablePropToRegistry(this.props, prop, entityLayer);
  }

  clear(): void {
    clearBurnableProps(this.props);
  }

  removeAt(index: number): void {
    removeBurnablePropAt(this.props, index);
  }
}
