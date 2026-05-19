/**
 * UpdraftSystem.ts
 *
 * Tile-based updraft channel renderer + physics.
 *
 * Visual = K-style (sandbox §13 demo K: Pillars × Speed) with full
 * channel takeover: the underlying LDtk sky-blue tile is HIDDEN by an
 * opaque fill rendered behind player. The channel becomes a sci-fi
 * conduit cut into the world.
 *
 * Layers (back → front):
 *   gfxBg  (entityLayer index 0, behind player)
 *     1. Opaque dark fill per updraft cell       — hides underlying tile
 *     2. Uniform inner cyan wash                 — channel always glowing
 *     3. Boundary edge gradient (2 stacked rects) — force-field edges
 *     4. Player aura (when on updraft)           — pulsing halo behind player
 *   gfxFg  (entityLayer end, in front of player)
 *     5. Boundary pillars (2px+1px, global pulse) — force-field bars
 *     6. Speed streaks (manga thrust)            — independent particles
 *     7. Horizontal electric arcs                — frequent jaggies
 *     8. Player hair streaks (when on updraft)   — wind in hair feedback
 *
 * Tile-friendly design:
 *   - Each grid cell decides its own boundary rendering from left/right
 *     neighbor checks. Any channel shape stitches seamlessly.
 *   - Global pulse value per frame → no spatial banding.
 *   - Arcs walk the row at spawn time to find channel bounds.
 *
 * Reference: game/docs/emergent-physics-sandbox.html#updraft (Demo K)
 */

import { Graphics, type Container } from 'pixi.js';
import { isInUpdraft, TILE_UPDRAFT, TILE_SIZE } from '@core/Physics';
import { GAME_WIDTH, GAME_HEIGHT } from '../Game';
import type { Camera } from '@core/Camera';
import type { Player } from '@entities/Player';

interface Streak {
  x: number;
  y: number;
  vy: number;
  len: number;
  alpha: number;
}

interface Arc {
  x0: number;
  x1: number;
  y: number;
  life: number;
  maxLife: number;
  jitter: number;
}

const TILE = TILE_SIZE;
const GRAVITY = 980; // must match Player.ts

// --- Physics (preserved: Victor 2026-05-15/17) ---
const UPDRAFT_FORCE = GRAVITY * 2.2 * 0.75;
const MAX_UPDRAFT_VY = -250 * 0.75;
const EXIT_BOUNCE_GRAVITY_MUL = 2.0;
const EXIT_BOUNCE_DURATION_MS = 200;

// --- Visual frequency (boosted 2026-05-20: 자주 보이도록) ---
const STREAK_MAX = 100;
const STREAK_SPAWN_CHANCE = 0.08;
const STREAK_SPEED_MIN = 300;
const STREAK_SPEED_RANGE = 220;
const STREAK_LEN_MIN = 8;
const STREAK_LEN_RANGE = 16;

const ARC_INTERVAL_MIN = 0.08;     // avg arc every ~0.17s (was 0.8s)
const ARC_INTERVAL_RANGE = 0.18;
const ARC_LIFE = 0.22;
const ARC_SEGMENTS = 5;
const ARC_JITTER_AMP = 3;

// --- Player feedback (on updraft) ---
const PLAYER_STREAK_PER_FRAME = 2;
const PLAYER_STREAK_SPEED_MIN = 450;
const PLAYER_STREAK_SPEED_RANGE = 200;
const PLAYER_HAIR_COUNT = 4;
const PLAYER_AURA_OUTER_R = 18;
const PLAYER_AURA_INNER_R = 11;

// --- Colors ---
const COL_DARK = 0x050810;            // tile suppression (opaque)
const COL_INNER_WASH = 0x66bbee;      // uniform channel glow
const COL_EDGE_WASH = 0x99ddff;       // boundary brightness
const COL_PILLAR_PRIMARY = 0xccf0ff;
const COL_PILLAR_SECONDARY = 0x78d2ff;
const COL_STREAK = 0xdcf5ff;
const COL_ARC = 0xeaf8ff;
const COL_AURA_OUTER = 0x66aadd;
const COL_AURA_INNER = 0xaaddff;

// --- Layout ---
const EDGE_WASH_OUTER = 8;
const EDGE_WASH_INNER = 4;
const PILLAR_PRIMARY_WIDTH = 2;
const PILLAR_SECONDARY_WIDTH = 1;

export class UpdraftSystem {
  private streaks: Streak[] = [];
  private arcs: Arc[] = [];
  private gfxBg: Graphics | null = null;
  private gfxFg: Graphics | null = null;
  private entityLayer: Container;
  private t = 0;
  private arcTimer = 0;

  // Exit bounce state (preserved).
  private wasInUpdraft = false;
  private exitBounceMs = 0;

  constructor(entityLayer: Container) {
    this.entityLayer = entityLayer;
  }

  update(dt: number, player: Player, grid: number[][], camera: Camera): void {
    const dtSec = dt / 1000;
    this.t += dtSec;

    // Compute once for both physics and render.
    const inUpdraft = isInUpdraft(
      player.x, player.y, player.width, player.height, grid,
    );

    // ============ PHYSICS ============
    if (player.fsm.currentState !== 'dash') {
      if (inUpdraft) {
        player.vy -= UPDRAFT_FORCE * dtSec;
        if (player.vy < MAX_UPDRAFT_VY) player.vy = MAX_UPDRAFT_VY;
      } else if (this.wasInUpdraft) {
        this.exitBounceMs = EXIT_BOUNCE_DURATION_MS;
      }
      if (!inUpdraft && this.exitBounceMs > 0) {
        player.vy -= GRAVITY * EXIT_BOUNCE_GRAVITY_MUL * dtSec;
        this.exitBounceMs -= dt;
      }
      this.wasInUpdraft = inUpdraft;
    }

    // ============ RENDER ============
    if (!this.gfxBg) {
      this.gfxBg = new Graphics();
      // Behind everything else in entityLayer (so player renders ON TOP of
      // the opaque tile-suppression fill, never hidden by it).
      this.entityLayer.addChildAt(this.gfxBg, 0);
      // Global 0.5 alpha so channel back/wash/edges read as a translucent
      // recess, not a solid wall (Victor 2026-05-20).
      this.gfxBg.alpha = 0.5;
    }
    if (!this.gfxFg) {
      this.gfxFg = new Graphics();
      // In front of entityLayer children — pillars/streaks/arcs pass over.
      this.entityLayer.addChild(this.gfxFg);
      // Global 0.5 alpha so pillars/streaks/arcs on top of player don't
      // obscure the character silhouette (Victor 2026-05-20).
      this.gfxFg.alpha = 0.5;
    }
    this.gfxBg.clear();
    this.gfxFg.clear();

    // camera.x / camera.y are the viewport CENTER in world coords (Game.ts:306).
    // Use renderX/renderY so look-ahead + shake offsets are tracked.
    const halfW = (GAME_WIDTH / camera.zoom) / 2;
    const halfH = (GAME_HEIGHT / camera.zoom) / 2;
    const viewL = camera.renderX - halfW;
    const viewT = camera.renderY - halfH;
    const viewR = camera.renderX + halfW;
    const viewB = camera.renderY + halfH;

    const colL = Math.max(0, Math.floor(viewL / TILE));
    const colR = Math.min((grid[0]?.length ?? 1) - 1, Math.ceil(viewR / TILE));
    const rowT = Math.max(0, Math.floor(viewT / TILE));
    const rowB = Math.min(grid.length - 1, Math.ceil(viewB / TILE));

    // Single global pulse for all pillars/aura this frame.
    const pulse = 0.85
      + Math.sin(this.t * 4) * 0.12
      + Math.sin(this.t * 11) * 0.08;
    // Subtle inner-wash breathing (uniform across all updraft cells).
    const innerWashAlpha = 0.14 + Math.sin(this.t * 3) * 0.04;

    // ---------- LOOP 1: Fill + edges (gfxBg + gfxFg pillars) ----------
    for (let row = rowT; row <= rowB; row++) {
      const gridRow = grid[row];
      if (!gridRow) continue;
      for (let col = colL; col <= colR; col++) {
        if (gridRow[col] !== TILE_UPDRAFT) continue;
        const cellX = col * TILE;
        const cellY = row * TILE;

        // A) Channel back fill — 0.5 alpha so parallax/world bg reads through
        //    as a "deep recess" into the structure. LDtk updraft tile is
        //    already suppressed in LdtkRenderer.isFluidHiddenTile, so this
        //    fill alone defines the channel's darkness without competing
        //    with the static tile graphic.
        this.gfxBg
          .rect(cellX, cellY, TILE, TILE)
          .fill({ color: COL_DARK, alpha: 0.5 });

        // B) Uniform inner wash — channel always has a soft cyan glow,
        //    even when no streaks/arcs are present.
        this.gfxBg
          .rect(cellX, cellY, TILE, TILE)
          .fill({ color: COL_INNER_WASH, alpha: innerWashAlpha });

        const leftIsUp = gridRow[col - 1] === TILE_UPDRAFT;
        const rightIsUp = gridRow[col + 1] === TILE_UPDRAFT;

        if (!leftIsUp) {
          this.gfxBg
            .rect(cellX, cellY, EDGE_WASH_OUTER, TILE)
            .fill({ color: COL_EDGE_WASH, alpha: 0.28 });
          this.gfxBg
            .rect(cellX, cellY, EDGE_WASH_INNER, TILE)
            .fill({ color: COL_EDGE_WASH, alpha: 0.22 });
          this.gfxFg
            .rect(cellX, cellY, PILLAR_PRIMARY_WIDTH, TILE)
            .fill({ color: COL_PILLAR_PRIMARY, alpha: pulse });
          this.gfxFg
            .rect(cellX + PILLAR_PRIMARY_WIDTH, cellY,
                  PILLAR_SECONDARY_WIDTH, TILE)
            .fill({ color: COL_PILLAR_SECONDARY, alpha: pulse * 0.5 });
        }
        if (!rightIsUp) {
          this.gfxBg
            .rect(cellX + TILE - EDGE_WASH_OUTER, cellY, EDGE_WASH_OUTER, TILE)
            .fill({ color: COL_EDGE_WASH, alpha: 0.28 });
          this.gfxBg
            .rect(cellX + TILE - EDGE_WASH_INNER, cellY, EDGE_WASH_INNER, TILE)
            .fill({ color: COL_EDGE_WASH, alpha: 0.22 });
          this.gfxFg
            .rect(cellX + TILE - PILLAR_PRIMARY_WIDTH, cellY,
                  PILLAR_PRIMARY_WIDTH, TILE)
            .fill({ color: COL_PILLAR_PRIMARY, alpha: pulse });
          this.gfxFg
            .rect(cellX + TILE - PILLAR_PRIMARY_WIDTH - PILLAR_SECONDARY_WIDTH,
                  cellY, PILLAR_SECONDARY_WIDTH, TILE)
            .fill({ color: COL_PILLAR_SECONDARY, alpha: pulse * 0.5 });
        }
      }
    }

    // ---------- LOOP 2: Streaks (manga thrust) ----------
    if (this.streaks.length < STREAK_MAX) {
      outer: for (let row = rowT; row <= rowB; row++) {
        const gridRow = grid[row];
        if (!gridRow) continue;
        for (let col = colL; col <= colR; col++) {
          if (gridRow[col] !== TILE_UPDRAFT) continue;
          if (Math.random() > STREAK_SPAWN_CHANCE) continue;
          if (this.streaks.length >= STREAK_MAX) break outer;
          this.streaks.push({
            x: col * TILE + Math.random() * TILE,
            y: row * TILE + TILE,
            vy: -(STREAK_SPEED_MIN + Math.random() * STREAK_SPEED_RANGE),
            len: STREAK_LEN_MIN + Math.random() * STREAK_LEN_RANGE,
            alpha: 0.6 + Math.random() * 0.4,
          });
        }
      }
    }

    // Player-area extra streaks (faster, denser around the player).
    if (inUpdraft && this.streaks.length < STREAK_MAX) {
      const cx = player.x + player.width / 2;
      const cy = player.y + player.height / 2;
      const spreadHalf = (player.width + 4) / 2;
      for (let i = 0; i < PLAYER_STREAK_PER_FRAME; i++) {
        if (this.streaks.length >= STREAK_MAX) break;
        this.streaks.push({
          x: cx + (Math.random() - 0.5) * 2 * spreadHalf,
          y: cy,
          vy: -(PLAYER_STREAK_SPEED_MIN + Math.random() * PLAYER_STREAK_SPEED_RANGE),
          len: 10 + Math.random() * 12,
          alpha: 0.85 + Math.random() * 0.15,
        });
      }
    }

    const aliveStreaks: Streak[] = [];
    for (const s of this.streaks) {
      s.y += s.vy * dtSec;
      const tCol = Math.floor(s.x / TILE);
      const tRow = Math.floor(s.y / TILE);
      const stillInUpdraft = (grid[tRow]?.[tCol] ?? 0) === TILE_UPDRAFT;
      if (!stillInUpdraft || s.y < viewT - 20) continue;
      this.gfxFg
        .moveTo(s.x, s.y)
        .lineTo(s.x, s.y + s.len)
        .stroke({ color: COL_STREAK, width: 1, alpha: s.alpha });
      aliveStreaks.push(s);
    }
    this.streaks = aliveStreaks;

    // ---------- LOOP 3: Horizontal arcs (more frequent) ----------
    this.arcTimer -= dtSec;
    if (this.arcTimer <= 0) {
      this.arcTimer = ARC_INTERVAL_MIN + Math.random() * ARC_INTERVAL_RANGE;
      const candidate = this.pickVisibleUpdraftCell(grid, colL, colR, rowT, rowB);
      if (candidate) {
        const { col, row } = candidate;
        const gridRow = grid[row];
        if (gridRow) {
          let lx = col;
          while (lx > 0 && gridRow[lx - 1] === TILE_UPDRAFT) lx--;
          let rx = col;
          const rowLen = gridRow.length;
          while (rx < rowLen - 1 && gridRow[rx + 1] === TILE_UPDRAFT) rx++;
          const x0 = lx * TILE + PILLAR_PRIMARY_WIDTH;
          const x1 = (rx + 1) * TILE - PILLAR_PRIMARY_WIDTH;
          if (x1 - x0 > 8) {
            this.arcs.push({
              x0, x1,
              y: row * TILE + Math.random() * TILE,
              life: ARC_LIFE,
              maxLife: ARC_LIFE,
              jitter: Math.random() * Math.PI * 2,
            });
          }
        }
      }
    }

    const aliveArcs: Arc[] = [];
    for (const a of this.arcs) {
      a.life -= dtSec;
      if (a.life <= 0) continue;
      const fade = a.life / a.maxLife;
      const alpha = fade * 0.95;
      let prevX = a.x0;
      let prevY = a.y;
      const span = a.x1 - a.x0;
      for (let i = 1; i <= ARC_SEGMENTS; i++) {
        const nx = a.x0 + span * (i / ARC_SEGMENTS);
        const ny = a.y + Math.sin(a.jitter + i * 1.7) * ARC_JITTER_AMP;
        this.gfxFg
          .moveTo(prevX, prevY)
          .lineTo(nx, ny)
          .stroke({ color: COL_ARC, width: 1, alpha });
        prevX = nx;
        prevY = ny;
      }
      aliveArcs.push(a);
    }
    this.arcs = aliveArcs;

    // ---------- Player feedback (when on updraft) ----------
    if (inUpdraft) {
      const cx = player.x + player.width / 2;
      const cy = player.y + player.height / 2;

      // Pulsing aura — behind player (gfxBg).
      this.gfxBg
        .circle(cx, cy, PLAYER_AURA_OUTER_R)
        .fill({ color: COL_AURA_OUTER, alpha: 0.18 * pulse });
      this.gfxBg
        .circle(cx, cy, PLAYER_AURA_INNER_R)
        .fill({ color: COL_AURA_INNER, alpha: 0.25 * pulse });

      // Hair streaks — short upward streaks above player's head (gfxFg).
      const headY = player.y - 1;
      const spread = (player.width - 2) / 2;
      for (let i = 0; i < PLAYER_HAIR_COUNT; i++) {
        const sx = cx + (Math.random() - 0.5) * 2 * spread;
        const len = 4 + Math.random() * 6;
        this.gfxFg
          .moveTo(sx, headY)
          .lineTo(sx, headY - len)
          .stroke({ color: COL_STREAK, width: 1, alpha: 0.75 });
      }
    }
  }

  /** Sample random visible cells (up to 12 attempts) for arc spawn site. */
  private pickVisibleUpdraftCell(
    grid: number[][],
    colL: number, colR: number, rowT: number, rowB: number,
  ): { col: number; row: number } | null {
    const colSpan = colR - colL + 1;
    const rowSpan = rowB - rowT + 1;
    if (colSpan <= 0 || rowSpan <= 0) return null;
    for (let attempt = 0; attempt < 12; attempt++) {
      const col = colL + Math.floor(Math.random() * colSpan);
      const row = rowT + Math.floor(Math.random() * rowSpan);
      if (grid[row]?.[col] === TILE_UPDRAFT) return { col, row };
    }
    return null;
  }

  /** Reset transient state (e.g., on room transition). */
  clear(): void {
    this.streaks = [];
    this.arcs = [];
    this.arcTimer = 0;
    if (this.gfxBg) this.gfxBg.clear();
    if (this.gfxFg) this.gfxFg.clear();
  }

  destroy(): void {
    if (this.gfxBg?.parent) this.gfxBg.parent.removeChild(this.gfxBg);
    if (this.gfxFg?.parent) this.gfxFg.parent.removeChild(this.gfxFg);
    this.gfxBg = null;
    this.gfxFg = null;
    this.streaks = [];
    this.arcs = [];
  }
}
