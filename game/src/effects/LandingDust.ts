import { Container, Graphics } from 'pixi.js';

/**
 * Landing dust — soft puff of kicked-up dust when the player lands on ground.
 *
 * Intensity scales with fall speed:
 *   light  ( <  220 px/s ) : 3 puffs, small radius
 *   medium (220..380)      : 5 puffs, medium radius
 *   heavy  ( >= 380 )      : 7 puffs, large radius + small upward burst
 *
 * Puffs spawn at the player's foot line with outward-horizontal drift + small
 * upward lift, fading out while shrinking.
 */

interface Puff {
  gfx: Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  startRadius: number;
}

const PUFF_LIFE = 320;    // ms
const PUFF_COLOR = 0xc8b48a; // sandy dust (neutral warm)
const LIGHT_THRESHOLD = 220; // px/s
const HEAVY_THRESHOLD = 380; // px/s

export class LandingDustManager {
  private parent: Container;
  private puffs: Puff[] = [];

  constructor(parent: Container) {
    this.parent = parent;
  }

  /**
   * Spawn landing dust at (footX, footY) — footY is the bottom edge of the entity.
   * @param fallSpeed abs(vy) at the moment of landing, in px/s. Drives intensity.
   */
  spawn(footX: number, footY: number, fallSpeed: number): void {
    this.spawnScaled(footX, footY, fallSpeed, 1);
  }

  spawnScaled(
    footX: number,
    footY: number,
    fallSpeed: number,
    scale: number,
    spreadAxis: 'horizontal' | 'vertical' = 'horizontal',
  ): void {
    if (fallSpeed < 80) return; // negligible — skip (walk-offs of small ledges)

    const s = Math.max(0.1, scale);
    let count: number;
    let radiusBase: number;
    let heavy = false;
    if (fallSpeed >= HEAVY_THRESHOLD) {
      count = Math.ceil(7 * Math.min(2.5, s));
      radiusBase = 4.5 * s;
      heavy = true;
    } else if (fallSpeed >= LIGHT_THRESHOLD) {
      count = Math.ceil(5 * Math.min(2.5, s));
      radiusBase = 3.5 * s;
    } else {
      count = Math.ceil(3 * Math.min(2.5, s));
      radiusBase = 2.5 * s;
    }

    // Lateral puffs — spread outward along the ground line
    for (let i = 0; i < count; i++) {
      // Symmetric-ish spread: alternating left/right
      const side = (i % 2 === 0) ? -1 : 1;
      const t = Math.floor(i / 2) + 1;            // 1,1,2,2,3,...
      const baseOffset = side * t * 3 * s;        // -3, +3, -6, +6, -9, ...
      const jitterMain = (Math.random() - 0.5) * 4 * s;
      const jitterCross = (Math.random() - 0.5) * 1.5 * s;
      const x = spreadAxis === 'vertical' ? footX + jitterCross : footX + baseOffset + jitterMain;
      const y = spreadAxis === 'vertical' ? footY + baseOffset + jitterMain : footY - 1 * s + jitterCross;

      const speed = (40 + Math.random() * 40) * s;
      const vx = spreadAxis === 'vertical'
        ? (Math.random() - 0.5) * 18 * s
        : side * speed * (0.6 + Math.random() * 0.6);
      const vy = spreadAxis === 'vertical'
        ? side * speed * (0.6 + Math.random() * 0.6)
        : (-20 - Math.random() * 30) * s;  // small upward lift

      const radius = radiusBase * (0.8 + Math.random() * 0.5);

      const gfx = new Graphics();
      gfx.circle(0, 0, radius).fill({ color: PUFF_COLOR, alpha: 0.7 });
      gfx.x = x;
      gfx.y = y;
      this.parent.addChild(gfx);

      this.puffs.push({
        gfx, x, y, vx, vy,
        life: PUFF_LIFE * (0.7 + Math.random() * 0.5),
        maxLife: PUFF_LIFE,
        startRadius: radius,
      });
    }

    // Heavy landings get a small central upward plume
    if (heavy) {
      for (let i = 0; i < 3; i++) {
        const x = footX + (Math.random() - 0.5) * 4 * s;
        const y = footY - 2 * s;
        const radius = radiusBase * 0.8;
        const gfx = new Graphics();
        gfx.circle(0, 0, radius).fill({ color: PUFF_COLOR, alpha: 0.6 });
        gfx.x = x;
        gfx.y = y;
        this.parent.addChild(gfx);
        this.puffs.push({
          gfx, x, y,
          vx: (Math.random() - 0.5) * 20 * s,
          vy: (-50 - Math.random() * 30) * s,
          life: PUFF_LIFE * 0.8,
          maxLife: PUFF_LIFE,
          startRadius: radius,
        });
      }
    }
  }

  update(dt: number): void {
    const dtSec = dt / 1000;
    for (let i = this.puffs.length - 1; i >= 0; i--) {
      const p = this.puffs[i];
      p.life -= dt;
      p.x += p.vx * dtSec;
      p.y += p.vy * dtSec;
      p.gfx.x = p.x;
      p.gfx.y = p.y;
      // Decelerate, gravity-lite
      p.vx *= 0.90;
      p.vy = p.vy * 0.94 + 40 * dtSec; // gentle settle

      const t = Math.max(0, p.life / p.maxLife);
      p.gfx.alpha = t * 0.75;
      p.gfx.scale.set(1 + (1 - t) * 0.6); // expand slightly as it fades

      if (p.life <= 0) {
        if (p.gfx.parent) p.gfx.parent.removeChild(p.gfx);
        this.puffs.splice(i, 1);
      }
    }
  }

  clear(): void {
    for (const p of this.puffs) {
      if (p.gfx.parent) p.gfx.parent.removeChild(p.gfx);
    }
    this.puffs.length = 0;
  }
}
