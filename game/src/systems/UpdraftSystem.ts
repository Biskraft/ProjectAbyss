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
const GRAVITY = 980; // must match Player.ts
// 75 % strength (Victor 2026-05-15). Force AND max upward velocity both
// reduced so the rise feels lighter without changing visual particles.
const UPDRAFT_FORCE = GRAVITY * 2.2 * 0.75;
const MAX_UPDRAFT_VY = -250 * 0.75;
// Exit bounce (Victor 2026-05-17): updraft 를 빠져나가는 순간부터 짧게 2×중력의
// 상승 가속을 더 가해 플레이어를 *위로 튕겨낸다*. 0.2s 동안 누적해 약 +390 px/s
// 의 추가 vy → 약 8타일 부스트 점프 (2.5→2.0 으로 완화, 2026-05-17).
const EXIT_BOUNCE_GRAVITY_MUL = 2.0;
const EXIT_BOUNCE_DURATION_MS = 200;
const P_COLOR = 0x66ddff;
const P_SPEED = 140;
const P_MAX = 50;

export class UpdraftSystem {
  private particles: UpdraftParticle[] = [];
  private gfx: Graphics | null = null;
  private entityLayer: Container;

  // Exit bounce state. `wasInUpdraft` 로 false→true 트랜지션을 감지해
  // exitBounceMs 를 채우고, 0 이 될 때까지 매 프레임 2.5×중력 상승 가속 추가.
  private wasInUpdraft = false;
  private exitBounceMs = 0;

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
      } else if (this.wasInUpdraft) {
        // Just exited — fire the bounce window.
        this.exitBounceMs = EXIT_BOUNCE_DURATION_MS;
      }
      if (!inUpdraft && this.exitBounceMs > 0) {
        player.vy -= GRAVITY * EXIT_BOUNCE_GRAVITY_MUL * dtSec;
        this.exitBounceMs -= dt;
      }
      this.wasInUpdraft = inUpdraft;
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
