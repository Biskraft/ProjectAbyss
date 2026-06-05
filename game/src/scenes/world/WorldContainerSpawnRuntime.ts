import { Graphics, type Container as PixiContainer } from 'pixi.js';
import { Debug } from '@core/Debug';
import type { LdtkLevel } from '@level/LdtkLoader';
import { ThrowableContainer, type ContainerKind } from '@entities/ThrowableContainer';
import { readSpawnerEntity, runContainerSpawner } from '@systems/ContainerSpawner';
import {
  buildContainerOccupiedCells,
  settleContainersAtSpawnFromIndex,
} from '@scenes/shared/ContainerSpawnSettleHelpers';
import { resolveRuntimeContainerKind } from '@scenes/shared/ContainerKindHelpers';
import type { WorldContainerRegistry } from './WorldContainerRegistry';
import type { WorldMaintainedContainerSpawnerRuntime } from './WorldMaintainedContainerSpawnerRuntime';

interface WorldContainerSpawnRuntimeDeps {
  registry: WorldContainerRegistry;
  maintainedSpawnerRuntime: WorldMaintainedContainerSpawnerRuntime;
  getCollisionGrid: () => number[][];
  getEntityLayer: () => PixiContainer;
  isDebugMode: () => boolean;
}

export class WorldContainerSpawnRuntime {
  constructor(private readonly deps: WorldContainerSpawnRuntimeDeps) {}

  spawnForLevel(level: LdtkLevel): void {
    const containerEnts = level.entities.filter((entity) => entity.type === 'Container');
    let explicitSpawned = 0;
    const spawnLog: string[] = [];

    for (const entity of containerEnts) {
      const fields = entity.fields ?? {};
      const kind = resolveRuntimeContainerKind(fields['Kind'], null);
      if (!kind) {
        // eslint-disable-next-line no-console
        console.warn(`[Container] level="${level.identifier}" Kind="${String(fields['Kind'])}" at (${entity.px[0]}, ${entity.px[1]}) is invalid, skipped. Valid values: Crate / MetalCrate / OilDrum / WaterBarrel / MagmaCrucible / AcidVial / Generic_A / Generic_B / Generic_C`);
        continue;
      }

      const fluidVolumeRaw = fields['FluidVolume'];
      const fluidVolume = typeof fluidVolumeRaw === 'number' && fluidVolumeRaw >= 0
        ? Math.floor(fluidVolumeRaw)
        : undefined;
      const x = entity.grid[0] * 16;
      const y = entity.grid[1] * 16;
      const container = new ThrowableContainer(kind, x, y, fluidVolume);
      this.deps.registry.add(container, this.deps.getEntityLayer());
      spawnLog.push(`  ${kind}@(${x},${y}) px=(${entity.px[0]},${entity.px[1]}) grid=(${entity.grid[0]},${entity.grid[1]}) vol=${container.fluidVolume}`);
      explicitSpawned++;
    }

    const spawnerEnts = level.entities.filter((entity) => entity.type === 'ContainerSpawner');
    const containers = this.deps.registry.getContainers();
    const occupiedCells = buildContainerOccupiedCells(containers);
    let spawnerSpawned = 0;

    this.deps.maintainedSpawnerRuntime.clear();
    for (const spawnerEntity of spawnerEnts) {
      const opts = readSpawnerEntity(spawnerEntity);
      if (this.deps.isDebugMode()) this.addDebugSpawnerRect(opts.rect);

      const spawned = runContainerSpawner({
        rect: opts.rect,
        collisionGrid: this.deps.getCollisionGrid(),
        existing: containers,
        occupiedCells,
        pool: opts.pool,
        minCount: opts.minCount,
        maxCount: opts.maxCount,
        bias: opts.bias,
        seed: opts.seed >= 0 ? opts.seed : level.identifier.split('').reduce(
          (hash, char) => (hash * 31 + char.charCodeAt(0)) | 0,
          0,
        ),
        avoidEntity: opts.avoidEntity,
        fluidVolumeOverride: opts.fluidVolumeOverride,
      });

      for (const container of spawned) {
        this.deps.registry.add(container, this.deps.getEntityLayer());
        occupiedCells.add(`${Math.floor(container.x / 16)},${Math.floor(container.y / 16)}`);
        spawnerSpawned++;
      }
      this.deps.maintainedSpawnerRuntime.register(opts, spawned);
    }

    settleContainersAtSpawnFromIndex(containers, 0, this.deps.getCollisionGrid());
    Debug.log(`[Container] level="${level.identifier}" explicit=${explicitSpawned}/${containerEnts.length} spawner=${spawnerSpawned} (from ${spawnerEnts.length} spawners)\n${spawnLog.join('\n')}`);
  }

  debugSpawnNear(playerX: number, playerY: number): void {
    const baseX = Math.floor(playerX / 16) * 16 + 32;
    const baseY = Math.floor(playerY / 16) * 16;
    const kinds: ContainerKind[] = ['OilDrum', 'WaterBarrel', 'MagmaCrucible', 'AcidVial'];
    for (let i = 0; i < kinds.length; i++) {
      const container = new ThrowableContainer(kinds[i], baseX + i * 20, baseY);
      this.deps.registry.add(container, this.deps.getEntityLayer());
    }
  }

  private addDebugSpawnerRect(rect: { x: number; y: number; w: number; h: number }): void {
    const debugRect = new Graphics();
    debugRect.rect(rect.x, rect.y, rect.w, rect.h)
      .stroke({ color: 0xff44ff, width: 1, alpha: 0.8 });
    this.deps.getEntityLayer().addChild(debugRect);
  }

}
