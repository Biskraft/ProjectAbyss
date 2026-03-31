/**
 * ThoughtBubble.ts — Floating monologue text above the player.
 *
 * Used for internal monologue (no speaker). Text fades in, lingers,
 * then fades out. Does not block player movement.
 */

import { Container, BitmapText, Graphics } from 'pixi.js';
import { PIXEL_FONT } from './fonts';

const FADE_IN = 300;
const FADE_OUT = 500;
const OFFSET_Y = -12; // px above player top

interface BubbleEntry {
  container: Container;
  duration: number;
  elapsed: number;
}

export class ThoughtBubble {
  readonly container: Container;
  private entries: BubbleEntry[] = [];

  constructor() {
    this.container = new Container();
  }

  /**
   * Show a thought bubble that follows a world position.
   * Call updatePosition() each frame to keep it attached.
   */
  show(text: string, durationMs: number): void {
    // Remove existing bubble if any
    this.clear();

    const bubble = new Container();

    // Word-wrap long text at ~28 chars per line
    const wrapped = this.wordWrap(text, 28);

    const label = new BitmapText({
      text: wrapped,
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xcccccc },
    });
    label.anchor.set(0.5, 1);
    label.x = 0;
    label.y = OFFSET_Y;

    const padX = 6;
    const padY = 4;
    const boxW = label.width + padX * 2;
    const boxH = label.height + padY * 2;

    const bg = new Graphics();
    bg.roundRect(-boxW / 2, OFFSET_Y - boxH, boxW, boxH, 2)
      .fill({ color: 0x000000, alpha: 0.5 });

    bubble.addChild(bg);
    bubble.addChild(label);
    bubble.alpha = 0;

    this.container.addChild(bubble);
    this.entries.push({
      container: bubble,
      duration: durationMs,
      elapsed: 0,
    });
  }

  /** Update position relative to player and handle fade. */
  updatePosition(worldX: number, worldY: number): void {
    this.container.x = worldX;
    this.container.y = worldY;
  }

  update(dt: number): void {
    for (let i = this.entries.length - 1; i >= 0; i--) {
      const entry = this.entries[i];
      entry.elapsed += dt;

      // Fade in
      if (entry.elapsed < FADE_IN) {
        entry.container.alpha = entry.elapsed / FADE_IN;
      }
      // Visible
      else if (entry.elapsed < entry.duration - FADE_OUT) {
        entry.container.alpha = 1;
      }
      // Fade out
      else if (entry.elapsed < entry.duration) {
        const remaining = entry.duration - entry.elapsed;
        entry.container.alpha = remaining / FADE_OUT;
      }
      // Done
      else {
        this.container.removeChild(entry.container);
        this.entries.splice(i, 1);
      }
    }
  }

  get isActive(): boolean {
    return this.entries.length > 0;
  }

  clear(): void {
    for (const entry of this.entries) {
      this.container.removeChild(entry.container);
    }
    this.entries.length = 0;
  }

  private wordWrap(text: string, maxChars: number): string {
    const words = text.split(' ');
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
      if (line.length + word.length + 1 > maxChars && line.length > 0) {
        lines.push(line);
        line = word;
      } else {
        line = line ? line + ' ' + word : word;
      }
    }
    if (line) lines.push(line);
    return lines.join('\n');
  }

  destroy(): void {
    this.clear();
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
  }
}
