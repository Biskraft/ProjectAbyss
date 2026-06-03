import type { Container } from 'pixi.js';
import type { GrowingWall } from '@entities/GrowingWall';

export class WorldGrowingWallRegistry {
  readonly walls: GrowingWall[] = [];

  add(wall: GrowingWall, entityLayer?: Container): void {
    this.walls.push(wall);
    if (entityLayer && !wall.container.parent) entityLayer.addChild(wall.container);
  }

  clear(): void {
    for (const wall of this.walls) wall.destroy();
    this.walls.length = 0;
  }

  removeAt(index: number): void {
    const wall = this.walls[index];
    wall.destroy();
    this.walls.splice(index, 1);
  }
}
