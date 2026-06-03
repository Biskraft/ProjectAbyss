import type { Container } from 'pixi.js';
import type { CrackedFloor } from '@entities/CrackedFloor';

export class WorldCrackedFloorRegistry {
  readonly floors: CrackedFloor[] = [];

  add(floor: CrackedFloor, entityLayer?: Container): void {
    this.floors.push(floor);
    if (entityLayer && !floor.container.parent) entityLayer.addChild(floor.container);
  }

  clear(): void {
    for (const floor of this.floors) floor.destroy();
    this.floors.length = 0;
  }

  removeAt(index: number): void {
    const floor = this.floors[index];
    floor.destroy();
    this.floors.splice(index, 1);
  }
}
