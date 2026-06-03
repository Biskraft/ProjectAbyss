import type { Container } from 'pixi.js';
import type { CollapsingPlatform } from '@entities/CollapsingPlatform';

export interface WorldCollapsingPlatformMeta {
  key?: string;
  respawns: boolean;
}

export class WorldCollapsingPlatformRegistry {
  readonly platforms: CollapsingPlatform[] = [];
  private readonly collisionGrids = new WeakMap<CollapsingPlatform, number[][]>();
  private readonly metadata = new WeakMap<CollapsingPlatform, WorldCollapsingPlatformMeta>();

  add(
    platform: CollapsingPlatform,
    collisionGrid: number[][],
    entityLayer?: Container,
    meta: WorldCollapsingPlatformMeta = { respawns: platform.respawns },
  ): void {
    this.platforms.push(platform);
    this.collisionGrids.set(platform, collisionGrid);
    this.metadata.set(platform, meta);
    if (entityLayer && !platform.container.parent) entityLayer.addChild(platform.container);
  }

  clear(): void {
    for (const platform of this.platforms) platform.destroy();
    this.platforms.length = 0;
  }

  getCollisionGrid(platform: CollapsingPlatform, fallback: number[][]): number[][] {
    return this.collisionGrids.get(platform) ?? fallback;
  }

  getMeta(platform: CollapsingPlatform): WorldCollapsingPlatformMeta {
    return this.metadata.get(platform) ?? { respawns: platform.respawns };
  }

  includes(platform: CollapsingPlatform): boolean {
    return this.platforms.includes(platform);
  }

  removeAt(index: number): void {
    const platform = this.platforms[index];
    platform.destroy();
    this.platforms.splice(index, 1);
  }
}
