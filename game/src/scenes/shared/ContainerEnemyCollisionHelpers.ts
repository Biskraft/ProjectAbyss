import type { Enemy } from '@entities/Enemy';
import type { ThrowableContainer } from '@entities/ThrowableContainer';
import { getContainerOverlapSnapshot, moveContainerByY } from './ContainerPositionHelpers';

interface ResolveEnemyContainerOverlapsInput {
  enemies: readonly Enemy<string>[];
  containers: readonly ThrowableContainer[];
}

export function resolveEnemyContainerOverlaps(input: ResolveEnemyContainerOverlapsInput): void {
  const { containers } = input;
  for (const enemy of input.enemies) {
    if (!enemy.alive) continue;
    for (const container of containers) {
      if (container.destroyed || container.held) continue;
      const overlap = getContainerOverlapSnapshot(enemy, container);
      if (!overlap) continue;
      const { left, right, top, bottom, min } = overlap;
      const cx0 = overlap.containerX0;
      const cy0 = overlap.containerY0;
      const cx1 = overlap.containerX1;
      if (min === top) {
        enemy.y = cy0 - enemy.height;
        if (enemy.vy > 0) enemy.vy = 0;
      } else if (min === bottom) {
        moveContainerByY(container, -bottom);
        if (container.vy > 0) container.vy = 0;
        if (enemy.vy < 0) enemy.vy = 0;
      } else if (min === left) {
        enemy.x = cx0 - enemy.width;
        if (enemy.vx > 0) enemy.vx = 0;
      } else if (min === right) {
        enemy.x = cx1;
        if (enemy.vx < 0) enemy.vx = 0;
      }
    }
  }
}
