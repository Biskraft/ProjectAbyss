import type { Graphics } from 'pixi.js';

interface ItemWorldExitFadeRuntimeDeps {
  getFadeOverlay: () => Graphics;
  durationMs: number;
}

export class ItemWorldExitFadeRuntime {
  private remainingMs = 0;

  constructor(private readonly deps: ItemWorldExitFadeRuntimeDeps) {}

  get isActive(): boolean {
    return this.remainingMs > 0;
  }

  start(): void {
    this.remainingMs = this.deps.durationMs;
    this.deps.getFadeOverlay().alpha = 0;
  }

  update(dtMs: number): boolean {
    if (this.remainingMs <= 0) return false;

    this.remainingMs = Math.max(0, this.remainingMs - dtMs);
    const overlay = this.deps.getFadeOverlay();
    overlay.alpha = Math.min(1, 1 - this.remainingMs / this.deps.durationMs);
    return this.remainingMs <= 0;
  }

  reset(): void {
    this.remainingMs = 0;
    this.deps.getFadeOverlay().alpha = 0;
  }
}
