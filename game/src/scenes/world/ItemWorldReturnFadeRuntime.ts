import { Graphics } from 'pixi.js';
import { GAME_HEIGHT, GAME_WIDTH, type Game } from '../../Game';

const RETURN_FADE_DURATION_MS = 500;

export class ItemWorldReturnFadeRuntime {
  private readonly overlay: Graphics;
  private remainingMs = 0;

  constructor(game: Game) {
    this.overlay = new Graphics();
    this.overlay.rect(0, 0, GAME_WIDTH, GAME_HEIGHT).fill(0x000000);
    this.overlay.alpha = 0;
    game.legacyUIContainer.addChild(this.overlay);
  }

  start(): void {
    this.remainingMs = RETURN_FADE_DURATION_MS;
    this.overlay.alpha = 1;
  }

  update(dt: number): void {
    if (this.remainingMs <= 0) return;
    this.remainingMs = Math.max(0, this.remainingMs - dt);
    this.overlay.alpha = this.remainingMs / RETURN_FADE_DURATION_MS;
  }

  destroy(): void {
    this.overlay.parent?.removeChild(this.overlay);
    this.overlay.destroy();
  }
}
