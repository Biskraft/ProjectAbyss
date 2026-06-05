import type { ThrowableContainer } from '@entities/ThrowableContainer';
import type { TileMutator } from '@systems/TileMutator';
import { getGridTile, isContainerFluidCell, isContainerSolidTile } from './ContainerTileRules';

interface ContainerOverlapTarget {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ContainerOverlapSnapshot {
  targetX0: number;
  targetY0: number;
  targetX1: number;
  targetY1: number;
  containerX0: number;
  containerY0: number;
  containerX1: number;
  containerY1: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
  min: number;
}

export function getContainerOverlapSnapshot(
  target: ContainerOverlapTarget,
  container: ThrowableContainer,
): ContainerOverlapSnapshot | null {
  const containerX0 = container.colX;
  const containerY0 = container.colY;
  const containerX1 = container.colX + container.colW;
  const containerY1 = container.colY + container.colH;
  const targetX0 = target.x;
  const targetY0 = target.y;
  const targetX1 = target.x + target.width;
  const targetY1 = target.y + target.height;
  if (targetX1 <= containerX0 || targetX0 >= containerX1 || targetY1 <= containerY0 || targetY0 >= containerY1) {
    return null;
  }
  const left = targetX1 - containerX0;
  const right = containerX1 - targetX0;
  const top = targetY1 - containerY0;
  const bottom = containerY1 - targetY0;
  return {
    targetX0,
    targetY0,
    targetX1,
    targetY1,
    containerX0,
    containerY0,
    containerX1,
    containerY1,
    left,
    right,
    top,
    bottom,
    min: Math.min(left, right, top, bottom),
  };
}

export function syncContainerRenderPosition(container: ThrowableContainer): void {
  container.container.x = container.x;
  container.container.y = container.y;
}

export function moveContainerToX(container: ThrowableContainer, x: number): void {
  container.x = x;
  syncContainerRenderPosition(container);
}

export function moveContainerByY(container: ThrowableContainer, deltaY: number): void {
  container.y += deltaY;
  syncContainerRenderPosition(container);
}

export function canContainerOccupyX(
  container: ThrowableContainer,
  newX: number,
  input: {
    collisionGrid: number[][];
    containers: readonly ThrowableContainer[];
    ignore?: ThrowableContainer | null;
  },
): boolean {
  const inset = container.spec.collisionInset;
  const colX = newX + inset.left;
  const colW = container.colW;
  const colY = container.colY;
  const colH = container.colH;
  const left = Math.floor(colX / 16);
  const right = Math.floor((colX + colW - 1) / 16);
  const top = Math.floor(colY / 16);
  const bottom = Math.floor((colY + colH - 1) / 16);

  for (let gy = top; gy <= bottom; gy++) {
    for (let gx = left; gx <= right; gx++) {
      if (isContainerSolidTile(getGridTile(input.collisionGrid, gx, gy))) return false;
    }
  }

  for (const other of input.containers) {
    if (other === container || other === input.ignore || other.destroyed || other.held) continue;
    if (colX + colW <= other.colX || colX >= other.colX + other.colW) continue;
    if (colY + colH <= other.colY || colY >= other.colY + other.colH) continue;
    return false;
  }
  return true;
}

export function containerOverlapsFluid(container: ThrowableContainer, collisionGrid: number[][]): boolean {
  const left = Math.floor(container.colX / 16);
  const right = Math.floor((container.colX + container.colW - 1) / 16);
  const top = Math.floor(container.colY / 16);
  const bottom = Math.floor((container.colY + container.colH - 1) / 16);
  for (let gy = top; gy <= bottom; gy++) {
    for (let gx = left; gx <= right; gx++) {
      if (isContainerFluidCell(collisionGrid, gx, gy)) return true;
    }
  }
  return false;
}

export function createContainerEnvironment(collisionGrid: number[][], tileMutator: TileMutator) {
  return {
    isAcidCell: (gx: number, gy: number) => getGridTile(collisionGrid, gx, gy) === 13,
    isMagmaCell: (gx: number, gy: number) => getGridTile(collisionGrid, gx, gy) === 6,
    isFireCell: (gx: number, gy: number) => tileMutator.aabbHasOverlay(gx * 16, gy * 16, 16, 16, 'fire'),
    isWaterCell: (gx: number, gy: number) => getGridTile(collisionGrid, gx, gy) === 2,
    isOilCell: (gx: number, gy: number) => getGridTile(collisionGrid, gx, gy) === 11,
    isFrozenOrIceCell: (gx: number, gy: number) =>
      getGridTile(collisionGrid, gx, gy) === 7 || tileMutator.isFrozen(gx, gy),
    isChargedCell: (gx: number, gy: number) => getGridTile(collisionGrid, gx, gy) === 8,
  };
}
