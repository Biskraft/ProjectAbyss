import { Graphics } from 'pixi.js';
import { destroyDisplayObject } from '@scenes/shared/DisplayObjectLifecycleHelpers';
import { GAME_HEIGHT, GAME_WIDTH, type Game } from '../../Game';

const RETURN_FADE_DURATION_MS = 500;

interface ItemWorldReturnFadeRuntimeDeps {
  normalizeWorldVisuals?: () => void;
}

export class ItemWorldReturnFadeRuntime {
  private readonly overlay: Graphics;
  private remainingMs = 0;
  private readonly normalizeWorldVisuals: () => void;

  constructor(game: Game, deps: ItemWorldReturnFadeRuntimeDeps = {}) {
    this.overlay = new Graphics();
    this.overlay.rect(0, 0, GAME_WIDTH, GAME_HEIGHT).fill(0x000000);
    this.overlay.alpha = 0;
    game.legacyUIContainer.addChild(this.overlay);
    this.normalizeWorldVisuals = deps.normalizeWorldVisuals ?? (() => {});
  }

  start(): void {
    if (this.remainingMs > 0) return;
    this.normalizeWorldVisuals();
    this.remainingMs = RETURN_FADE_DURATION_MS;
    this.overlay.alpha = 1;
  }

  update(dt: number): void {
    if (this.remainingMs <= 0) return;
    this.remainingMs = Math.max(0, this.remainingMs - dt);
    this.overlay.alpha = this.remainingMs / RETURN_FADE_DURATION_MS;
  }

  destroy(): void {
    destroyDisplayObject(this.overlay);
  }
}
