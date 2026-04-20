import { Container, Graphics } from 'pixi.js';

/**
 * Combo-finisher burst — heavy radial impact spawned on the 3타 hit.
 * Shockwave ring + radial line spikes + bright flash.
 *
 * Distinct from HitSpark (which handles 1타/2타/heavy): this is specifically
 * reserved for the final combo step or kill-blow to signal payoff.
 */

interface Ring {
  gfx: Graphics;
  life: number;
  maxLife: number;
  startR: number;
  endR: number;
  color: number;
  thickness: number;
}

interface Spike {
  gfx: Graphics;
  x: number;
  y: number;
  life: number;
  maxLife: number;
}

const SHOCK_LIFE = 260;
const SPIKE_LIFE = 200;
const SPIKE_COUNT = 10;

export class ComboFinisherBurstManager {
  private parent: Container;
  private rings: Ring[] = [];
  private spikes: Spike[] = [];

  constructor(parent: Container) { this.parent = parent; }

  spawn(x: number, y: number, dirX: number): void {
    // Outer shockwave ring (white)
    this.pushRing(x, y, 6, 38, 3, 0xffffff, SHOCK_LIFE);
    // Inner orange ring (slight lag, pops afterward via slower expansion)
    this.pushRing(x, y, 2, 26, 2, 0xffb155, SHOCK_LIFE * 0.85);

    // Central flash
    const flash = new Graphics();
    flash.circle(0, 0, 16).fill({ color: 0xffffff, alpha: 0.9 });
    flash.circle(0, 0, 10).fill({ color: 0xffe090, alpha: 1 });
    flash.x = x; flash.y = y;
    this.parent.addChild(flash);
    this.spikes.push({ gfx: flash, x, y, life: 140, maxLife: 140 });

    // Radial line spikes — biased toward knockback dir
    for (let i = 0; i < SPIKE_COUNT; i++) {
      const angle = (i / SPIKE_COUNT) * Math.PI * 2 + dirX * 0.25;
      const gfx = new Graphics();
      gfx.moveTo(0, 0).lineTo(14, 0).stroke({ color: 0x000000, width: 4 });
      gfx.moveTo(0, 0).lineTo(12, 0).stroke({ color: 0xffffff, width: 2 });
      gfx.x = x; gfx.y = y;
      gfx.rotation = angle;
      this.parent.addChild(gfx);
      this.spikes.push({ gfx, x, y, life: SPIKE_LIFE, maxLife: SPIKE_LIFE });
    }
  }

  private pushRing(x: number, y: number, startR: number, endR: number, thick: number, color: number, life: number): void {
    const gfx = new Graphics();
    gfx.x = x; gfx.y = y;
    this.parent.addChild(gfx);
    this.rings.push({ gfx, life, maxLife: life, startR, endR, color, thickness: thick });
  }

  update(dt: number): void {
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= dt;
      const k = 1 - Math.max(0, r.life / r.maxLife);
      const radius = r.startR + (r.endR - r.startR) * k;
      const alpha = Math.max(0, 1 - k);
      r.gfx.clear();
      r.gfx.circle(0, 0, radius).stroke({ color: r.color, width: r.thickness, alpha });
      if (r.life <= 0) {
        if (r.gfx.parent) r.gfx.parent.removeChild(r.gfx);
        r.gfx.destroy();
        this.rings.splice(i, 1);
      }
    }

    for (let i = this.spikes.length - 1; i >= 0; i--) {
      const s = this.spikes[i];
      s.life -= dt;
      const t = Math.max(0, s.life / s.maxLife);
      s.gfx.alpha = t;
      s.gfx.scale.set(0.5 + (1 - t) * 1.2);
      if (s.life <= 0) {
        if (s.gfx.parent) s.gfx.parent.removeChild(s.gfx);
        s.gfx.destroy();
        this.spikes.splice(i, 1);
      }
    }
  }

  clear(): void {
    for (const r of this.rings) {
      if (r.gfx.parent) r.gfx.parent.removeChild(r.gfx);
      r.gfx.destroy();
    }
    for (const s of this.spikes) {
      if (s.gfx.parent) s.gfx.parent.removeChild(s.gfx);
      s.gfx.destroy();
    }
    this.rings.length = 0;
    this.spikes.length = 0;
  }
}
