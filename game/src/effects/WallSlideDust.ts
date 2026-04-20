import { Container, Graphics } from 'pixi.js';

/**
 * Wall slide dust — continuous trickle of small particles streaming down the
 * wall while the player is wall-sliding. Scene calls emit() every frame while
 * the slide is active; the manager throttles actual spawns internally.
 */

interface Particle {
  gfx: Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

const LIFE = 260;
const SPAWN_INTERVAL = 55; // ms — ~18 particles/sec
const COLOR = 0xc8b48a;

export class WallSlideDustManager {
  private parent: Container;
  private parts: Particle[] = [];
  private emitTimer = 0;

  constructor(parent: Container) { this.parent = parent; }

  /**
   * Call each frame while the player is wall-sliding.
   * @param wallX world X of the wall contact surface
   * @param hipY world Y (roughly the player's hip) where particles originate
   * @param kickOutDir +1 if wall is on left (particles fly right), -1 otherwise
   */
  emit(wallX: number, hipY: number, kickOutDir: number, dt: number): void {
    this.emitTimer -= dt;
    if (this.emitTimer > 0) return;
    this.emitTimer = SPAWN_INTERVAL;

    const gfx = new Graphics();
    const radius = 1.5 + Math.random() * 1.2;
    gfx.circle(0, 0, radius).fill({ color: COLOR, alpha: 0.75 });
    gfx.x = wallX + kickOutDir * 0.5 + (Math.random() - 0.5) * 1.5;
    gfx.y = hipY + (Math.random() - 0.5) * 6;
    this.parent.addChild(gfx);

    this.parts.push({
      gfx, x: gfx.x, y: gfx.y,
      vx: kickOutDir * (10 + Math.random() * 20),
      vy: 20 + Math.random() * 30, // drift downward — slide direction
      life: LIFE * (0.75 + Math.random() * 0.5), maxLife: LIFE,
    });
  }

  update(dt: number): void {
    const dtSec = dt / 1000;
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life -= dt;
      p.x += p.vx * dtSec; p.y += p.vy * dtSec;
      p.vx *= 0.94; p.vy = p.vy * 0.95 + 60 * dtSec;
      p.gfx.x = p.x; p.gfx.y = p.y;
      const t = Math.max(0, p.life / p.maxLife);
      p.gfx.alpha = t * 0.8;
      if (p.life <= 0) {
        if (p.gfx.parent) p.gfx.parent.removeChild(p.gfx);
        this.parts.splice(i, 1);
      }
    }
  }

  clear(): void {
    for (const p of this.parts) if (p.gfx.parent) p.gfx.parent.removeChild(p.gfx);
    this.parts.length = 0;
    this.emitTimer = 0;
  }
}
