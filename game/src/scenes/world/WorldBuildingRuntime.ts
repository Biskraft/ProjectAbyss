import type { Container } from 'pixi.js';
import { Building } from '@entities/Building';
import type { LdtkLevel } from '@level/LdtkLoader';
import type { WorldBuildingRegistry } from './WorldBuildingRegistry';

interface WorldBuildingRuntimeDeps {
  getEntityLayer: () => Container;
  getRegistry: () => WorldBuildingRegistry;
}

export class WorldBuildingRuntime {
  constructor(private readonly deps: WorldBuildingRuntimeDeps) {}

  spawn(level: LdtkLevel): void {
    const registry = this.deps.getRegistry();
    registry.clear();

    const entities = level.entities.filter(entity => entity.type === 'Building');
    for (const entity of entities) {
      if (!entity.tile?.tilesetPath) {
        console.warn(
          `[Building] entity at (${entity.px[0]}, ${entity.px[1]}) has no tile; skipped.`,
        );
        continue;
      }

      const building = new Building(
        entity.px[0],
        entity.px[1],
        entity.tile.tilesetPath,
        entity.tile.src[0],
        entity.tile.src[1],
        entity.tile.w,
        entity.tile.h,
      );
      registry.add(building, this.deps.getEntityLayer());
    }
  }
}
