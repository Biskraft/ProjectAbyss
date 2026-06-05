import type { ThrowableContainer } from '@entities/ThrowableContainer';
import {
  canContainerOccupyX,
  syncContainerRenderPosition,
} from './ContainerPositionHelpers';

interface ResolveContainerContainerCollisionsInput {
  containers: readonly ThrowableContainer[];
  collisionGrid: number[][];
}

export function resolveContainerContainerCollisions(input: ResolveContainerContainerCollisionsInput): void {
  const { containers, collisionGrid } = input;
  for (let i = 0; i < containers.length; i++) {
    const a = containers[i];
    if (a.destroyed || a.held) continue;
    for (let j = i + 1; j < containers.length; j++) {
      const b = containers[j];
      if (b.destroyed || b.held) continue;
      const ax0 = a.colX;
      const ay0 = a.colY;
      const ax1 = a.colX + a.colW;
      const ay1 = a.colY + a.colH;
      const bx0 = b.colX;
      const by0 = b.colY;
      const bx1 = b.colX + b.colW;
      const by1 = b.colY + b.colH;
      if (ax1 <= bx0 || ax0 >= bx1 || ay1 <= by0 || ay0 >= by1) continue;

      const overlapL = ax1 - bx0;
      const overlapR = bx1 - ax0;
      const aCenter = ax0 + (ax1 - ax0) / 2;
      const bCenter = bx0 + (bx1 - bx0) / 2;
      if (aCenter <= bCenter) {
        const ax = a.x - overlapL * 0.5;
        const bx = b.x + overlapL * 0.5;
        if (canContainerOccupyX(a, ax, { collisionGrid, containers, ignore: b })) a.x = ax;
        else a.vx = 0;
        if (canContainerOccupyX(b, bx, { collisionGrid, containers, ignore: a })) b.x = bx;
        else b.vx = 0;
      } else {
        const ax = a.x + overlapR * 0.5;
        const bx = b.x - overlapR * 0.5;
        if (canContainerOccupyX(a, ax, { collisionGrid, containers, ignore: b })) a.x = ax;
        else a.vx = 0;
        if (canContainerOccupyX(b, bx, { collisionGrid, containers, ignore: a })) b.x = bx;
        else b.vx = 0;
      }
      syncContainerRenderPosition(a);
      syncContainerRenderPosition(b);
    }
  }
}
