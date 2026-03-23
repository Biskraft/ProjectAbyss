import { Container, BitmapText } from 'pixi.js';
import { PIXEL_FONT } from './fonts';

const FLOAT_SPEED = 50; // px/s upward
const LIFETIME = 900; // ms
const PUNCH_DURATION = 150; // ms for scale punch

interface DmgEntry {
  text: BitmapText;
  timer: number;
  /** Initial velocity for bounce effect */
  vy: number;
  /** Scale punch: starts big, settles to 1.0 */
  punchTimer: number;
  baseScale: number;
}

/**
 * Sakurai: Damage numbers should "pop" — scale punch on spawn,
 * distinct colors per hit tier, heavier hits = bigger/bolder.
 */
export class DamageNumberManager {
  private parent: Container;
  private entries: DmgEntry[] = [];

  constructor(parent: Container) {
    this.parent = parent;
  }

  spawn(x: number, y: number, damage: number, heavy = false): void {
    // Tiered color and size (Sakurai: visual distinction per strength)
    let color: number;
    let size: number;
    let punchScale: number;

    if (heavy) {
      color = 0xffff44;
      size = 11;
      punchScale = 2.2;
    } else if (damage > 30) {
      color = 0xff6644;
      size = 10;
      punchScale = 1.8;
    } else if (damage > 15) {
      color = 0xff8844;
      size = 9;
      punchScale = 1.5;
    } else {
      color = 0xffffff;
      size = 8;
      punchScale = 1.3;
    }

    const text = new BitmapText({
      text: `${damage}`,
      style: { fontFamily: PIXEL_FONT, fontSize: size, fill: color },
    });
    text.anchor.set(0.5);
    text.x = x + (Math.random() - 0.5) * 8;
    text.y = y;
    this.parent.addChild(text);

    this.entries.push({
      text,
      timer: LIFETIME,
      vy: -30 - Math.random() * 20, // initial upward pop
      punchTimer: PUNCH_DURATION,
      baseScale: punchScale,
    });
  }

  update(dt: number): void {
    const dtSec = dt / 1000;
    for (let i = this.entries.length - 1; i >= 0; i--) {
      const entry = this.entries[i];
      entry.timer -= dt;

      // Float up with deceleration
      entry.text.y += entry.vy * dtSec;
      entry.vy += 60 * dtSec; // slight gravity pull (decelerate upward)
      if (entry.vy > FLOAT_SPEED) entry.vy = FLOAT_SPEED; // cap falling speed

      // Scale punch: elastic overshoot → settle to 1.0
      if (entry.punchTimer > 0) {
        entry.punchTimer -= dt;
        const t = 1 - (entry.punchTimer / PUNCH_DURATION);
        // Elastic ease-out
        const scale = 1 + (entry.baseScale - 1) * Math.pow(1 - t, 2);
        entry.text.scale.set(scale);
      } else {
        entry.text.scale.set(1);
      }

      // Fade out
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
