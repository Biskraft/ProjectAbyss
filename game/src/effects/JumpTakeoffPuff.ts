import { Container, Graphics } from 'pixi.js';

/**
 * Jump takeoff puff — small burst of dust kicked up at the feet the instant
 * a grounded jump begins. Lighter than landing dust — 3 puffs, symmetric.
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

const LIFE = 220;
const COLOR = 0xd6c496; // slightly paler than landing dust

export class JumpTakeoffPuffManager {
  private parent: Container;
  private puffs: Puff[] = [];

  constructor(parent: Container) { this.parent = parent; }

  spawn(footX: number, footY: number): void {
    for (let i = 0; i < 3; i++) {
      const side = i === 0 ? 0 : (i === 1 ? -1 : 1);
      const speed = 30 + Math.random() * 30;
      const vx = side * speed + (Math.random() - 0.5) * 10;
      const vy = -15 - Math.random() * 20;
      const radius = 2 + Math.random() * 1.3;

      const gfx = new Graphics();
      gfx.circle(0, 0, radius).fill({ color: COLOR, alpha: 0.65 });
      gfx.x = footX + side * 4 + (Math.random() - 0.5) * 2;
      gfx.y = footY - 1;
      this.parent.addChild(gfx);
      this.puffs.push({
        gfx, x: gfx.x, y: gfx.y, vx, vy,
        life: LIFE * (0.8 + Math.random() * 0.4), maxLife: LIFE,
      });
    }
  }

  update(dt: number): void {
    const dtSec = dt / 1000;
    for (let i = this.puffs.length - 1; i >= 0; i--) {
      const p = this.puffs[i];
      p.life -= dt;
      p.x += p.vx * dtSec; p.y += p.vy * dtSec;
      p.vx *= 0.90; p.vy = p.vy * 0.92 + 40 * dtSec;
      p.gfx.x = p.x; p.gfx.y = p.y;
      const t = Math.max(0, p.life / p.maxLife);
      p.gfx.alpha = t * 0.7;
      p.gfx.scale.set(1 + (1 - t) * 0.4);
      if (p.life <= 0) {
        if (p.gfx.parent) p.gfx.parent.removeChild(p.gfx);
        this.puffs.splice(i, 1);
      }
    }
  }

  clear(): void {
    for (const p of this.puffs) if (p.gfx.parent) p.gfx.parent.removeChild(p.gfx);
    this.puffs.length = 0;
  }
}
