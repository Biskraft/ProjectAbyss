import type { Player } from '@entities/Player';
import type { ThrowableContainer } from '@entities/ThrowableContainer';
import {
  canContainerOccupyX,
  getContainerOverlapSnapshot,
  moveContainerByY,
  moveContainerToX,
} from './ContainerPositionHelpers';

interface ResolvePlayerContainerOverlapsInput {
  player: Player;
  containers: readonly ThrowableContainer[];
  collisionGrid: number[][];
}

export function resolvePlayerContainerOverlaps(input: ResolvePlayerContainerOverlapsInput): void {
  const { player } = input;
  for (const container of input.containers) {
    if (container.destroyed || container.held) continue;
    const overlap = getContainerOverlapSnapshot(player, container);
    if (!overlap) continue;
    const { left: overlapLeft, right: overlapRight, top: overlapTop, bottom: overlapBottom, min } = overlap;
    const cx0 = overlap.containerX0;
    const cy0 = overlap.containerY0;
    const cx1 = overlap.containerX1;
    if (min === overlapTop) {
      player.y = cy0 - player.height;
      if (player.getVy() > 0) player.vy = 0;
      player.forceGrounded(true, 'container');
    } else if (min === overlapBottom) {
      moveContainerByY(container, -overlapBottom);
      if (container.vy > 0) container.vy = 0;
      if (player.getVy() < 0) player.vy = 0;
    } else if (min === overlapLeft) {
      if (Math.abs(player.getVx()) > 20) {
        const newX = container.x + Math.max(0, overlapLeft - 1);
        if (canContainerOccupyX(container, newX, {
          collisionGrid: input.collisionGrid,
          containers: input.containers,
        })) {
          moveContainerToX(container, newX);
        }
      }
      player.x = cx0 - player.width;
    } else if (min === overlapRight) {
      if (Math.abs(player.getVx()) > 20) {
        const newX = container.x - Math.max(0, overlapRight - 1);
        if (canContainerOccupyX(container, newX, {
          collisionGrid: input.collisionGrid,
          containers: input.containers,
        })) {
          moveContainerToX(container, newX);
        }
      }
      player.x = cx1;
    }
  }
}

export function isPlayerStandingOnContainerTop(
  player: Player,
  containers: readonly ThrowableContainer[],
): boolean {
  const feetY = player.y + player.height;
  const prevFeetY = player.prevY + player.height;
  for (const container of containers) {
    if (container.destroyed || container.held) continue;
    const cx0 = container.colX;
    const cx1 = container.colX + container.colW;
    const topY = container.colY;
    const horizontallySupported = player.x + player.width > cx0 + 1 && player.x < cx1 - 1;
    if (!horizontallySupported) continue;
    const feetAtTop = feetY >= topY - 2 && feetY <= topY + 2;
    const cameFromAbove = prevFeetY <= topY + 4;
    if (feetAtTop && cameFromAbove && player.getVy() >= -1) return true;
  }
  return false;
}
