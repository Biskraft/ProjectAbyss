import { Container, Graphics } from 'pixi.js';

/**
 * Wall-jump kick dust — radial puff burst at the point of contact with the
 * wall, biased away from the wall toward the kick direction.
 *
 * Spawned on the frame a wall jump fires; scene provides the wall-side
 * position (the wall surface the player kicked off) and kick direction.
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

const LIFE = 300;
const COUNT = 7;
const COLOR = 0xc8b48a;

export class WallJumpDustManager {
  private parent: Container;
  private puffs: Puff[] = [];

  constructor(parent: Container) {
    this.parent = parent;
  }

  /**
   * Spawn the kick-off dust at (wallX, wallY).
   *
   * @param wallX world X of the wall surface touching the player
   * @param wallY world Y of the kick point (approx. player hip)
   * @param kickDir +1 = kicked to the right, -1 = kicked to the left
   */
  spawn(wallX: number, wallY: number, kickDir: number): void {
    for (let i = 0; i < COUNT; i++) {
      // Fan biased toward kickDir, half-plane facing outward from wall
      const spread = (i / (COUNT - 1)) - 0.5;      // -0.5 .. +0.5
      const angle = spread * 1.4;                   // ±0.7 rad fan
      const speed = 90 + Math.random() * 80;

      const vx = kickDir * Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed - 20;      // slight upward bias

      const radius = 2.2 + Math.random() * 2;
      const gfx = new Graphics();
      gfx.circle(0, 0, radius).fill({ color: COLOR, alpha: 0.75 });
      gfx.x = wallX + (Math.random() - 0.5) * 1.5;
      gfx.y = wallY + (Math.random() - 0.5) * 4;
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
      p.vx *= 0.90;
      p.vy = p.vy * 0.93 + 70 * dtSec; // settle with gravity tint
      p.gfx.x = p.x;
      p.gfx.y = p.y;

      const t = Math.max(0, p.life / p.maxLife);
      p.gfx.alpha = t * 0.8;
      p.gfx.scale.set(1 + (1 - t) * 0.6);

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
