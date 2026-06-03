import type { Container } from 'pixi.js';
import type { Building } from '@entities/Building';

export class WorldBuildingRegistry {
  readonly buildings: Building[] = [];

  add(building: Building, entityLayer?: Container): void {
    this.buildings.push(building);
    if (entityLayer && !building.container.parent) entityLayer.addChild(building.container);
  }

  clear(): void {
    for (const building of this.buildings) building.destroy();
    this.buildings.length = 0;
  }
}
