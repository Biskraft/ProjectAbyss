import { Container, Graphics } from 'pixi.js';

/**
 * Item pickup glow — expanding halo + forge-spark ember burst when a loot drop
 * or key item is picked up. Color is passed in (usually rarity tint) so it
 * doubles as a rarity cue for equipment drops.
 *
 * Sparks are angular diamond shards that burst outward in all directions with
 * gravity pulling them back down — matches the 단조(forge) visual theme.
 * Replaces the previous rising-mote design which read as water droplets.
 */

interface Halo {
  gfx: Graphics;
  life: number;
  maxLife: number;
  startR: number;
  endR: number;
  color: number;
}

interface Spark {
  gfx: Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  rot: number;
  rotV: number;
}

const HALO_LIFE = 340;
const SPARK_LIFE = 520;
const SPARK_COUNT = 9;
const SPARK_CORE = 0xfff2c8; // warm ember core (slight yellow-white)

export class ItemPickupGlowManager {
  private parent: Container;
  private halos: Halo[] = [];
  private sparks: Spark[] = [];

  constructor(parent: Container) { this.parent = parent; }

  spawn(x: number, y: number, tint: number): void {
    this.pushHalo(x, y, 4, 28, tint, HALO_LIFE);
    this.pushHalo(x, y, 2, 18, 0xffffff, HALO_LIFE * 0.7);
    for (let i = 0; i < SPARK_COUNT; i++) {
      // Burst outward in all directions, biased slightly upward
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.6;
      const speed = 90 + Math.random() * 120;
      const size = 1.4 + Math.random() * 1.2;
      const gfx = new Graphics();
      // Diamond shard: warm core + tinted outer (forge ember)
      gfx.poly([0, -size * 1.6, size * 0.7, 0, 0, size * 1.6, -size * 0.7, 0])
        .fill({ color: SPARK_CORE, alpha: 1 });
      gfx.poly([0, -size * 2.4, size * 1.0, 0, 0, size * 2.4, -size * 1.0, 0])
        .stroke({ color: tint, width: 1, alpha: 0.7 });
      gfx.x = x;
      gfx.y = y;
      this.parent.addChild(gfx);
      this.sparks.push({
        gfx,
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: SPARK_LIFE * (0.6 + Math.random() * 0.6),
        maxLife: SPARK_LIFE,
        rot: Math.random() * Math.PI * 2,
        rotV: (Math.random() - 0.5) * 8,
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
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.life -= dt;
      s.x += s.vx * dtSec;
      s.y += s.vy * dtSec;
      s.vy += 360 * dtSec;        // gravity pulls embers back down
      s.vx *= 0.94;               // air drag
      s.rot += s.rotV * dtSec;
      s.gfx.x = s.x;
      s.gfx.y = s.y;
      s.gfx.rotation = s.rot;
      const t = Math.max(0, s.life / s.maxLife);
      // Ember dim: shrink + fade together
      s.gfx.alpha = t;
      s.gfx.scale.set(0.6 + t * 0.6);
      if (s.life <= 0) {
        if (s.gfx.parent) s.gfx.parent.removeChild(s.gfx);
        s.gfx.destroy();
        this.sparks.splice(i, 1);
      }
    }
  }

  clear(): void {
    for (const h of this.halos) {
      if (h.gfx.parent) h.gfx.parent.removeChild(h.gfx);
      h.gfx.destroy();
    }
    for (const s of this.sparks) {
      if (s.gfx.parent) s.gfx.parent.removeChild(s.gfx);
      s.gfx.destroy();
    }
    this.halos.length = 0;
    this.sparks.length = 0;
  }
}
