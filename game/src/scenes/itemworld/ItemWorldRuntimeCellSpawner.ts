import type { Container } from 'pixi.js';
import type { LdtkLevel } from '@level/LdtkLoader';
import { applyBurnableZones } from '@level/BurnableZonePass';
import { BurnableProp } from '@entities/BurnableProp';
import { ThrowableContainer } from '@entities/ThrowableContainer';
import { readSpawnerEntity, runContainerSpawner } from '@systems/ContainerSpawner';
import { readFluidSpawnerEntities, type FluidSpawnerManager } from '@systems/FluidSpawner';
import {
  buildContainerOccupiedCells,
  settleContainersAtSpawnFromIndex,
} from '@scenes/shared/ContainerSpawnSettleHelpers';
import { resolveRuntimeContainerKind } from '@scenes/shared/ContainerKindHelpers';
import type { TileMutator } from '@systems/TileMutator';
import { addEntityToLayer } from '@scenes/shared/EntityLifecycleHelpers';

interface RuntimeCellRecord {
  ldtkLevel: LdtkLevel;
  roomX: number;
  roomY: number;
}

interface ItemWorldRuntimeCellSpawnerDeps {
  getCellRecord: (key: string) => RuntimeCellRecord | undefined;
  getCollisionGrid: () => number[][];
  getContainers: () => ThrowableContainer[];
  getBurnableProps: () => BurnableProp[];
  getFluidSpawners: () => FluidSpawnerManager;
  getTileMutator: () => TileMutator;
  getEntityLayer: () => Container;
  getTemperament: () => string | undefined;
  getItemUid: () => number;
  spawnStaticEntitiesForRoom: (level: LdtkLevel, roomX: number, roomY: number) => void;
}

const TILE_SIZE = 16;

export class ItemWorldRuntimeCellSpawner {
  private readonly spawnedCells = new Set<string>();

  constructor(private readonly deps: ItemWorldRuntimeCellSpawnerDeps) {}

  clearSpawnedCells(): void {
    this.spawnedCells.clear();
  }

  spawnForCell(col: number, absRow: number): void {
    const key = `${col}:${absRow}`;
    if (this.spawnedCells.has(key)) return;

    const rec = this.deps.getCellRecord(key);
    if (!rec) return;
    this.spawnedCells.add(key);

    const { ldtkLevel, roomX, roomY } = rec;
    const offGx = roomX / TILE_SIZE;
    const offGy = roomY / TILE_SIZE;
    const beforeContainers = this.deps.getContainers().length;

    this.spawnPlacedContainers(ldtkLevel, offGx, offGy);
    this.runContainerSpawners(ldtkLevel, col, absRow, roomX, roomY);
    this.spawnFluidSpawners(ldtkLevel, offGx, offGy);
    this.spawnBurnableProps(ldtkLevel, roomX, roomY);
    this.deps.spawnStaticEntitiesForRoom(ldtkLevel, roomX, roomY);
    settleContainersAtSpawnFromIndex(this.deps.getContainers(), beforeContainers, this.deps.getCollisionGrid());
  }

  private spawnPlacedContainers(level: LdtkLevel, offGx: number, offGy: number): void {
    const containers = this.deps.getContainers();
    const entityLayer = this.deps.getEntityLayer();
    for (const ent of level.entities) {
      if (ent.type !== 'Container') continue;

      const kind = resolveRuntimeContainerKind(ent.fields?.['Kind'], this.deps.getTemperament());
      if (!kind) continue;

      const fvRaw = ent.fields?.['FluidVolume'];
      const fluidVolume = typeof fvRaw === 'number' && fvRaw >= 0 ? Math.floor(fvRaw) : undefined;
      const container = new ThrowableContainer(
        kind,
        (ent.grid[0] + offGx) * TILE_SIZE,
        (ent.grid[1] + offGy) * TILE_SIZE,
        fluidVolume,
      );
      addEntityToLayer(containers, container, entityLayer);
    }
  }

  private runContainerSpawners(
    level: LdtkLevel,
    col: number,
    absRow: number,
    roomX: number,
    roomY: number,
  ): void {
    const containers = this.deps.getContainers();
    const occupied = buildContainerOccupiedCells(containers);

    for (const ent of level.entities) {
      if (ent.type !== 'ContainerSpawner') continue;

      const opts = readSpawnerEntity(ent, this.deps.getTemperament());
      const autoSeed = opts.seed >= 0
        ? opts.seed
        : (((this.deps.getItemUid() | 0) * 73856093) ^ (col * 19349663) ^ (absRow * 83492791)) | 0;
      const spawned = runContainerSpawner({
        rect: {
          x: opts.rect.x + roomX,
          y: opts.rect.y + roomY,
          w: opts.rect.w,
          h: opts.rect.h,
        },
        collisionGrid: this.deps.getCollisionGrid(),
        existing: containers,
        occupiedCells: occupied,
        pool: opts.pool,
        minCount: opts.minCount,
        maxCount: opts.maxCount,
        bias: opts.bias,
        seed: autoSeed,
        avoidEntity: opts.avoidEntity,
        fluidVolumeOverride: opts.fluidVolumeOverride,
      });

      for (const container of spawned) {
        addEntityToLayer(containers, container, this.deps.getEntityLayer());
        occupied.add(`${Math.floor(container.x / TILE_SIZE)},${Math.floor(container.y / TILE_SIZE)}`);
      }
    }
  }

  private spawnFluidSpawners(level: LdtkLevel, offGx: number, offGy: number): void {
    for (const ent of level.entities) {
      if (ent.type !== 'FluidSpawner') continue;
      for (const opt of readFluidSpawnerEntities(ent, this.deps.getTemperament())) {
        this.deps.getFluidSpawners().add({
          gx: opt.gx + offGx,
          gy: opt.gy + offGy,
          type: opt.type,
          intervalMs: opt.intervalMs,
        });
      }
    }
  }

  private spawnBurnableProps(level: LdtkLevel, roomX: number, roomY: number): void {
    const specs = applyBurnableZones(this.deps.getCollisionGrid(), level.entities, TILE_SIZE, roomX, roomY);
    for (const spec of specs) {
      const prop = new BurnableProp(spec.id, spec.gx, spec.gy);
      addEntityToLayer(this.deps.getBurnableProps(), prop, this.deps.getEntityLayer());
      this.deps.getTileMutator().registerBurnable(prop);
    }
  }

}
