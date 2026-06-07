import { aabbOverlap } from '@core/Physics';

type DoorDirection = 'left' | 'right' | 'up' | 'down';

export interface WorldDoorTransitionCandidate {
  direction: DoorDirection;
  nextCol: number;
  nextRow: number;
}

export function findDoorTransitionCandidate<T extends {
  direction: DoorDirection;
  x: number;
  y: number;
  width: number;
  height: number;
}>({
  triggers,
  actorBounds,
  currentCol,
  currentRow,
  gridWidth,
  gridHeight,
  getCell,
}: {
  triggers: readonly T[];
  actorBounds: { x: number; y: number; width: number; height: number };
  currentCol: number;
  currentRow: number;
  gridWidth: number;
  gridHeight: number;
  getCell: (col: number, row: number) => { type: number } | undefined;
}): WorldDoorTransitionCandidate | null {
  for (const trigger of triggers) {
    const triggerBounds = {
      x: trigger.x,
      y: trigger.y,
      width: trigger.width,
      height: trigger.height,
    };
    if (!aabbOverlap(actorBounds, triggerBounds)) {
      continue;
    }

    const nextCol = currentCol + (trigger.direction === 'right' ? 1 : trigger.direction === 'left' ? -1 : 0);
    const nextRow = currentRow + (trigger.direction === 'down' ? 1 : trigger.direction === 'up' ? -1 : 0);
    if (nextRow < 0 || nextRow >= gridHeight || nextCol < 0 || nextCol >= gridWidth) {
      continue;
    }

    const nextCell = getCell(nextCol, nextRow);
    if (!nextCell || nextCell.type === 0) {
      continue;
    }

    return { direction: trigger.direction, nextCol, nextRow };
  }

  return null;
}
