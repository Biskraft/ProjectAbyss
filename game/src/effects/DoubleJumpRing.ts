import { Container, Graphics } from 'pixi.js';

/**
 * Double-jump ring — a flat expanding oval (foreshortened for a pseudo-3D
 * "stomp on air" feel) that pulses outward from the player's feet at the
 * moment a mid-air double jump is performed.
 *
 * Two co-spawned rings (staggered by RING_STAGGER) give a richer ripple,
 * plus a small central flash.
 */

interface Ring {
  gfx: Graphics;
  x: number;
  y: number;
  life: number;
  maxLife: number;
  startRadius: number;
  endRadius: number;
  thickness: number;
  color: number;
}

interface Flash {
  gfx: Graphics;
  life: number;
  maxLife: number;
}

const RING_LIFE = 340;
const RING_STAGGER = 70;
const RING_COLOR = 0xe8f4ff; // pale sky
const FLASH_LIFE = 160;

export class DoubleJumpRingManager {
  private parent: Container;
  private rings: Ring[] = [];
  private flashes: Flash[] = [];
  private pending: { x: number; y: number; delay: number }[] = [];

  constructor(parent: Container) {
    this.parent = parent;
  }

  /**
   * Spawn the double-jump ring burst at (footX, footY).
   */
  spawn(footX: number, footY: number): void {
    // First ring fires immediately
    this.pushRing(footX, footY, 4, 26, 2.2);
    // Second ring staggered for ripple
    this.pending.push({ x: footX, y: footY, delay: RING_STAGGER });

    // Central flash
    const flash = new Graphics();
    flash.circle(0, 0, 6).fill({ color: 0xffffff, alpha: 0.9 });
    flash.circle(0, 0, 3).fill({ color: 0xcfefff, alpha: 1 });
    flash.x = footX;
    flash.y = footY - 2;
    this.parent.addChild(flash);
    this.flashes.push({ gfx: flash, life: FLASH_LIFE, maxLife: FLASH_LIFE });
  }

  private pushRing(x: number, y: number, startR: number, endR: number, thickness: number): void {
    const gfx = new Graphics();
    gfx.x = x;
    gfx.y = y;
    this.parent.addChild(gfx);
    this.rings.push({
      gfx, x, y,
      life: RING_LIFE, maxLife: RING_LIFE,
      startRadius: startR, endRadius: endR,
      thickness, color: RING_COLOR,
    });
  }

  update(dt: number): void {
    // Spawn pending staggered rings
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const p = this.pending[i];
      p.delay -= dt;
      if (p.delay <= 0) {
        this.pushRing(p.x, p.y, 3, 22, 1.6);
        this.pending.splice(i, 1);
      }
    }

    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= dt;
      const k = 1 - Math.max(0, r.life / r.maxLife); // 0 → 1 over lifetime
      const radius = r.startRadius + (r.endRadius - r.startRadius) * k;
      const alpha = Math.max(0, 1 - k) * 0.9;

      r.gfx.clear();
      // Foreshortened oval: horizontal radius = radius, vertical = radius * 0.35
      r.gfx.ellipse(0, 0, radius, radius * 0.35)
        .stroke({ color: r.color, width: r.thickness, alpha });
      // Inner highlight ring (thinner, brighter) fades faster
      const innerAlpha = Math.max(0, 1 - k * 1.6) * 0.8;
      if (innerAlpha > 0) {
        r.gfx.ellipse(0, 0, radius * 0.75, radius * 0.35 * 0.75)
          .stroke({ color: 0xffffff, width: 1, alpha: innerAlpha });
      }

      if (r.life <= 0) {
        if (r.gfx.parent) r.gfx.parent.removeChild(r.gfx);
        r.gfx.destroy();
        this.rings.splice(i, 1);
      }
    }

    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i];
      f.life -= dt;
      const t = Math.max(0, f.life / f.maxLife);
      f.gfx.alpha = t;
      f.gfx.scale.set(0.6 + (1 - t) * 0.8);
      if (f.life <= 0) {
        if (f.gfx.parent) f.gfx.parent.removeChild(f.gfx);
        f.gfx.destroy();
        this.flashes.splice(i, 1);
      }
    }
  }

  clear(): void {
    for (const r of this.rings) {
      if (r.gfx.parent) r.gfx.parent.removeChild(r.gfx);
      r.gfx.destroy();
    }
    for (const f of this.flashes) {
      if (f.gfx.parent) f.gfx.parent.removeChild(f.gfx);
      f.gfx.destroy();
    }
    this.rings.length = 0;
    this.flashes.length = 0;
    this.pending.length = 0;
  }
}
