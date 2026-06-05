import type { Container } from 'pixi.js';
import type { SecretWall } from '@entities/SecretWall';
import {
  addEntityToLayer,
  destroyAndClearEntities,
  removeEntityAt,
} from '@scenes/shared/EntityLifecycleHelpers';

export class WorldSecretWallRegistry {
  readonly walls: SecretWall[] = [];

  add(wall: SecretWall, wallLayer?: Container): void {
    addEntityToLayer(this.walls, wall, wallLayer, { onlyAttachIfUnparented: true });
  }

  clear(): void {
    destroyAndClearEntities(this.walls);
  }

  removeAt(index: number): void {
    removeEntityAt(this.walls, index);
  }
}
