import type { Container } from 'pixi.js';
import type { ThrowableContainer } from '@entities/ThrowableContainer';
import { runContainerSpawner, type SpawnerEntityData } from '@systems/ContainerSpawner';
import { buildContainerOccupiedCells, settleContainerAtSpawn } from '@scenes/shared/ContainerSpawnSettleHelpers';
import { addEntityToLayer } from '@scenes/shared/EntityLifecycleHelpers';

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
        occupiedCells: buildContainerOccupiedCells(containers, { skipDestroyed: true }),
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
        addEntityToLayer(containers, container, this.deps.getEntityLayer());
        settleContainerAtSpawn(container, this.deps.getCollisionGrid(), containers);
        spawner.owned.push(container);
      }
    }
  }

  private pruneDestroyedOwnedContainers(spawner: MaintainedContainerSpawner): void {
    for (let i = spawner.owned.length - 1; i >= 0; i--) {
      if (spawner.owned[i].destroyed) spawner.owned.splice(i, 1);
    }
  }

  private resolveRefillSeed(seed: number): number {
    const now = (performance.now() | 0) >>> 0;
    return seed >= 0 ? (seed ^ now) : now;
  }

}
