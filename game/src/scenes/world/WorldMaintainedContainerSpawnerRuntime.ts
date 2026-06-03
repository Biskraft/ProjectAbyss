import type { Container } from 'pixi.js';
import type { ThrowableContainer } from '@entities/ThrowableContainer';
import { runContainerSpawner, type SpawnerEntityData } from '@systems/ContainerSpawner';

interface MaintainedContainerSpawner {
  rect: SpawnerEntityData['rect'];
  pool: SpawnerEntityData['pool'];
  minCount: number;
  maxCount: number;
  bias: SpawnerEntityData['bias'];
  seed: number;
  avoidEntity: boolean;
  fluidVolumeOverride: number;
  checkAccum: number;
  owned: ThrowableContainer[];
}

interface WorldMaintainedContainerSpawnerRuntimeDeps {
  getCollisionGrid: () => number[][];
  getContainers: () => ThrowableContainer[];
  getEntityLayer: () => Container;
}

const MAINTAIN_CHECK_MS = 500;
const SOLID_TILE_VALUES = new Set<number>([1, 3, 7, 9, 12, 15]);
const FLUID_TILE_VALUES = new Set<number>([2, 6, 8, 11, 13, 20]);

export class WorldMaintainedContainerSpawnerRuntime {
  private spawners: MaintainedContainerSpawner[] = [];

  constructor(private readonly deps: WorldMaintainedContainerSpawnerRuntimeDeps) {}

  clear(): void {
    this.spawners.length = 0;
  }

  register(opts: SpawnerEntityData, spawned: ThrowableContainer[]): void {
    if (!opts.maintain || opts.pool.length === 0) return;
    this.spawners.push({
      rect: opts.rect,
      pool: opts.pool,
      minCount: opts.minCount,
      maxCount: opts.maxCount,
      bias: opts.bias,
      seed: opts.seed,
      avoidEntity: opts.avoidEntity,
      fluidVolumeOverride: opts.fluidVolumeOverride,
      checkAccum: 0,
      owned: [...spawned],
    });
  }

  update(dtMs: number): void {
    if (this.spawners.length === 0) return;

    for (const spawner of this.spawners) {
      spawner.checkAccum += dtMs;
      if (spawner.checkAccum < MAINTAIN_CHECK_MS) continue;
      spawner.checkAccum = 0;

      this.pruneDestroyedOwnedContainers(spawner);
      if (spawner.owned.length > 0) continue;

      const containers = this.deps.getContainers();
      const refilled = runContainerSpawner({
        rect: spawner.rect,
        collisionGrid: this.deps.getCollisionGrid(),
        existing: containers,
        occupiedCells: this.buildOccupiedCells(containers),
        pool: spawner.pool,
        minCount: spawner.minCount,
        maxCount: spawner.maxCount,
        bias: spawner.bias,
        seed: this.resolveRefillSeed(spawner.seed),
        avoidEntity: spawner.avoidEntity,
        fluidVolumeOverride: spawner.fluidVolumeOverride,
      });
      if (refilled.length === 0) continue;

      for (const container of refilled) {
        containers.push(container);
        this.deps.getEntityLayer().addChild(container.container);
        this.settleRefilledContainer(container, containers);
        spawner.owned.push(container);
      }
    }
  }

  private pruneDestroyedOwnedContainers(spawner: MaintainedContainerSpawner): void {
    for (let i = spawner.owned.length - 1; i >= 0; i--) {
      if (spawner.owned[i].destroyed) spawner.owned.splice(i, 1);
    }
  }

  private buildOccupiedCells(containers: ThrowableContainer[]): Set<string> {
    const occupiedCells = new Set<string>();
    for (const container of containers) {
      if (container.destroyed) continue;
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

  private resolveRefillSeed(seed: number): number {
    const now = (performance.now() | 0) >>> 0;
    return seed >= 0 ? (seed ^ now) : now;
  }

  private settleRefilledContainer(container: ThrowableContainer, containers: ThrowableContainer[]): void {
    if (container.skipSettle) return;
    container.settleAtSpawn(
      this.isContainerSolidCellFor(container),
      containers,
      1024,
      (gx, gy) => this.isContainerFluidCell(gx, gy),
    );
  }

  private isContainerSolidCellFor(container: ThrowableContainer): (gx: number, gy: number) => boolean {
    return (gx, gy) => {
      const tile = this.deps.getCollisionGrid()[gy]?.[gx] ?? 0;
      if (SOLID_TILE_VALUES.has(tile)) return true;
      return container.isWoodFamily() && FLUID_TILE_VALUES.has(tile);
    };
  }

  private isContainerFluidCell(gx: number, gy: number): boolean {
    const tile = this.deps.getCollisionGrid()[gy]?.[gx] ?? 0;
    return FLUID_TILE_VALUES.has(tile);
  }
}
