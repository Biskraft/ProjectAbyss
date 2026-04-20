import { Container, Graphics } from 'pixi.js';

/**
 * Dive-land impact — heavy shockwave + debris when the player touches down from
 * a tall fall / surge fly / slam dive. Ring expands fast, then slow debris puffs
 * spray outward. Meant for "serious" landings, not every jump land.
 */

interface Ring {
  gfx: Graphics;
  life: number;
  maxLife: number;
  startR: number;
  endR: number;
  thick: number;
  color: number;
}

interface Debris {
  gfx: Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

const RING_LIFE = 300;
const DEBRIS_LIFE = 520;
const DEBRIS_COUNT = 10;

export class DiveLandImpactManager {
  private parent: Container;
  private rings: Ring[] = [];
  private debris: Debris[] = [];

  constructor(parent: Container) { this.parent = parent; }

  spawn(centerX: number, footY: number, severity: number): void {
    const s = Math.max(0.6, Math.min(1.6, severity));
    // Outer white shockwave
    this.pushRing(centerX, footY, 4 * s, 46 * s, 3, 0xffffff, RING_LIFE);
    // Inner dust-tone ring
    this.pushRing(centerX, footY, 2 * s, 34 * s, 2, 0xc9b27a, RING_LIFE * 0.85);

    for (let i = 0; i < DEBRIS_COUNT; i++) {
      const t = (i / DEBRIS_COUNT) * Math.PI - Math.PI; // upper half outward
      const spread = (Math.random() - 0.5) * 0.6;
      const angle = t + spread;
      const speed = 120 + Math.random() * 120;
      const gfx = new Graphics();
      const size = 1.5 + Math.random() * 2.2;
      gfx.rect(-size / 2, -size / 2, size, size).fill({ color: 0xaa8a52, alpha: 1 });
      gfx.x = centerX;
      gfx.y = footY;
      this.parent.addChild(gfx);
      this.debris.push({
        gfx, x: centerX, y: footY,
        vx: Math.cos(angle) * speed * s,
        vy: Math.sin(angle) * speed * s,
        life: DEBRIS_LIFE * (0.7 + Math.random() * 0.5),
        maxLife: DEBRIS_LIFE,
      });
    }
  }

  private pushRing(x: number, y: number, startR: number, endR: number, thick: number, color: number, life: number): void {
    const gfx = new Graphics();
    gfx.x = x; gfx.y = y;
    this.parent.addChild(gfx);
    this.rings.push({ gfx, life, maxLife: life, startR, endR, thick, color });
  }

  update(dt: number): void {
    const dtSec = dt / 1000;
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= dt;
      const k = 1 - Math.max(0, r.life / r.maxLife);
      const radius = r.startR + (r.endR - r.startR) * k;
      const alpha = Math.max(0, 1 - k);
      r.gfx.clear();
      // Flattened ellipse (pseudo-3D ground ring)
      r.gfx.ellipse(0, 0, radius, radius * 0.35).stroke({ color: r.color, width: r.thick, alpha });
      if (r.life <= 0) {
        if (r.gfx.parent) r.gfx.parent.removeChild(r.gfx);
        r.gfx.destroy();
        this.rings.splice(i, 1);
      }
    }

    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      d.life -= dt;
      d.x += d.vx * dtSec;
      d.y += d.vy * dtSec;
      d.vx *= 0.93;
      d.vy = d.vy * 0.95 + 420 * dtSec; // heavy gravity
      d.gfx.x = d.x;
      d.gfx.y = d.y;
      const t = Math.max(0, d.life / d.maxLife);
      d.gfx.alpha = t;
      if (d.life <= 0) {
        if (d.gfx.parent) d.gfx.parent.removeChild(d.gfx);
        d.gfx.destroy();
        this.debris.splice(i, 1);
      }
    }
  }

  clear(): void {
    for (const r of this.rings) {
      if (r.gfx.parent) r.gfx.parent.removeChild(r.gfx);
      r.gfx.destroy();
    }
    for (const d of this.debris) {
      if (d.gfx.parent) d.gfx.parent.removeChild(d.gfx);
      d.gfx.destroy();
    }
    this.rings.length = 0;
    this.debris.length = 0;
  }
}
