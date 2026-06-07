import type { Graphics } from 'pixi.js';
import {
  getFadeInAlphaFromRemaining,
  getFadeOutAlphaFromRemaining,
} from '../shared/TransitionFadeHelpers';

export type WorldEdgeTransitionDirection = 'left' | 'right' | 'up' | 'down';

export const ITEM_WORLD_TRANSITION_LEVEL_ID = '__item_world__';

type TransitionState = 'none' | 'fade_out' | 'fade_in';

interface WorldEdgeTransitionRuntimeDeps {
  getFadeOverlay: () => Graphics;
  fadeDurationMs: number;
}

interface StartOptions {
  playerWorldTileX: number;
  playerWorldTileY: number;
  entryCorridor?: boolean;
}

interface UpdateHandlers {
  enterItemWorld: (entryCorridor: boolean) => void;
  loadLevel: (levelId: string, enterFrom: WorldEdgeTransitionDirection) => void;
}

const OPPOSITE_DIRECTION: Record<WorldEdgeTransitionDirection, WorldEdgeTransitionDirection> = {
  left: 'right',
  right: 'left',
  up: 'down',
  down: 'up',
};

export class WorldEdgeTransitionRuntime {
  private state: TransitionState = 'none';
  private timerMs = 0;
  private pendingDirection: WorldEdgeTransitionDirection | null = null;
  private pendingLevelId: string | null = null;
  private pendingEntryCorridor = true;
  private pendingPlayerTileXValue = 0;
  private pendingPlayerTileYValue = 0;

  constructor(private readonly deps: WorldEdgeTransitionRuntimeDeps) {}

  get isActive(): boolean {
    return this.state !== 'none';
  }

  get pendingPlayerTileX(): number {
    return this.pendingPlayerTileXValue;
  }

  get pendingPlayerTileY(): number {
    return this.pendingPlayerTileYValue;
  }

  start(
    direction: WorldEdgeTransitionDirection,
    levelId: string,
    options: StartOptions,
  ): void {
    this.state = 'fade_out';
    this.timerMs = this.deps.fadeDurationMs;
    this.pendingDirection = direction;
    this.pendingLevelId = levelId;
    this.pendingPlayerTileXValue = options.playerWorldTileX;
    this.pendingPlayerTileYValue = options.playerWorldTileY;
    this.pendingEntryCorridor = levelId === ITEM_WORLD_TRANSITION_LEVEL_ID
      ? options.entryCorridor ?? true
      : true;
  }

  update(dtMs: number, handlers: UpdateHandlers): boolean {
    if (this.state === 'none') return false;

    this.timerMs -= dtMs;
    const fadeOverlay = this.deps.getFadeOverlay();
    const fadeDuration = this.deps.fadeDurationMs;

    if (this.state === 'fade_out') {
      fadeOverlay.alpha = getFadeOutAlphaFromRemaining(this.timerMs, fadeDuration);
      if (this.timerMs > 0) return false;

      if (this.pendingLevelId === ITEM_WORLD_TRANSITION_LEVEL_ID) {
        const entryCorridor = this.pendingEntryCorridor;
        this.reset();
        handlers.enterItemWorld(entryCorridor);
        return true;
      }

      if (this.pendingLevelId && this.pendingDirection) {
        handlers.loadLevel(this.pendingLevelId, OPPOSITE_DIRECTION[this.pendingDirection]);
      }
      this.state = 'fade_in';
      this.timerMs = fadeDuration;
      fadeOverlay.alpha = 1;
      return false;
    }

    fadeOverlay.alpha = getFadeInAlphaFromRemaining(this.timerMs, fadeDuration);
    if (this.timerMs > 0) return false;

    this.reset();
    return true;
  }

  reset(): void {
    this.state = 'none';
    this.timerMs = 0;
    this.pendingDirection = null;
    this.pendingLevelId = null;
    this.pendingEntryCorridor = true;
    this.deps.getFadeOverlay().alpha = 0;
  }
}
