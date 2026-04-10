/**
 * Updraft.ts — Environmental wind zone that pushes the player upward.
 *
 * LDtk entity: Updraft (resizable area)
 * Fields:
 *   - strength: Int (1=weak, 2=medium, 3=strong)
 *
 * Physics: Adds upward force to player velocity each frame while overlapping.
 * Visual: Vertical particle lines rising within the zone.
 *
 * Reference: Celeste Ch.4 wind (low-res particles) + Rayman source objects
 */

import { Container, Graphics } from 'pixi.js';

const GRAVITY = 980; // must match Player.ts

// Force multipliers relative to gravity
const STRENGTH_FORCE: Record<number, number> = {
  1: GRAVITY * 0.6,   // weak: slows fall
  2: GRAVITY * 1.2,   // medium: hover / slow rise
  3: GRAVITY * 2.2,   // strong: rapid ascent
};

const MAX_UPDRAFT_VY: Record<number, number> = {
  1: -60,    // weak: barely floats
  2: -120,   // medium: gentle rise
  3: -250,   // strong: rapid rise
};

// Particle config per strength
const PARTICLE_COUNT: Record<number, number> = { 1: 12, 2: 20, 3: 35 };
const PARTICLE_SPEED: Record<number, number> = { 1: 40, 2: 80, 3: 140 };
const PARTICLE_COLOR: Record<number, number> = {
  1: 0xaabbcc,  // pale blue-gray
  2: 0x88bbee,  // light blue
  3: 0x66ddff,  // bright cyan
};

interface Particle {
  x: number;
  y: number;
  speed: number;
  alpha: number;
  length: number;
  wobbleOffset: number;
}

export class Updraft {
  container: Container;
  x: number;
  y: number;
  width: number;
  height: number;
  strength: number;

  private force: number;
  private maxVy: number;

  // Particles
  private particles: Particle[] = [];
  private particleGfx: Graphics;
  private pColor: number;
  private pSpeed: number;

  // Debug zone visual
  private zoneGfx: Graphics;

  constructor(x: number, y: number, width: number, height: number, strength = 2) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.strength = Math.max(1, Math.min(3, strength));

    this.force = STRENGTH_FORCE[this.strength] ?? STRENGTH_FORCE[2];
    this.maxVy = MAX_UPDRAFT_VY[this.strength] ?? MAX_UPDRAFT_VY[2];
    this.pColor = PARTICLE_COLOR[this.strength] ?? PARTICLE_COLOR[2];
    this.pSpeed = PARTICLE_SPEED[this.strength] ?? PARTICLE_SPEED[2];

    this.container = new Container();
    this.container.x = x;
    this.container.y = y;

    // Subtle zone outline (barely visible in-game)
    this.zoneGfx = new Graphics();
    this.zoneGfx.rect(0, 0, width, height).fill({ color: this.pColor, alpha: 0.03 });
    this.container.addChild(this.zoneGfx);

    // Particle layer
    this.particleGfx = new Graphics();
    this.container.addChild(this.particleGfx);

    // Initialize particles
    const count = PARTICLE_COUNT[this.strength] ?? 20;
    for (let i = 0; i < count; i++) {
      this.particles.push(this.spawnParticle(true));
    }
  }

  private spawnParticle(randomY: boolean): Particle {
    return {
      x: Math.random() * this.width,
      y: randomY ? Math.random() * this.height : this.height + Math.random() * 8,
      speed: this.pSpeed * (0.7 + Math.random() * 0.6),
      alpha: 0.3 + Math.random() * 0.5,
      length: 2 + Math.random() * 3,
      wobbleOffset: Math.random() * Math.PI * 2,
    };
  }

  /** Check if a rectangle overlaps this updraft zone (world coordinates) */
  overlaps(px: number, py: number, pw: number, ph: number): boolean {
    return (
      px + pw > this.x &&
      px < this.x + this.width &&
      py + ph > this.y &&
      py < this.y + this.height
    );
  }

  /** Get the upward force to apply to the player */
  getForce(): number {
    return this.force;
  }

  /** Get the max upward velocity clamp */
  getMaxVy(): number {
    return this.maxVy;
  }

  update(dt: number): void {
    const dtSec = dt / 1000;

    // Update particles
    this.particleGfx.clear();

    for (const p of this.particles) {
      // Move upward
      p.y -= p.speed * dtSec;

      // Wobble
      const wobble = Math.sin((p.y * 0.05) + p.wobbleOffset) * 1.5;

      // Draw particle line
      const drawX = p.x + wobble;
      const drawY = p.y;

      // Fade based on position (fade in at bottom, fade out at top)
      const normalizedY = 1 - (p.y / this.height); // 0 at bottom, 1 at top
      let alpha = p.alpha;
      if (normalizedY < 0.15) alpha *= normalizedY / 0.15;      // fade in
      if (normalizedY > 0.85) alpha *= (1 - normalizedY) / 0.15; // fade out

      if (alpha > 0.02 && drawY > 0 && drawY < this.height) {
        this.particleGfx
          .moveTo(drawX, drawY)
          .lineTo(drawX, drawY - p.length)
          .stroke({ color: this.pColor, width: 1, alpha });
      }

      // Recycle at top
      if (p.y < -p.length) {
        Object.assign(p, this.spawnParticle(false));
      }
    }
  }

  destroy(): void {
    if (this.container.parent) this.container.parent.removeChild(this.container);
    this.container.destroy({ children: true });
  }
}
