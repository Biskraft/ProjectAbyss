import type { Container } from 'pixi.js';
import type { CrackedFloor } from '@entities/CrackedFloor';
import {
  addEntityToLayer,
  destroyAndClearEntities,
  removeEntityAt,
} from '@scenes/shared/EntityLifecycleHelpers';

export class WorldCrackedFloorRegistry {
  readonly floors: CrackedFloor[] = [];

  add(floor: CrackedFloor, entityLayer?: Container): void {
    addEntityToLayer(this.floors, floor, entityLayer, { onlyAttachIfUnparented: true });
  }

  clear(): void {
    destroyAndClearEntities(this.floors);
  }

  removeAt(index: number): void {
    removeEntityAt(this.floors, index);
  }
}
