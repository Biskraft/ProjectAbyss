import { Graphics, type Container as PixiContainer } from 'pixi.js';
import { Debug } from '@core/Debug';
import type { LdtkLevel } from '@level/LdtkLoader';
import { ThrowableContainer, parseContainerKind, type ContainerKind } from '@entities/ThrowableContainer';
import { readSpawnerEntity, runContainerSpawner } from '@systems/ContainerSpawner';
import { resolveContainerSlotKind } from '@data/ContainerPools';
import type { WorldContainerRegistry } from './WorldContainerRegistry';
import type { WorldMaintainedContainerSpawnerRuntime } from './WorldMaintainedContainerSpawnerRuntime';

interface WorldContainerSpawnRuntimeDeps {
  registry: WorldContainerRegistry;
  maintainedSpawnerRuntime: WorldMaintainedContainerSpawnerRuntime;
  getCollisionGrid: () => number[][];
  getEntityLayer: () => PixiContainer;
  isDebugMode: () => boolean;
}

const SOLID_TILE_VALUES = new Set<number>([1, 3, 7, 9, 12, 15]);
const FLUID_TILE_VALUES = new Set<number>([2, 6, 8, 11, 13, 20]);

export class WorldContainerSpawnRuntime {
  constructor(private readonly deps: WorldContainerSpawnRuntimeDeps) {}

  spawnForLevel(level: LdtkLevel): void {
    const containerEnts = level.entities.filter((entity) => entity.type === 'Container');
    let explicitSpawned = 0;
    const spawnLog: string[] = [];

    for (const entity of containerEnts) {
      const fields = entity.fields ?? {};
      const kind = this.resolveExplicitContainerKind(fields['Kind']);
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
    const occupiedCells = this.buildOccupiedCells();
    let spawnerSpawned = 0;

    this.deps.maintainedSpawnerRuntime.clear();
    for (const spawnerEntity of spawnerEnts) {
      const opts = readSpawnerEntity(spawnerEntity);
      if (this.deps.isDebugMode()) this.addDebugSpawnerRect(opts.rect);

      const spawned = runContainerSpawner({
        rect: opts.rect,
        collisionGrid: this.deps.getCollisionGrid(),
        existing: this.deps.registry.containers,
        occupiedCells,
        pool: opts.pool,
        minCount: opts.minCount,
        maxCount: opts.maxCount,
        bias: opts.bias,
        seed: opts.seed >= 0 ? opts.seed : this.stableLevelSeed(level.identifier),
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

    this.settleSpawnedContainers();
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

  private resolveExplicitContainerKind(rawKind: unknown): ConstructorParameters<typeof ThrowableContainer>[0] | null {
    const parsed = parseContainerKind(rawKind);
    if (parsed) return parsed;

    const slot = typeof rawKind === 'string' ? rawKind.toLowerCase() : '';
    if (slot === 'generic_a' || slot === 'generic_b' || slot === 'generic_c') {
      return resolveContainerSlotKind(slot, null);
    }
    return null;
  }

  private buildOccupiedCells(): Set<string> {
    const occupiedCells = new Set<string>();
    for (const container of this.deps.registry.containers) {
      const gx0 = Math.floor(container.x / 16);
      const gx1 = Math.floor((container.x + container.spec.width - 1) / 16);
      const gy0 = Math.floor(container.y / 16);
      const gy1 = Math.floor((container.y + container.spec.height - 1) / 16);
      for (let gy = gy0; gy <= gy1; gy++) {
        for (let gx = gx0; gx <= gx1; gx++) occupiedCells.add(`${gx},${gy}`);
      }
    }
    return occupiedCells;
  }

  private addDebugSpawnerRect(rect: { x: number; y: number; w: number; h: number }): void {
    const debugRect = new Graphics();
    debugRect.rect(rect.x, rect.y, rect.w, rect.h)
      .stroke({ color: 0xff44ff, width: 1, alpha: 0.8 });
    this.deps.getEntityLayer().addChild(debugRect);
  }

  private stableLevelSeed(levelId: string): number {
    return levelId.split('').reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) | 0, 0);
  }

  private settleSpawnedContainers(): void {
    const sorted = [...this.deps.registry.containers].sort((a, b) => b.y - a.y);
    for (const container of sorted) {
      if (container.skipSettle) continue;
      container.settleAtSpawn(
        this.isContainerSolidCellFor(container),
        this.deps.registry.containers,
        1024,
        (gx, gy) => this.isFluidCell(gx, gy),
      );
    }
  }

  private isContainerSolidCellFor(container: ThrowableContainer): (gx: number, gy: number) => boolean {
    return (gx, gy) => {
      const tile = this.deps.getCollisionGrid()[gy]?.[gx] ?? 0;
      if (SOLID_TILE_VALUES.has(tile)) return true;
      return container.isWoodFamily() && FLUID_TILE_VALUES.has(tile);
    };
  }

  private isFluidCell(gx: number, gy: number): boolean {
    const tile = this.deps.getCollisionGrid()[gy]?.[gx] ?? 0;
    return FLUID_TILE_VALUES.has(tile);
  }
}
