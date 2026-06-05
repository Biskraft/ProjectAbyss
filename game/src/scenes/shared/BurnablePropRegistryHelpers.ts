import type { Container } from 'pixi.js';
import type { BurnableProp } from '@entities/BurnableProp';
import {
  addEntityToLayer,
  destroyAndClearEntities,
  removeEntityAt,
} from './EntityLifecycleHelpers';

export function addBurnablePropToRegistry(
  props: BurnableProp[],
  prop: BurnableProp,
  entityLayer?: Container,
): void {
  addEntityToLayer(props, prop, entityLayer, { onlyAttachIfUnparented: true });
}

export function clearBurnableProps(props: BurnableProp[]): void {
  destroyAndClearEntities(props);
}

export function removeBurnablePropAt(props: BurnableProp[], index: number): void {
  removeEntityAt(props, index);
}
