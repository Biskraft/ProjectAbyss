import { Graphics } from 'pixi.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../Game';

/**
 * Sakurai: Screen effects sell the impact.
 * Full-screen color flash overlay that fades out quickly.
 * - White flash: player lands heavy hit on enemy
 * - Red flash: player takes damage
 */
export class ScreenFlash {
  readonly overlay: Graphics;
  private timer = 0;
  private duration = 0;

  constructor() {
    this.overlay = new Graphics();
    this.overlay.rect(0, 0, GAME_WIDTH, GAME_HEIGHT).fill(0xffffff);
    this.overlay.alpha = 0;
    this.overlay.eventMode = 'none';
  }

  /** Trigger a screen flash */
  flash(color: number, intensity: number, durationMs = 120): void {
    this.overlay.clear();
    this.overlay.rect(0, 0, GAME_WIDTH, GAME_HEIGHT).fill(color);
    this.overlay.alpha = Math.min(0.6, intensity);
    this.timer = durationMs;
    this.duration = durationMs;
  }

  /** White flash for heavy player attacks */
  flashHit(heavy: boolean): void {
    this.flash(0xffffff, heavy ? 0.35 : 0.15, heavy ? 100 : 60);
  }

  /** Red flash when player takes damage */
  flashDamage(heavy: boolean): void {
    this.flash(0xff0000, heavy ? 0.4 : 0.2, heavy ? 150 : 80);
  }

  update(dt: number): void {
    if (this.timer <= 0) return;
    this.timer -= dt;
    if (this.timer <= 0) {
      this.overlay.alpha = 0;
      this.timer = 0;
    } else {
      // Fast exponential fade
      const t = this.timer / this.duration;
      this.overlay.alpha *= t;
    }
  }
}
