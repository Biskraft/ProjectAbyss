import { Container, Graphics } from 'pixi.js';

/**
 * Echo Flask heal burst — gentle green upward spiral of healing motes plus a
 * central ring flash. Triggered by Player.onFlaskHeal callback.
 */

interface Mote {
  gfx: Graphics;
  baseX: number;
  y: number;
  life: number;
  maxLife: number;
  phase: number;     // spiral phase offset
  freq: number;      // spiral frequency
  amp: number;       // spiral amplitude
  vy: number;
}

interface Ring {
  gfx: Graphics;
  life: number;
  maxLife: number;
  startR: number;
  endR: number;
}

const HEAL_COLOR = 0x96e8a0;      // soft green
const HEAL_BRIGHT = 0xd0ffda;
const MOTE_LIFE = 720;
const RING_LIFE = 360;

export class FlaskHealBurstManager {
  private parent: Container;
  private motes: Mote[] = [];
  private rings: Ring[] = [];

  constructor(parent: Container) { this.parent = parent; }

  /**
   * Spawn the heal burst centered on the player.
   * @param centerX player center X
   * @param centerY player center Y
   * @param healRatio 0..1 — intensity scales with amount of HP restored
   */
  spawn(centerX: number, centerY: number, healRatio = 0.5): void {
    const count = 8 + Math.floor(healRatio * 8);

    // Central ring flash (expanding)
    const ring = new Graphics();
    ring.x = centerX;
    ring.y = centerY;
    this.parent.addChild(ring);
    this.rings.push({
      gfx: ring, life: RING_LIFE, maxLife: RING_LIFE,
      startR: 4, endR: 22 + healRatio * 8,
    });

    // Rising motes (spiral)
    for (let i = 0; i < count; i++) {
      const gfx = new Graphics();
      const radius = 1.6 + Math.random() * 1.4;
      gfx.circle(0, 0, radius).fill({ color: HEAL_BRIGHT, alpha: 1 });
      gfx.circle(0, 0, radius * 1.8).stroke({ color: HEAL_COLOR, width: 1, alpha: 0.6 });
      const baseX = centerX + (Math.random() - 0.5) * 14;
      const startY = centerY + 6 + (Math.random() - 0.5) * 4;
      gfx.x = baseX; gfx.y = startY;
      this.parent.addChild(gfx);

      this.motes.push({
        gfx, baseX, y: startY,
        life: MOTE_LIFE * (0.8 + Math.random() * 0.4),
        maxLife: MOTE_LIFE,
        phase: Math.random() * Math.PI * 2,
        freq: 5 + Math.random() * 3,
        amp: 3 + Math.random() * 4,
        vy: -55 - Math.random() * 30,
      });
    }
  }

  update(dt: number): void {
    const dtSec = dt / 1000;

    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= dt;
      const k = 1 - Math.max(0, r.life / r.maxLife);
      const radius = r.startR + (r.endR - r.startR) * k;
      const alpha = Math.max(0, 1 - k) * 0.8;
      r.gfx.clear();
      r.gfx.circle(0, 0, radius).stroke({ color: HEAL_COLOR, width: 2, alpha });
      r.gfx.circle(0, 0, radius * 0.6).stroke({ color: HEAL_BRIGHT, width: 1, alpha: alpha * 0.8 });
      if (r.life <= 0) {
        if (r.gfx.parent) r.gfx.parent.removeChild(r.gfx);
        r.gfx.destroy();
        this.rings.splice(i, 1);
      }
    }

    for (let i = this.motes.length - 1; i >= 0; i--) {
      const m = this.motes[i];
      m.life -= dt;
      m.y += m.vy * dtSec;
      m.vy *= 0.985;
      const t = Math.max(0, m.life / m.maxLife);
      const phase = m.phase + (1 - t) * m.freq;
      m.gfx.x = m.baseX + Math.sin(phase) * m.amp;
      m.gfx.y = m.y;
      m.gfx.alpha = t;
      m.gfx.scale.set(0.6 + t * 0.6);
      if (m.life <= 0) {
        if (m.gfx.parent) m.gfx.parent.removeChild(m.gfx);
        m.gfx.destroy();
        this.motes.splice(i, 1);
      }
    }
  }

  clear(): void {
    for (const r of this.rings) {
      if (r.gfx.parent) r.gfx.parent.removeChild(r.gfx);
      r.gfx.destroy();
    }
    for (const m of this.motes) {
      if (m.gfx.parent) m.gfx.parent.removeChild(m.gfx);
      m.gfx.destroy();
    }
    this.rings.length = 0;
    this.motes.length = 0;
  }
}
