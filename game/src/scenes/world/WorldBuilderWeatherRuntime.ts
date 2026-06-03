import { isOneWay, isSolid } from '@core/Physics';
import type { GiantBuilder } from '@entities/GiantBuilder';
import type { WeatherDynamicCollider } from '@effects/WeatherSystem';

const TILE_SIZE = 16;

export class WorldBuilderWeatherRuntime {
  private collider: WeatherDynamicCollider | null = null;

  getDynamicColliders(builder: GiantBuilder | null): WeatherDynamicCollider[] {
    if (!builder) return [];

    if (!this.collider) {
      this.collider = {
        id: 'active-builder',
        grid: builder.collisionGrid,
        tileSize: TILE_SIZE,
        originX: builder.container.x,
        originY: builder.container.y,
        isSolid: (tile) => isSolid(tile) || isOneWay(tile),
      };
    }

    this.collider.grid = builder.collisionGrid;
    this.collider.originX = builder.container.x;
    this.collider.originY = builder.container.y;
    return [this.collider];
  }

  clear(): void {
    this.collider = null;
  }
}
