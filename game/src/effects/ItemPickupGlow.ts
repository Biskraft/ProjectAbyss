import { Container, Graphics } from 'pixi.js';

/**
 * Item pickup glow — expanding halo + rising sparkle motes when a loot drop or
 * key item is picked up. Color is passed in (usually rarity tint) so it doubles
 * as a rarity cue for equipment drops.
 */

interface Halo {
  gfx: Graphics;
  life: number;
  maxLife: number;
  startR: number;
  endR: number;
  color: number;
}

interface Mote {
  gfx: Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  wiggleT: number;
}

const HALO_LIFE = 340;
const MOTE_LIFE = 720;
const MOTE_COUNT = 6;

export class ItemPickupGlowManager {
  private parent: Container;
  private halos: Halo[] = [];
  private motes: Mote[] = [];

  constructor(parent: Container) { this.parent = parent; }

  spawn(x: number, y: number, tint: number): void {
    this.pushHalo(x, y, 4, 28, tint, HALO_LIFE);
    this.pushHalo(x, y, 2, 18, 0xffffff, HALO_LIFE * 0.7);
    for (let i = 0; i < MOTE_COUNT; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.0;
      const speed = 35 + Math.random() * 45;
      const gfx = new Graphics();
      const size = 1.2 + Math.random() * 1.4;
      gfx.circle(0, 0, size).fill({ color: 0xffffff, alpha: 1 });
      gfx.circle(0, 0, size * 1.8).stroke({ color: tint, width: 1, alpha: 0.6 });
      gfx.x = x + (Math.random() - 0.5) * 6;
      gfx.y = y + (Math.random() - 0.5) * 4;
      this.parent.addChild(gfx);
      this.motes.push({
        gfx,
        x: gfx.x, y: gfx.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: MOTE_LIFE * (0.7 + Math.random() * 0.6),
        maxLife: MOTE_LIFE,
        wiggleT: Math.random() * Math.PI * 2,
      });
    }
  }

  private pushHalo(x: number, y: number, startR: number, endR: number, color: number, life: number): void {
    const gfx = new Graphics();
    gfx.x = x; gfx.y = y;
    this.parent.addChild(gfx);
    this.halos.push({ gfx, life, maxLife: life, startR, endR, color });
  }

  update(dt: number): void {
    const dtSec = dt / 1000;
    for (let i = this.halos.length - 1; i >= 0; i--) {
      const h = this.halos[i];
      h.life -= dt;
      const k = 1 - Math.max(0, h.life / h.maxLife);
      const radius = h.startR + (h.endR - h.startR) * k;
      const alpha = Math.max(0, 1 - k);
      h.gfx.clear();
      h.gfx.circle(0, 0, radius).stroke({ color: h.color, width: 2, alpha });
      h.gfx.circle(0, 0, radius * 0.5).fill({ color: h.color, alpha: alpha * 0.3 });
      if (h.life <= 0) {
        if (h.gfx.parent) h.gfx.parent.removeChild(h.gfx);
        h.gfx.destroy();
        this.halos.splice(i, 1);
      }
    }
    for (let i = this.motes.length - 1; i >= 0; i--) {
      const m = this.motes[i];
      m.life -= dt;
      m.wiggleT += dtSec * 4;
      m.x += (m.vx + Math.sin(m.wiggleT) * 20) * dtSec;
      m.y += m.vy * dtSec;
      m.vy -= 24 * dtSec; // float upward
      m.gfx.x = m.x;
      m.gfx.y = m.y;
      const t = Math.max(0, m.life / m.maxLife);
      m.gfx.alpha = t;
      if (m.life <= 0) {
        if (m.gfx.parent) m.gfx.parent.removeChild(m.gfx);
        m.gfx.destroy();
        this.motes.splice(i, 1);
      }
    }
  }

  clear(): void {
    for (const h of this.halos) {
      if (h.gfx.parent) h.gfx.parent.removeChild(h.gfx);
      h.gfx.destroy();
    }
    for (const m of this.motes) {
      if (m.gfx.parent) m.gfx.parent.removeChild(m.gfx);
      m.gfx.destroy();
    }
    this.halos.length = 0;
    this.motes.length = 0;
  }
}
