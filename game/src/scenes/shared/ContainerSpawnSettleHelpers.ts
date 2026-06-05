import type { ThrowableContainer } from '@entities/ThrowableContainer';
import { isContainerFluidCell, isContainerSolidCell } from './ContainerTileRules';

const DEFAULT_CONTAINER_SETTLE_LIMIT = 1024;

interface BuildContainerOccupiedCellsOptions {
  skipDestroyed?: boolean;
}

export function buildContainerOccupiedCells(
  containers: readonly ThrowableContainer[],
  options: BuildContainerOccupiedCellsOptions = {},
): Set<string> {
  const occupiedCells = new Set<string>();
  for (const container of containers) {
    if (options.skipDestroyed && container.destroyed) continue;
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

export function settleContainerAtSpawn(
  container: ThrowableContainer,
  collisionGrid: number[][],
  containers: readonly ThrowableContainer[],
  maxIterations = DEFAULT_CONTAINER_SETTLE_LIMIT,
): void {
  if (container.skipSettle) return;
  container.settleAtSpawn(
    (gx, gy) => isContainerSolidCell(collisionGrid, container, gx, gy),
    containers,
    maxIterations,
    (gx, gy) => isContainerFluidCell(collisionGrid, gx, gy),
  );
}

export function settleContainersAtSpawn(
  containers: readonly ThrowableContainer[],
  collisionGrid: number[][],
  maxIterations = DEFAULT_CONTAINER_SETTLE_LIMIT,
): void {
  const sorted = [...containers].sort((a, b) => b.y - a.y);
  for (const container of sorted) {
    settleContainerAtSpawn(container, collisionGrid, containers, maxIterations);
  }
}

export function settleContainersAtSpawnFromIndex(
  containers: readonly ThrowableContainer[],
  startIndex: number,
  collisionGrid: number[][],
  maxIterations = DEFAULT_CONTAINER_SETTLE_LIMIT,
): void {
  if (startIndex <= 0) {
    settleContainersAtSpawn(containers, collisionGrid, maxIterations);
    return;
  }
  if (startIndex >= containers.length) return;

  const sorted = [...containers.slice(startIndex)].sort((a, b) => b.y - a.y);
  for (const container of sorted) {
    settleContainerAtSpawn(container, collisionGrid, containers, maxIterations);
  }
}
