import type { Container } from 'pixi.js';
import type { Building } from '@entities/Building';
import {
  addEntityToLayer,
  destroyAndClearEntities,
} from '@scenes/shared/EntityLifecycleHelpers';

export class WorldBuildingRegistry {
  readonly buildings: Building[] = [];

  add(building: Building, entityLayer?: Container): void {
    addEntityToLayer(this.buildings, building, entityLayer, { onlyAttachIfUnparented: true });
  }

  clear(): void {
    destroyAndClearEntities(this.buildings);
  }
}
