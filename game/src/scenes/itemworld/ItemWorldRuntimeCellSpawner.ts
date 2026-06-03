import type { Container } from 'pixi.js';
import type { LdtkLevel } from '@level/LdtkLoader';
import { applyBurnableZones } from '@level/BurnableZonePass';
import { BurnableProp } from '@entities/BurnableProp';
import { ThrowableContainer, parseContainerKind } from '@entities/ThrowableContainer';
import { resolveContainerSlotKind } from '@data/ContainerPools';
import { readSpawnerEntity, runContainerSpawner } from '@systems/ContainerSpawner';
import { readFluidSpawnerEntities, type FluidSpawnerManager } from '@systems/FluidSpawner';
import type { TileMutator } from '@systems/TileMutator';

interface RuntimeCellRecord {
  ldtkLevel: LdtkLevel;
  roomX: number;
  roomY: number;
}

interface ItemWorldRuntimeCellSpawnerDeps {
  getCellRecord: (key: string) => RuntimeCellRecord | undefined;
  getFullGrid: () => number[][];
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
    this.settleContainersFrom(beforeContainers);
  }

  private spawnPlacedContainers(level: LdtkLevel, offGx: number, offGy: number): void {
    const containers = this.deps.getContainers();
    const entityLayer = this.deps.getEntityLayer();
    for (const ent of level.entities) {
      if (ent.type !== 'Container') continue;

      const kind = this.resolveContainerKind(ent.fields?.['Kind']);
      if (!kind) continue;

      const fvRaw = ent.fields?.['FluidVolume'];
      const fluidVolume = typeof fvRaw === 'number' && fvRaw >= 0 ? Math.floor(fvRaw) : undefined;
      const container = new ThrowableContainer(
        kind,
        (ent.grid[0] + offGx) * TILE_SIZE,
        (ent.grid[1] + offGy) * TILE_SIZE,
        fluidVolume,
      );
      containers.push(container);
      entityLayer.addChild(container.container);
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
    const occupied = this.collectContainerOccupiedCells(containers);

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
        collisionGrid: this.deps.getFullGrid(),
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
        containers.push(container);
        this.deps.getEntityLayer().addChild(container.container);
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
    const specs = applyBurnableZones(this.deps.getFullGrid(), level.entities, TILE_SIZE, roomX, roomY);
    for (const spec of specs) {
      const prop = new BurnableProp(spec.id, spec.gx, spec.gy);
      this.deps.getBurnableProps().push(prop);
      this.deps.getTileMutator().registerBurnable(prop);
      this.deps.getEntityLayer().addChild(prop.container);
    }
  }

  private settleContainersFrom(startIndex: number): void {
    const containers = this.deps.getContainers();
    if (startIndex >= containers.length) return;

    const sorted = containers.slice(startIndex).sort((a, b) => b.y - a.y);
    for (const container of sorted) {
      if (container.skipSettle) continue;
      container.settleAtSpawn(
        (gx, gy) => this.isContainerSolidCellFor(container, gx, gy),
        containers,
        1024,
        (gx, gy) => this.isContainerFluidCell(gx, gy),
      );
    }
  }

  private resolveContainerKind(rawKind: unknown): ThrowableContainer['kind'] | null {
    const direct = parseContainerKind(rawKind);
    if (direct) return direct;

    const slot = typeof rawKind === 'string' ? rawKind.toLowerCase() : '';
    if (slot === 'generic_a' || slot === 'generic_b' || slot === 'generic_c') {
      return resolveContainerSlotKind(slot, this.deps.getTemperament());
    }
    return null;
  }

  private collectContainerOccupiedCells(containers: readonly ThrowableContainer[]): Set<string> {
    const occupied = new Set<string>();
    for (const container of containers) {
      const gx0 = Math.floor(container.x / TILE_SIZE);
      const gx1 = Math.floor((container.x + container.spec.width - 1) / TILE_SIZE);
      const gy0 = Math.floor(container.y / TILE_SIZE);
      const gy1 = Math.floor((container.y + container.spec.height - 1) / TILE_SIZE);
      for (let gy = gy0; gy <= gy1; gy++) {
        for (let gx = gx0; gx <= gx1; gx++) occupied.add(`${gx},${gy}`);
      }
    }
    return occupied;
  }

  private isContainerSolidCellFor(container: ThrowableContainer, gx: number, gy: number): boolean {
    const tile = this.deps.getFullGrid()[gy]?.[gx] ?? 0;
    if (tile === 1 || tile === 3 || tile === 7 || tile === 9 || tile === 12 || tile === 15) return true;
    return container.isWoodFamily() && this.isContainerFluidCell(gx, gy);
  }

  private isContainerFluidCell(gx: number, gy: number): boolean {
    const tile = this.deps.getFullGrid()[gy]?.[gx] ?? 0;
    return tile === 2 || tile === 6 || tile === 8 || tile === 11 || tile === 13 || tile === 20;
  }
}
