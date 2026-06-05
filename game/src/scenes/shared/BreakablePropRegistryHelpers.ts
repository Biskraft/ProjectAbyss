import type { Container } from 'pixi.js';
import type { BreakableProp } from '@entities/BreakableProp';
import {
  addEntityToLayer,
  destroyAndClearEntities,
  removeEntityAt,
  updateEntities,
} from './EntityLifecycleHelpers';

export function addBreakablePropToRegistry(
  props: BreakableProp[],
  prop: BreakableProp,
  entityLayer?: Container,
): void {
  addEntityToLayer(props, prop, entityLayer, { onlyAttachIfUnparented: true });
}

export function clearBreakableProps(props: BreakableProp[]): void {
  destroyAndClearEntities(props);
}

export function removeBreakablePropAt(props: BreakableProp[], index: number): void {
  removeEntityAt(props, index);
}

export function updateBreakableProps(props: readonly BreakableProp[], dtMs: number): void {
  updateEntities(props, dtMs);
}
