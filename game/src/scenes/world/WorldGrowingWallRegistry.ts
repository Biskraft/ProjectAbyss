import type { Container } from 'pixi.js';
import type { GrowingWall } from '@entities/GrowingWall';
import {
  addEntityToLayer,
  destroyAndClearEntities,
  removeEntityAt,
} from '@scenes/shared/EntityLifecycleHelpers';

export class WorldGrowingWallRegistry {
  readonly walls: GrowingWall[] = [];

  add(wall: GrowingWall, entityLayer?: Container): void {
    addEntityToLayer(this.walls, wall, entityLayer, { onlyAttachIfUnparented: true });
  }

  clear(): void {
    destroyAndClearEntities(this.walls);
  }

  removeAt(index: number): void {
    removeEntityAt(this.walls, index);
  }
}
