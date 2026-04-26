/**
 * VoidFogSystem.ts
 *
 * Renders black fog particles rising from IntGrid value 10 (void) tiles.
 * Conveys "something deep and dangerous below" without looking like an entrance.
 *
 * Particles: slow-rising dark wisps, slight horizontal drift, fade at top.
 */

import { Graphics, type Container } from 'pixi.js';
import { isVoid } from '@core/Physics';
import { GAME_WIDTH, GAME_HEIGHT } from '../Game';
import type { Camera } from '@core/Camera';

interface FogParticle {
  x: number;
  y: number;
  startY: number;
  speed: number;
  alpha: number;
  size: number;
  drift: number;
  life: number;
  maxLife: number;
}

const TILE = 16;
const P_COLOR = 0x000000;
const P_SPEED = 25; // slow rise
const P_MAX = 40;
const P_LIFE = 2000; // ms

export class VoidFogSystem {
  private particles: FogParticle[] = [];
  private gfx: Graphics | null = null;
  private entityLayer: Container;

  constructor(entityLayer: Container) {
    this.entityLayer = entityLayer;
  }

  update(dt: number, grid: number[][], camera: Camera): void {
    const dtSec = dt / 1000;

    // --- Particles ---
    if (!this.gfx) {
      this.gfx = new Graphics();
      this.entityLayer.addChild(this.gfx);
    }

    const viewL = camera.x;
    const viewT = camera.y;
    const viewR = viewL + GAME_WIDTH / camera.zoom;
    const viewB = viewT + GAME_HEIGHT / camera.zoom;

    const colL = Math.max(0, Math.floor(viewL / TILE));
    const colR = Math.min((grid[0]?.length ?? 1) - 1, Math.ceil(viewR / TILE));
    const rowT = Math.max(0, Math.floor(viewT / TILE));
    const rowB = Math.min(grid.length - 1, Math.ceil(viewB / TILE));

    // Spawn new particles from void tiles
    if (this.particles.length < P_MAX) {
      for (let row = rowT; row <= rowB; row++) {
        for (let col = colL; col <= colR; col++) {
          if ((grid[row]?.[col] ?? 0) !== 10) continue;
          if (Math.random() > 0.03) continue;
          if (this.particles.length >= P_MAX) break;

          const life = P_LIFE * (0.6 + Math.random() * 0.8);
          this.particles.push({
            x: col * TILE + Math.random() * TILE,
            y: row * TILE + Math.random() * 4, // near top of void tile
            startY: row * TILE,
            speed: P_SPEED * (0.5 + Math.random() * 1.0),
            alpha: 0.3 + Math.random() * 0.4,
            size: 3 + Math.random() * 6,
            drift: (Math.random() - 0.5) * 12,
            life,
            maxLife: life,
          });
        }
      }
    }

    // Update particles
    this.gfx.clear();
    let i = 0;
    while (i < this.particles.length) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles[i] = this.particles[this.particles.length - 1];
        this.particles.pop();
        continue;
      }

      // Rise upward + horizontal drift
      p.y -= p.speed * dtSec;
      p.x += p.drift * dtSec;

      // Fade based on life
      const lifeRatio = p.life / p.maxLife;
      // Fade in quickly, then fade out
      const fadeIn = Math.min(1, (1 - lifeRatio) * 5);
      const fadeOut = lifeRatio < 0.3 ? lifeRatio / 0.3 : 1;
      const alpha = p.alpha * fadeIn * fadeOut;

      // Grow slightly as rising
      const growFactor = 1 + (1 - lifeRatio) * 0.8;
      const size = p.size * growFactor;

      // Draw as soft circle
      this.gfx.circle(p.x, p.y, size).fill({ color: P_COLOR, alpha });

      i++;
    }
  }

  destroy(): void {
    this.particles = [];
    if (this.gfx) {
      this.gfx.destroy();
      this.gfx = null;
    }
  }
}
