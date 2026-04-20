import { Container, Graphics } from 'pixi.js';

/**
 * Water bubbles — trickling bubbles that rise from the player while submerged.
 * Scene calls emit(x, y, dt, submerged) each frame. Manager throttles spawn rate
 * and fades bubbles as they ascend.
 */

interface Bubble {
  gfx: Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  wiggleT: number;
}

const LIFE = 1200;
const SPAWN_INTERVAL = 180;
const COLOR = 0xbfe8f5;

export class WaterBubblesManager {
  private parent: Container;
  private bubbles: Bubble[] = [];
  // Per-entity timer keyed by caller. 'default' 은 기존 플레이어 단일 emitter 호환.
  private timers: Map<string, number> = new Map();

  constructor(parent: Container) { this.parent = parent; }

  emit(x: number, y: number, dt: number, submerged: boolean, key = 'default'): void {
    if (!submerged) {
      this.timers.set(key, 0);
      return;
    }
    let t = (this.timers.get(key) ?? 0) - dt;
    if (t > 0) {
      this.timers.set(key, t);
      return;
    }
    t = SPAWN_INTERVAL;
    this.timers.set(key, t);

    const gfx = new Graphics();
    const size = 1.5 + Math.random() * 2;
    gfx.circle(0, 0, size).stroke({ color: COLOR, width: 1, alpha: 0.9 });
    gfx.circle(0, 0, size * 0.4).fill({ color: 0xffffff, alpha: 0.6 });
    const ox = (Math.random() - 0.5) * 6;
    gfx.x = x + ox;
    gfx.y = y;
    this.parent.addChild(gfx);
    this.bubbles.push({
      gfx,
      x: gfx.x, y: gfx.y,
      vx: (Math.random() - 0.5) * 10,
      vy: -22 - Math.random() * 18,
      life: LIFE * (0.7 + Math.random() * 0.5),
      maxLife: LIFE,
      wiggleT: Math.random() * Math.PI * 2,
    });
  }

  update(dt: number): void {
    const dtSec = dt / 1000;
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      b.life -= dt;
      b.wiggleT += dtSec * 3.5;
      b.x += (b.vx + Math.sin(b.wiggleT) * 18) * dtSec;
      b.y += b.vy * dtSec;
      b.vy -= 10 * dtSec; // buoyancy: accelerate upward slowly
      b.gfx.x = b.x;
      b.gfx.y = b.y;
      const t = Math.max(0, b.life / b.maxLife);
      b.gfx.alpha = t;
      if (b.life <= 0) {
        if (b.gfx.parent) b.gfx.parent.removeChild(b.gfx);
        b.gfx.destroy();
        this.bubbles.splice(i, 1);
      }
    }
  }

  clear(): void {
    for (const b of this.bubbles) {
      if (b.gfx.parent) b.gfx.parent.removeChild(b.gfx);
      b.gfx.destroy();
    }
    this.bubbles.length = 0;
    this.timers.clear();
  }

  forgetKey(key: string): void {
    this.timers.delete(key);
  }
}
