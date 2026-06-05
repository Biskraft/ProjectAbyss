import type { Container } from 'pixi.js';
import type { CollapsingPlatform } from '@entities/CollapsingPlatform';
import {
  addEntityToLayer,
  destroyAndClearEntities,
  removeEntityAt,
} from '@scenes/shared/EntityLifecycleHelpers';

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
    addEntityToLayer(this.platforms, platform, entityLayer, { onlyAttachIfUnparented: true });
    this.collisionGrids.set(platform, collisionGrid);
    this.metadata.set(platform, meta);
  }

  clear(): void {
    destroyAndClearEntities(this.platforms);
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
    removeEntityAt(this.platforms, index);
  }
}
