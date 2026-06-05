import { aabbOverlap } from '@core/Physics';
import {
  getFadeInAlphaFromRemaining,
  getFadeOutAlphaFromRemaining,
} from './TransitionFadeHelpers';

type DoorDirection = 'left' | 'right' | 'up' | 'down';
type LegacyWorldTransitionState = 'none' | 'fade_out' | 'fade_in';

export interface WorldDoorTransitionCandidate {
  direction: DoorDirection;
  nextCol: number;
  nextRow: number;
}

export interface LegacyWorldTransitionStep {
  state: LegacyWorldTransitionState;
  timer: number;
  fadeAlpha: number;
  pendingDirection: DoorDirection | null;
  loadDirection?: DoorDirection;
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

export function stepLegacyWorldTransition({
  state,
  timer,
  pendingDirection,
  dtMs,
  durationMs,
}: {
  state: LegacyWorldTransitionState;
  timer: number;
  pendingDirection: DoorDirection | null;
  dtMs: number;
  durationMs: number;
}): LegacyWorldTransitionStep {
  const nextTimer = timer - dtMs;

  if (state === 'fade_out') {
    if (nextTimer <= 0) {
      return {
        state: 'fade_in',
        timer: durationMs,
        fadeAlpha: 1,
        pendingDirection,
        loadDirection: pendingDirection ?? undefined,
      };
    }

    return {
      state,
      timer: nextTimer,
      fadeAlpha: getFadeOutAlphaFromRemaining(nextTimer, durationMs),
      pendingDirection,
    };
  }

  if (state === 'fade_in') {
    if (nextTimer <= 0) {
      return {
        state: 'none',
        timer: nextTimer,
        fadeAlpha: 0,
        pendingDirection: null,
      };
    }

    return {
      state,
      timer: nextTimer,
      fadeAlpha: getFadeInAlphaFromRemaining(nextTimer, durationMs),
      pendingDirection,
    };
  }

  return {
    state,
    timer: nextTimer,
    fadeAlpha: 0,
    pendingDirection,
  };
}
