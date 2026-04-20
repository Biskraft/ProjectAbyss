import { Container, Graphics } from 'pixi.js';

/**
 * Water splash — crown-shape droplet burst when entering or exiting water
 * surface. A wide flat ellipse for the impact + upward-arcing droplets.
 */

interface Drop {
  gfx: Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

interface Crown {
  gfx: Graphics;
  life: number;
  maxLife: number;
  startR: number;
  endR: number;
}

const CROWN_LIFE = 260;
const DROP_LIFE = 520;
const DROP_COUNT = 9;
const COLOR_DROP = 0x9bd6e8;
const COLOR_CROWN = 0xd5f0ff;

export class WaterSplashManager {
  private parent: Container;
  private crowns: Crown[] = [];
  private drops: Drop[] = [];

  constructor(parent: Container) { this.parent = parent; }

  spawn(x: number, surfaceY: number, strength: number): void {
    const s = Math.max(0.6, Math.min(1.5, strength));

    const crown = new Graphics();
    crown.x = x; crown.y = surfaceY;
    this.parent.addChild(crown);
    this.crowns.push({
      gfx: crown,
      life: CROWN_LIFE,
      maxLife: CROWN_LIFE,
      startR: 6 * s,
      endR: 36 * s,
    });

    for (let i = 0; i < DROP_COUNT; i++) {
      // Upper half arc
      const angle = -Math.PI / 2 + (i / (DROP_COUNT - 1) - 0.5) * Math.PI * 1.1;
      const speed = 130 + Math.random() * 140;
      const gfx = new Graphics();
      const size = 1.5 + Math.random() * 1.8;
      gfx.circle(0, 0, size).fill({ color: COLOR_DROP, alpha: 1 });
      gfx.x = x; gfx.y = surfaceY;
      this.parent.addChild(gfx);
      this.drops.push({
        gfx, x, y: surfaceY,
        vx: Math.cos(angle) * speed * s,
        vy: Math.sin(angle) * speed * s,
        life: DROP_LIFE * (0.6 + Math.random() * 0.6),
        maxLife: DROP_LIFE,
      });
    }
  }

  update(dt: number): void {
    const dtSec = dt / 1000;
    for (let i = this.crowns.length - 1; i >= 0; i--) {
      const c = this.crowns[i];
      c.life -= dt;
      const k = 1 - Math.max(0, c.life / c.maxLife);
      const radius = c.startR + (c.endR - c.startR) * k;
      const alpha = Math.max(0, 1 - k);
      c.gfx.clear();
      c.gfx.ellipse(0, 0, radius, radius * 0.22)
        .stroke({ color: COLOR_CROWN, width: 2, alpha });
      if (c.life <= 0) {
        if (c.gfx.parent) c.gfx.parent.removeChild(c.gfx);
        c.gfx.destroy();
        this.crowns.splice(i, 1);
      }
    }
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      d.life -= dt;
      d.x += d.vx * dtSec;
      d.y += d.vy * dtSec;
      d.vy += 480 * dtSec; // gravity pulls droplets back down
      d.gfx.x = d.x;
      d.gfx.y = d.y;
      const t = Math.max(0, d.life / d.maxLife);
      d.gfx.alpha = t;
      if (d.life <= 0) {
        if (d.gfx.parent) d.gfx.parent.removeChild(d.gfx);
        d.gfx.destroy();
        this.drops.splice(i, 1);
      }
    }
  }

  clear(): void {
    for (const c of this.crowns) {
      if (c.gfx.parent) c.gfx.parent.removeChild(c.gfx);
      c.gfx.destroy();
    }
    for (const d of this.drops) {
      if (d.gfx.parent) d.gfx.parent.removeChild(d.gfx);
      d.gfx.destroy();
    }
    this.crowns.length = 0;
    this.drops.length = 0;
  }
}
