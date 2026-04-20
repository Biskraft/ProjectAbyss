import { Container, Graphics } from 'pixi.js';

/**
 * Hit blood spray — deep-crimson shard particles sprayed in the knockback
 * direction when the player takes damage. Distinct from enemy-hit sparks
 * (white/yellow) to give clear "you got hit" feedback.
 */

interface Shard {
  gfx: Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

const LIFE = 340;
const COUNT = 7;
const COLOR_DEEP = 0x8b1a1a;
const COLOR_BRIGHT = 0xd94d4d;

export class HitBloodSprayManager {
  private parent: Container;
  private shards: Shard[] = [];

  constructor(parent: Container) { this.parent = parent; }

  spawn(x: number, y: number, dirX: number): void {
    for (let i = 0; i < COUNT; i++) {
      // Fan biased toward knockback direction
      const baseAngle = dirX >= 0 ? 0 : Math.PI;
      const spread = (Math.random() - 0.5) * 1.6;
      const angle = baseAngle + spread;
      const speed = 110 + Math.random() * 120;

      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed - 40; // upward bias

      const size = 2 + Math.random() * 2;
      const gfx = new Graphics();
      gfx.circle(0, 0, size).fill({ color: COLOR_DEEP, alpha: 1 });
      gfx.circle(0, 0, size * 0.55).fill({ color: COLOR_BRIGHT, alpha: 1 });
      gfx.x = x;
      gfx.y = y;
      this.parent.addChild(gfx);

      this.shards.push({
        gfx, x, y, vx, vy,
        life: LIFE * (0.7 + Math.random() * 0.6),
        maxLife: LIFE,
      });
    }
  }

  update(dt: number): void {
    const dtSec = dt / 1000;
    for (let i = this.shards.length - 1; i >= 0; i--) {
      const s = this.shards[i];
      s.life -= dt;
      s.x += s.vx * dtSec;
      s.y += s.vy * dtSec;
      s.vx *= 0.94;
      s.vy = s.vy * 0.95 + 240 * dtSec; // gravity
      s.gfx.x = s.x;
      s.gfx.y = s.y;
      const t = Math.max(0, s.life / s.maxLife);
      s.gfx.alpha = t;
      s.gfx.scale.set(0.6 + t * 0.6);
      if (s.life <= 0) {
        if (s.gfx.parent) s.gfx.parent.removeChild(s.gfx);
        s.gfx.destroy();
        this.shards.splice(i, 1);
      }
    }
  }

  clear(): void {
    for (const s of this.shards) {
      if (s.gfx.parent) s.gfx.parent.removeChild(s.gfx);
      s.gfx.destroy();
    }
    this.shards.length = 0;
  }
}
