/**
 * AreaTitle — Elden Ring-style area name banner.
 *
 * Large centered title with a thin horizontal divider below. Fades in,
 * holds, then fades out. Reusable across scenes: use show(text) each time
 * the player enters a new space.
 *
 * Rendered with BitmapText (TITLE_FONT / Cinzel) at the installed atlas
 * resolution so glyphs stay crisp after uiScale upscaling.
 * Add the container to `game.legacyUIContainer` (applies uiScale).
 */

import { Container, BitmapText, Graphics } from 'pixi.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../Game';
import { TITLE_FONT } from './fonts';

type Phase = 'idle' | 'fadeIn' | 'hold' | 'fadeOut';

export class AreaTitle {
  readonly container: Container;

  private title: BitmapText;
  private divider: Graphics;

  private phase: Phase = 'idle';
  private timer = 0;

  // Timings (ms) — tuned cinematic but not intrusive.
  private readonly FADE_IN = 700;
  private readonly HOLD = 2200;
  private readonly FADE_OUT = 900;

  constructor() {
    this.container = new Container();
    this.container.alpha = 0;
    this.container.visible = false;

    this.title = new BitmapText({
      text: '',
      style: {
        fontFamily: TITLE_FONT,
        fontSize: 36,
        fill: 0xf2e8c6, // warm crisp parchment
        letterSpacing: 6,
        align: 'center',
      },
    });
    this.title.anchor.set(0.5, 0.5);

    this.divider = new Graphics();

    this.container.addChild(this.title);
    this.container.addChild(this.divider);
  }

  /** Trigger the banner with the given text. Any in-progress banner is replaced. */
  show(text: string): void {
    this.title.text = text;
    this.layout();
    this.phase = 'fadeIn';
    this.timer = 0;
    this.container.alpha = 0;
    this.container.visible = true;
  }

  /** True while banner is fading in, holding, or fading out. */
  get isActive(): boolean {
    return this.phase !== 'idle';
  }

  /** Cancel immediately (e.g. scene teardown). */
  hide(): void {
    this.phase = 'idle';
    this.timer = 0;
    this.container.alpha = 0;
    this.container.visible = false;
  }

  update(dt: number): void {
    if (this.phase === 'idle') return;
    this.timer += dt;

    switch (this.phase) {
      case 'fadeIn': {
        const t = Math.min(1, this.timer / this.FADE_IN);
        this.container.alpha = easeOutCubic(t);
        if (this.timer >= this.FADE_IN) {
          this.phase = 'hold';
          this.timer = 0;
          this.container.alpha = 1;
        }
        break;
      }
      case 'hold': {
        this.container.alpha = 1;
        if (this.timer >= this.HOLD) {
          this.phase = 'fadeOut';
          this.timer = 0;
        }
        break;
      }
      case 'fadeOut': {
        const t = Math.min(1, this.timer / this.FADE_OUT);
        this.container.alpha = 1 - easeInCubic(t);
        if (this.timer >= this.FADE_OUT) {
          this.phase = 'idle';
          this.container.alpha = 0;
          this.container.visible = false;
        }
        break;
      }
    }
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }

  // ---------------------------------------------------------------------------
  // Layout (integer-pixel coords so nothing renders on a half-pixel).
  // ---------------------------------------------------------------------------

  private layout(): void {
    const cx = Math.round(GAME_WIDTH / 2);
    // Upper-area placement (Elden Ring-style: roughly upper fifth of the screen).
    const cy = Math.round(GAME_HEIGHT * 0.22);

    this.title.x = cx;
    this.title.y = cy;

    // Divider width scales with title so short names don't get a giant line.
    const textW = Math.ceil(this.title.width);
    const lineW = Math.round(Math.max(160, Math.min(GAME_WIDTH - 80, textW + 80)));
    const lineY = Math.round(cy + this.title.height / 2 + 8);

    this.divider.clear();
    this.divider
      .moveTo(cx - lineW / 2, lineY)
      .lineTo(cx + lineW / 2, lineY)
      .stroke({ width: 1, color: 0xf2e8c6, alpha: 1 });
  }
}

function easeOutCubic(t: number): number {
  const u = 1 - t;
  return 1 - u * u * u;
}

function easeInCubic(t: number): number {
  return t * t * t;
}
