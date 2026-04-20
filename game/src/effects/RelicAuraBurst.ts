import { Container, Graphics } from 'pixi.js';

/**
 * Relic aura burst — reserved for Metroidvania ability unlocks (Dash, Wall
 * Climb, Double Jump, Mist Form, Water Breathing, Anti-Gravity). Significantly
 * more dramatic than ItemPickupGlow: triple expanding ring, starburst rays, and
 * a lingering column of light to punctuate the moment.
 */

interface Ring {
  gfx: Graphics;
  life: number;
  maxLife: number;
  startR: number;
  endR: number;
  color: number;
  delay: number;
}

interface Ray {
  gfx: Graphics;
  life: number;
  maxLife: number;
}

interface Column {
  gfx: Graphics;
  life: number;
  maxLife: number;
}

const RING_LIFE = 520;
const RAY_LIFE = 640;
const COLUMN_LIFE = 900;

export class RelicAuraBurstManager {
  private parent: Container;
  private rings: Ring[] = [];
  private rays: Ray[] = [];
  private columns: Column[] = [];

  constructor(parent: Container) { this.parent = parent; }

  spawn(x: number, y: number, tint: number): void {
    // Vertical column of light (fade in fast, linger, fade out)
    const column = new Graphics();
    column.rect(-12, -280, 24, 280).fill({ color: tint, alpha: 0.45 });
    column.rect(-4, -280, 8, 280).fill({ color: 0xffffff, alpha: 0.7 });
    column.x = x; column.y = y;
    this.parent.addChild(column);
    this.columns.push({ gfx: column, life: COLUMN_LIFE, maxLife: COLUMN_LIFE });

    // Three staggered rings
    for (let i = 0; i < 3; i++) {
      const delay = i * 120;
      const gfx = new Graphics();
      gfx.x = x; gfx.y = y;
      gfx.alpha = 0;
      this.parent.addChild(gfx);
      this.rings.push({
        gfx,
        life: RING_LIFE + delay,
        maxLife: RING_LIFE,
        startR: 6,
        endR: 54 + i * 14,
        color: i === 0 ? 0xffffff : tint,
        delay,
      });
    }

    // 8-ray starburst
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const gfx = new Graphics();
      gfx.moveTo(0, 0).lineTo(24, 0).stroke({ color: 0xffffff, width: 3, alpha: 1 });
      gfx.moveTo(0, 0).lineTo(20, 0).stroke({ color: tint, width: 1.5, alpha: 0.9 });
      gfx.x = x; gfx.y = y;
      gfx.rotation = angle;
      this.parent.addChild(gfx);
      this.rays.push({ gfx, life: RAY_LIFE, maxLife: RAY_LIFE });
    }
  }

  update(dt: number): void {
    for (let i = this.columns.length - 1; i >= 0; i--) {
      const c = this.columns[i];
      c.life -= dt;
      const t = c.life / c.maxLife;
      // ease: fade-in 0..0.15, hold 0.15..0.6, fade-out 0.6..1
      const k = 1 - t;
      let alpha = 1;
      if (k < 0.15) alpha = k / 0.15;
      else if (k > 0.6) alpha = Math.max(0, 1 - (k - 0.6) / 0.4);
      c.gfx.alpha = alpha;
      c.gfx.scale.x = 1 + (1 - t) * 0.2;
      if (c.life <= 0) {
        if (c.gfx.parent) c.gfx.parent.removeChild(c.gfx);
        c.gfx.destroy();
        this.columns.splice(i, 1);
      }
    }

    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= dt;
      const effectiveLife = Math.max(0, r.maxLife - Math.max(0, r.life - r.maxLife));
      const k = 1 - effectiveLife / r.maxLife;
      if (r.life > r.maxLife) {
        r.gfx.alpha = 0;
      } else {
        const radius = r.startR + (r.endR - r.startR) * k;
        const alpha = Math.max(0, 1 - k);
        r.gfx.clear();
        r.gfx.circle(0, 0, radius).stroke({ color: r.color, width: 3, alpha });
        r.gfx.circle(0, 0, radius * 0.5).stroke({ color: 0xffffff, width: 1, alpha: alpha * 0.7 });
        r.gfx.alpha = 1;
      }
      if (r.life <= 0) {
        if (r.gfx.parent) r.gfx.parent.removeChild(r.gfx);
        r.gfx.destroy();
        this.rings.splice(i, 1);
      }
    }

    for (let i = this.rays.length - 1; i >= 0; i--) {
      const ray = this.rays[i];
      ray.life -= dt;
      const t = Math.max(0, ray.life / ray.maxLife);
      ray.gfx.alpha = t;
      ray.gfx.scale.set(0.5 + (1 - t) * 1.8);
      ray.gfx.rotation += dt * 0.002;
      if (ray.life <= 0) {
        if (ray.gfx.parent) ray.gfx.parent.removeChild(ray.gfx);
        ray.gfx.destroy();
        this.rays.splice(i, 1);
      }
    }
  }

  clear(): void {
    for (const c of this.columns) {
      if (c.gfx.parent) c.gfx.parent.removeChild(c.gfx);
      c.gfx.destroy();
    }
    for (const r of this.rings) {
      if (r.gfx.parent) r.gfx.parent.removeChild(r.gfx);
      r.gfx.destroy();
    }
    for (const ray of this.rays) {
      if (ray.gfx.parent) ray.gfx.parent.removeChild(ray.gfx);
      ray.gfx.destroy();
    }
    this.columns.length = 0;
    this.rings.length = 0;
    this.rays.length = 0;
  }
}
