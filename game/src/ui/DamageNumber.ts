import { Container, BitmapText } from 'pixi.js';
import { PIXEL_FONT } from './fonts';
import type { Camera } from '@core/Camera';
import { GAME_WIDTH, GAME_HEIGHT } from '../Game';

const FLOAT_SPEED = 50; // px/s upward (in base 640 space)
const LIFETIME = 900; // ms
const PUNCH_DURATION = 150; // ms for scale punch

interface DmgEntry {
  text: BitmapText;
  timer: number;
  vy: number;
  punchTimer: number;
  baseScale: number;
}

/**
 * Renders floating combat text in uiContainer at native resolution.
 * World coordinates are converted to screen coordinates at spawn time.
 */
export class DamageNumberManager {
  private parent: Container;
  private entries: DmgEntry[] = [];
  private camera: Camera;
  private uiScale: number;

  constructor(parent: Container, camera: Camera, uiScale: number) {
    this.parent = parent;
    this.camera = camera;
    this.uiScale = uiScale;
  }

  /** Convert world position to native screen position */
  private toScreen(wx: number, wy: number): { sx: number; sy: number } {
    const s = this.uiScale;
    return {
      sx: (wx - this.camera.renderX + GAME_WIDTH / 2) * s,
      sy: (wy - this.camera.renderY + GAME_HEIGHT / 2) * s,
    };
  }

  spawn(worldX: number, worldY: number, damage: number, heavy = false, critical = false): void {
    const s = this.uiScale;
    let color: number;
    let baseSize: number;
    let punchScale: number;

    if (critical) {
      color = 0xff4444; baseSize = 12; punchScale = 2.5;
    } else if (heavy) {
      color = 0xffff44; baseSize = 11; punchScale = 2.2;
    } else if (damage > 30) {
      color = 0xff6644; baseSize = 10; punchScale = 1.8;
    } else if (damage > 15) {
      color = 0xff8844; baseSize = 9; punchScale = 1.5;
    } else {
      color = 0xffffff; baseSize = 8; punchScale = 1.3;
    }

    // 1.5x size increase, scaled to native res
    const fontSize = Math.round(baseSize * 1.5 * s);
    const { sx, sy } = this.toScreen(worldX, worldY);

    const text = new BitmapText({
      text: `${damage}`,
      style: { fontFamily: PIXEL_FONT, fontSize, fill: color },
    });
    text.anchor.set(0.5);
    text.x = sx + (Math.random() - 0.5) * 8 * s;
    text.y = sy;
    this.parent.addChild(text);

    this.entries.push({
      text, timer: LIFETIME,
      vy: (-30 - Math.random() * 20) * s,
      punchTimer: PUNCH_DURATION,
      baseScale: punchScale,
    });
  }

  /** Spawn EXP text — 2x base size */
  spawnEXP(worldX: number, worldY: number, label: string): void {
    const s = this.uiScale;
    const fontSize = Math.round(8 * 2 * s); // 2x
    const { sx, sy } = this.toScreen(worldX, worldY);

    const text = new BitmapText({
      text: label,
      style: { fontFamily: PIXEL_FONT, fontSize, fill: 0x88ccff },
    });
    text.anchor.set(0.5);
    text.x = sx + (Math.random() - 0.5) * 6 * s;
    text.y = sy;
    this.parent.addChild(text);

    this.entries.push({
      text, timer: LIFETIME,
      vy: (-25 - Math.random() * 15) * s,
      punchTimer: PUNCH_DURATION,
      baseScale: 1.5,
    });
  }

  /** Spawn innocent/special text — 3x base size */
  spawnSpecial(worldX: number, worldY: number, label: string, color: number): void {
    const s = this.uiScale;
    const fontSize = Math.round(8 * 3 * s); // 3x
    const { sx, sy } = this.toScreen(worldX, worldY);

    const text = new BitmapText({
      text: label,
      style: { fontFamily: PIXEL_FONT, fontSize, fill: color },
    });
    text.anchor.set(0.5);
    text.x = sx + (Math.random() - 0.5) * 6 * s;
    text.y = sy;
    this.parent.addChild(text);

    this.entries.push({
      text, timer: LIFETIME * 1.3, // slightly longer for readability
      vy: (-20 - Math.random() * 10) * s,
      punchTimer: PUNCH_DURATION,
      baseScale: 1.8,
    });
  }

  /** Legacy world-space spawn for backward compat (used by old callers) */
  spawnText(worldX: number, worldY: number, label: string, color: number, size = 8): void {
    const s = this.uiScale;
    const fontSize = Math.round(size * 1.5 * s);
    const { sx, sy } = this.toScreen(worldX, worldY);

    const text = new BitmapText({
      text: label,
      style: { fontFamily: PIXEL_FONT, fontSize, fill: color },
    });
    text.anchor.set(0.5);
    text.x = sx + (Math.random() - 0.5) * 6 * s;
    text.y = sy;
    this.parent.addChild(text);

    this.entries.push({
      text, timer: LIFETIME,
      vy: (-25 - Math.random() * 15) * s,
      punchTimer: PUNCH_DURATION,
      baseScale: 1.3,
    });
  }

  /**
   * Remove all in-flight damage numbers immediately. Used on scene teardown
   * because the BitmapText children live in a shared uiContainer — without
   * this, transitioning scenes leaves orphaned floating texts that never
   * receive update() ticks and persist forever.
   */
  clear(): void {
    for (const e of this.entries) {
      if (e.text.parent) e.text.parent.removeChild(e.text);
      e.text.destroy();
    }
    this.entries.length = 0;
  }

  update(dt: number): void {
    const dtSec = dt / 1000;
    for (let i = this.entries.length - 1; i >= 0; i--) {
      const entry = this.entries[i];
      entry.timer -= dt;

      entry.text.y += entry.vy * dtSec;
      entry.vy += 60 * this.uiScale * dtSec;
      if (entry.vy > FLOAT_SPEED * this.uiScale) entry.vy = FLOAT_SPEED * this.uiScale;

      if (entry.punchTimer > 0) {
        entry.punchTimer -= dt;
        const t = 1 - (entry.punchTimer / PUNCH_DURATION);
        const scale = 1 + (entry.baseScale - 1) * Math.pow(1 - t, 2);
        entry.text.scale.set(scale);
      } else {
        entry.text.scale.set(1);
      }

      const fadeStart = LIFETIME * 0.4;
      if (entry.timer < fadeStart) {
        entry.text.alpha = Math.max(0, entry.timer / fadeStart);
      }

      if (entry.timer <= 0) {
        if (entry.text.parent) entry.text.parent.removeChild(entry.text);
        this.entries.splice(i, 1);
      }
    }
  }
}
