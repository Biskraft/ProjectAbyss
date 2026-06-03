import type { Container } from 'pixi.js';
import type { Player } from '@entities/Player';
import { CollapsingPlatform } from '@entities/CollapsingPlatform';
import type { LdtkLevel } from '@level/LdtkLoader';
import type { WorldCollapsingPlatformRegistry } from './WorldCollapsingPlatformRegistry';

interface WorldCollapsingPlatformRuntimeDeps {
  getPlayer: () => Player;
  getCollisionGrid: () => number[][];
  getEntityLayer: () => Container;
  getRegistry: () => WorldCollapsingPlatformRegistry;
  getUnlockedEvents: () => Set<string>;
  refreshBuilderGrid: (grid: number[][]) => void;
}

export class WorldCollapsingPlatformRuntime {
  constructor(private readonly deps: WorldCollapsingPlatformRuntimeDeps) {}

  spawn(level: LdtkLevel): void {
    const registry = this.deps.getRegistry();
    registry.clear();

    const entities = level.entities.filter(entity => entity.type === 'CollapsingPlatform');
    for (const entity of entities) {
      const respawns = (entity.fields['Respawn'] ?? entity.fields['respawn'] ?? true) as boolean;
      const respawnTime = (entity.fields['RespawnTime'] ?? entity.fields['respawnTime'] ?? 3.0) as number;
      const key = `cplat_${level.identifier}_${entity.px[0]}_${entity.px[1]}`;

      if (!respawns && this.deps.getUnlockedEvents().has(key)) continue;

      const platform = new CollapsingPlatform(
        entity.px[0],
        entity.px[1],
        entity.width,
        entity.height,
        respawns,
        respawnTime,
      );
      const grid = this.deps.getCollisionGrid();
      platform.injectCollision(grid);
      registry.add(platform, grid, this.deps.getEntityLayer(), { key, respawns });
    }
  }

  update(dt: number): void {
    const player = this.deps.getPlayer();
    const registry = this.deps.getRegistry();
    const platforms = registry.platforms;

    for (let i = platforms.length - 1; i >= 0; i--) {
      const platform = platforms[i];
      const beforeState = platform.getState();
      const wasCollidable = beforeState !== 'collapsed' && beforeState !== 'respawning';

      platform.update(dt);

      const afterState = platform.getState();
      if (beforeState !== afterState) {
        const grid = registry.getCollisionGrid(platform, this.deps.getCollisionGrid());
        this.deps.refreshBuilderGrid(grid);
      }

      if (platform.isPlayerOnTop(player.x, player.y, player.width, player.height)) {
        platform.startShake();
      }

      if (!wasCollidable || afterState !== 'collapsed') continue;

      const meta = registry.getMeta(platform);
      if (meta.respawns) continue;
      if (meta.key) this.deps.getUnlockedEvents().add(meta.key);
      registry.removeAt(i);
    }
  }
}
