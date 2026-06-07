import type { Container } from 'pixi.js';
import type { FallingHazard } from '@entities/FallingHazard';
import {
  addEntityToLayer,
  destroyAndClearEntities,
  removeEntityAt,
} from '@scenes/shared/EntityLifecycleHelpers';

export class WorldFallingHazardRegistry {
  readonly hazards: FallingHazard[] = [];

  add(hazard: FallingHazard, entityLayer?: Container): void {
    addEntityToLayer(this.hazards, hazard, entityLayer, { onlyAttachIfUnparented: true });
  }

  clear(): void {
    destroyAndClearEntities(this.hazards);
  }

  removeAt(index: number): void {
    removeEntityAt(this.hazards, index);
  }
}
