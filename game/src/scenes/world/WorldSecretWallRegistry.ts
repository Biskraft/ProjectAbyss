import type { Container } from 'pixi.js';
import type { SecretWall } from '@entities/SecretWall';

export class WorldSecretWallRegistry {
  readonly walls: SecretWall[] = [];

  add(wall: SecretWall, wallLayer?: Container): void {
    this.walls.push(wall);
    if (wallLayer && !wall.container.parent) wallLayer.addChild(wall.container);
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
