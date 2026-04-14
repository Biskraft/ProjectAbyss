/**
 * UpdraftSystem.ts
 *
 * Shared updraft physics + particle rendering, extracted from both
 * LdtkWorldScene and ItemWorldScene (previously duplicated ~92 lines each).
 */

import { Graphics, type Container } from 'pixi.js';
import { isInUpdraft } from '@core/Physics';
import { GAME_WIDTH, GAME_HEIGHT } from '../Game';
import type { Camera } from '@core/Camera';
import type { Player } from '@entities/Player';

interface UpdraftParticle {
  x: number;
  y: number;
  speed: number;
  alpha: number;
  len: number;
  wobble: number;
}

const TILE = 16;
const UPDRAFT_FORCE = 980 * 2.2;
const MAX_UPDRAFT_VY = -250;
const P_COLOR = 0x66ddff;
const P_SPEED = 140;
const P_MAX = 50;

export class UpdraftSystem {
  private particles: UpdraftParticle[] = [];
  private gfx: Graphics | null = null;
  private entityLayer: Container;

  constructor(entityLayer: Container) {
    this.entityLayer = entityLayer;
  }

  update(dt: number, player: Player, grid: number[][], camera: Camera): void {
    const dtSec = dt / 1000;

    // --- Physics ---
    if (player.fsm.currentState !== 'dash') {
      const inUpdraft = isInUpdraft(
        player.x, player.y, player.width, player.height, grid,
      );
      if (inUpdraft) {
        player.vy -= UPDRAFT_FORCE * dtSec;
        if (player.vy < MAX_UPDRAFT_VY) player.vy = MAX_UPDRAFT_VY;
      }
    }

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

    // Spawn new particles from updraft tiles
    if (this.particles.length < P_MAX) {
      for (let row = rowT; row <= rowB; row++) {
        for (let col = colL; col <= colR; col++) {
          if ((grid[row]?.[col] ?? 0) !== 4) continue;
          if (Math.random() > 0.05) continue;
          if (this.particles.length >= P_MAX) break;

          this.particles.push({
            x: col * TILE + Math.random() * TILE,
            y: row * TILE + TILE,
            speed: P_SPEED * (0.6 + Math.random() * 0.8),
            alpha: 0.3 + Math.random() * 0.5,
            len: 2 + Math.random() * 3,
            wobble: Math.random() * Math.PI * 2,
          });
        }
        if (this.particles.length >= P_MAX) break;
      }
    }

    // Update + draw particles
    this.gfx.clear();
    const alive: UpdraftParticle[] = [];

    for (const p of this.particles) {
      p.y -= p.speed * dtSec;
      const wx = p.x + Math.sin(p.y * 0.06 + p.wobble) * 1.5;

      const tCol = Math.floor(p.x / TILE);
      const tRow = Math.floor(p.y / TILE);
      const stillInUpdraft = (grid[tRow]?.[tCol] ?? 0) === 4;

      if (!stillInUpdraft || p.y < viewT - 20) continue;

      const rowInTile = (p.y % TILE) / TILE;
      let alpha = p.alpha;
      if (rowInTile < 0.2) alpha *= rowInTile / 0.2;
      if (rowInTile > 0.8) alpha *= (1 - rowInTile) / 0.2;

      this.gfx
        .moveTo(wx, p.y)
        .lineTo(wx, p.y - p.len)
        .stroke({ color: P_COLOR, width: 1, alpha });

      alive.push(p);
    }

    this.particles = alive;
  }

  /** Reset particles (e.g., on room transition). */
  clear(): void {
    this.particles = [];
    if (this.gfx) this.gfx.clear();
  }

  destroy(): void {
    if (this.gfx?.parent) this.gfx.parent.removeChild(this.gfx);
    this.gfx = null;
    this.particles = [];
  }
}
