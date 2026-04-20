import { Container, Graphics } from 'pixi.js';

/**
 * Dash boost puff — a quick fan-shaped burst of dust behind the player at
 * the moment a dash starts. Fired opposite to the dash direction so it reads
 * as "kicked off".
 */

interface Puff {
  gfx: Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

const LIFE = 260;     // ms
const COUNT = 6;
const COLOR = 0xc8b48a; // sandy (match landing dust)

export class DashBoostPuffManager {
  private parent: Container;
  private puffs: Puff[] = [];

  constructor(parent: Container) {
    this.parent = parent;
  }

  /**
   * Spawn a dash boost puff at the player's foot.
   * @param footX foot center X
   * @param footY foot Y (bottom edge)
   * @param dashDir +1 / -1 dash direction; puffs spray opposite.
   */
  spawn(footX: number, footY: number, dashDir: number): void {
    const backDir = -dashDir;
    for (let i = 0; i < COUNT; i++) {
      const spread = (i / (COUNT - 1)) - 0.5; // -0.5 .. +0.5
      const angle = spread * 0.9;              // ±0.45 rad fan
      const speed = 110 + Math.random() * 70;
      const vx = backDir * Math.cos(angle) * speed;
      const vy = -Math.abs(Math.sin(angle)) * speed - 15;

      const radius = 2.2 + Math.random() * 1.8;
      const gfx = new Graphics();
      gfx.circle(0, 0, radius).fill({ color: COLOR, alpha: 0.75 });
      gfx.x = footX + backDir * 2 + (Math.random() - 0.5) * 2;
      gfx.y = footY - 1 + (Math.random() - 0.5) * 2;
      this.parent.addChild(gfx);

      this.puffs.push({
        gfx, x: gfx.x, y: gfx.y, vx, vy,
        life: LIFE * (0.75 + Math.random() * 0.5),
        maxLife: LIFE,
      });
    }
  }

  update(dt: number): void {
    const dtSec = dt / 1000;
    for (let i = this.puffs.length - 1; i >= 0; i--) {
      const p = this.puffs[i];
      p.life -= dt;
      p.x += p.vx * dtSec;
      p.y += p.vy * dtSec;
      p.vx *= 0.88;
      p.vy = p.vy * 0.92 + 50 * dtSec; // slight settle
      p.gfx.x = p.x;
      p.gfx.y = p.y;

      const t = Math.max(0, p.life / p.maxLife);
      p.gfx.alpha = t * 0.8;
      p.gfx.scale.set(1 + (1 - t) * 0.7);

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
