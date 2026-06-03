import type { Graphics } from 'pixi.js';

interface ItemWorldRoomTransitionRuntimeDeps {
  getFadeOverlay: () => Graphics;
  fadeDurationMs: number;
}

interface StartOptions {
  col: number;
  row: number;
}

interface UpdateHandlers {
  placePlayerInRoom: (col: number, row: number) => void;
}

type RoomTransitionState = 'none' | 'fade_out' | 'fade_in';

export class ItemWorldRoomTransitionRuntime {
  private state: RoomTransitionState = 'none';
  private timerMs = 0;
  private pendingCol = 0;
  private pendingRow = 0;

  constructor(private readonly deps: ItemWorldRoomTransitionRuntimeDeps) {}

  get isActive(): boolean {
    return this.state !== 'none';
  }

  get suppressionState(): string {
    return this.isActive ? this.state : 'none';
  }

  start(options: StartOptions): void {
    this.state = 'fade_out';
    this.timerMs = this.deps.fadeDurationMs;
    this.pendingCol = options.col;
    this.pendingRow = options.row;
  }

  update(dtMs: number, handlers: UpdateHandlers): boolean {
    if (this.state === 'none') return false;

    this.timerMs -= dtMs;
    const fadeOverlay = this.deps.getFadeOverlay();
    const fadeDuration = this.deps.fadeDurationMs;

    if (this.state === 'fade_out') {
      fadeOverlay.alpha = Math.min(1, 1 - this.timerMs / fadeDuration);
      if (this.timerMs > 0) return false;

      handlers.placePlayerInRoom(this.pendingCol, this.pendingRow);
      this.state = 'fade_in';
      this.timerMs = fadeDuration;
      fadeOverlay.alpha = 1;
      return false;
    }

    fadeOverlay.alpha = Math.max(0, this.timerMs / fadeDuration);
    if (this.timerMs > 0) return false;

    this.reset();
    return true;
  }

  reset(): void {
    this.state = 'none';
    this.timerMs = 0;
    this.deps.getFadeOverlay().alpha = 0;
  }
}
