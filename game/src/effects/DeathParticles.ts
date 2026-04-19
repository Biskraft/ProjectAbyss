/**
 * DeathParticles.ts — Enemy death burst effect.
 *
 * Playtest 2026-04-17 (A11 / D4): enemy kills felt flat. This emitter adds
 * a multi-layer burst so kills punch harder:
 *   1. Expanding white ring flash (impact core)
 *   2. Fragment shards (stone-grey squares, physics fall)
 *   3. Flame embers (orange/yellow, rise then fade)
 *
 * All visuals render in world-space. No global timescale changes — kill
 * hitstop is handled in HitManager.checkHits() and is already entity-
 * friendly for coop (only the killed enemy + attacker vibrate).
 */

import { Container, Graphics } from 'pixi.js';

type P = {
  gfx: Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  life: number;
  maxLife: number;
  fade: 'linear' | 'late';
  rotSpeed: number;
};

export class DeathParticleManager {
  private parent: Container;
  private particles: P[] = [];

  constructor(parent: Container) {
    this.parent = parent;
  }

  /**
   * Spawn a death burst at world-space (x, y). `heavy` kills (bosses, big
   * enemies) get a larger burst.
   */
  spawn(x: number, y: number, heavy = false): void {
    const shardCount = heavy ? 14 : 8;
    const emberCount = heavy ? 10 : 6;
    const ringSize = heavy ? 22 : 14;

    // 1. Impact ring flash
    const ring = new Graphics();
    ring.circle(0, 0, 6).stroke({ color: 0xffffff, width: 2, alpha: 0.9 });
    ring.x = x;
    ring.y = y;
    this.parent.addChild(ring);
    this.particles.push({
      gfx: ring, x, y, vx: 0, vy: 0, gravity: 0,
      life: 180, maxLife: 180, fade: 'linear', rotSpeed: 0,
    });
    // Track ring growth via a stashed size on life ratio
    (ring as any)._ringMaxR = ringSize;

    // 2. Shards (stone fragments)
    for (let i = 0; i < shardCount; i++) {
      const angle = (i / shardCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const speed = 80 + Math.random() * 120;
      const g = new Graphics();
      const sz = 2 + Math.floor(Math.random() * 2);
      g.rect(-sz / 2, -sz / 2, sz, sz).fill(0x8a8a94);
      g.rect(-sz / 2, -sz / 2, sz, sz).stroke({ color: 0x2a2a30, width: 1 });
      g.x = x;
      g.y = y;
      g.rotation = Math.random() * Math.PI * 2;
      this.parent.addChild(g);
      this.particles.push({
        gfx: g, x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        gravity: 280,
        life: 500 + Math.random() * 200,
        maxLife: 700,
        fade: 'late',
        rotSpeed: (Math.random() - 0.5) * 10,
      });
    }

    // 3. Flame embers (rising)
    for (let i = 0; i < emberCount; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
      const speed = 40 + Math.random() * 70;
      const g = new Graphics();
      const color = Math.random() < 0.5 ? 0xffaa33 : 0xffd255;
      g.circle(0, 0, 1.5).fill(color);
      g.x = x;
      g.y = y;
      this.parent.addChild(g);
      this.particles.push({
        gfx: g, x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: -60, // negative = rise
        life: 400 + Math.random() * 300,
        maxLife: 600,
        fade: 'late',
        rotSpeed: 0,
      });
    }
  }

  update(dt: number): void {
    const dtSec = dt / 1000;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;

      p.x += p.vx * dtSec;
      p.y += p.vy * dtSec;
      p.vy += p.gravity * dtSec;
      p.vx *= 0.96;

      p.gfx.x = p.x;
      p.gfx.y = p.y;
      if (p.rotSpeed !== 0) p.gfx.rotation += p.rotSpeed * dtSec;

      const k = Math.max(0, p.life / p.maxLife);

      // Ring grows
      const ringMaxR = (p.gfx as any)._ringMaxR as number | undefined;
      if (ringMaxR) {
        const scale = 1 + (1 - k) * (ringMaxR / 6);
        p.gfx.scale.set(scale);
      }

      if (p.fade === 'linear') {
        p.gfx.alpha = k;
      } else {
        p.gfx.alpha = k < 0.4 ? k / 0.4 : 1;
      }

      if (p.life <= 0) {
        if (p.gfx.parent) p.gfx.parent.removeChild(p.gfx);
        p.gfx.destroy();
        this.particles.splice(i, 1);
      }
    }
  }

  clear(): void {
    for (const p of this.particles) {
      if (p.gfx.parent) p.gfx.parent.removeChild(p.gfx);
      p.gfx.destroy();
    }
    this.particles = [];
  }
}
