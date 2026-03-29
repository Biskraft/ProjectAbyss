/**
 * FloorCollapse.ts
 *
 * 8-phase floor collapse sequence for Item World entry.
 *
 * Timeline (~3s):
 *   1. impact         0~100ms    Hitstop + white flash + anvil sparks
 *   2. rumble       100~500ms    Cracks spread outward, mild shake
 *   3. warning      500~800ms    Cracks blink faster, shake intensifies, tiles tint red
 *   4. collapse_outer 800~1200ms Outer rings fall + debris
 *   5. collapse_inner 1200~1600ms Inner rings fall, shake peak, dust rises
 *   6. pause        1600~1900ms  Silence — only preserved tiles remain, abyss visible
 *   7. anvil_fall   1900~2400ms  Preserved tiles + anvil drop, player freefalls
 *   8. fade_out     2400~3000ms  Screen fades to black → scene transition
 *
 * Design ref: Prototype_ItemWorldEntry_FloorCollapse.md
 */

import { Container, Graphics } from 'pixi.js';
import type { Rarity } from '@data/weapons';

const TILE_SIZE = 16;

// Phase boundaries (ms from start)
const T_IMPACT_END = 100;
const T_RUMBLE_END = 500;
const T_WARNING_END = 800;
const T_OUTER_END = 1200;
const T_INNER_END = 1600;
// pause phase removed — preserved tiles collapse immediately after inner
const T_ANVIL_FALL_END = 2800; // 1.2s for player to fall off screen
const T_FADE_END = 3400;

const RING_DELAY = 60; // ms between each ring collapse

/** Horizontal collapse radius by rarity (tiles from center). */
const COLLAPSE_RADIUS_X: Record<Rarity, number> = {
  normal: 3,
  magic: 4,
  rare: 5,
  legendary: 6,
  ancient: 12,
};

/** Camera shake intensity by rarity. */
const SHAKE_INTENSITY: Record<Rarity, number> = {
  normal: 2,
  magic: 3,
  rare: 4,
  legendary: 6,
  ancient: 10,
};

export type CollapsePhase =
  | 'idle'
  | 'impact'
  | 'rumble'
  | 'warning'
  | 'collapse_outer'
  | 'collapse_inner'
  | 'anvil_fall'
  | 'fade_out'
  | 'done';

interface Debris {
  gfx: Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

export class FloorCollapse {
  readonly container: Container;

  phase: CollapsePhase = 'idle';
  private timer = 0;

  private anvilCol: number;
  private anvilRow: number;
  private radiusX: number; // horizontal (rarity-based)
  private radiusY: number; // vertical (full depth)
  private rarity: Rarity;
  private roomData: number[][];
  private savedTiles: Map<string, number> = new Map();
  /** Tiles in the preserved (anvil) area — collapsed in phase 7. */
  private preservedTiles: Map<string, number> = new Map();

  // Ring collapse state (used across phases 4-5)
  // "ring" = Chebyshev distance, but clamped to radiusX horizontally
  private maxRing: number;
  private currentRing = 0;
  private ringTimer = 0;
  private outerRingCount: number;

  // Visual layers
  private crackOverlay: Graphics;
  private tintOverlay: Graphics;
  private fadeOverlay: Graphics;
  private debrisList: Debris[] = [];

  // Callbacks (wired by scene)
  onShake: ((intensity: number) => void) | null = null;
  onHitstop: ((frames: number) => void) | null = null;
  onScreenFlash: ((color: number, intensity: number) => void) | null = null;
  onTilesRemoved: (() => void) | null = null;

  constructor(
    anvilWorldX: number,
    anvilWorldY: number,
    rarity: Rarity,
    roomData: number[][],
  ) {
    this.anvilCol = Math.floor(anvilWorldX / TILE_SIZE);
    this.anvilRow = Math.floor(anvilWorldY / TILE_SIZE);
    this.rarity = rarity;
    this.radiusX = COLLAPSE_RADIUS_X[rarity];
    this.radiusY = roomData.length; // full depth to bottom
    this.roomData = roomData;
    this.maxRing = Math.max(this.radiusX, this.radiusY);
    this.outerRingCount = Math.ceil(this.maxRing / 2);

    this.container = new Container();
    this.crackOverlay = new Graphics();
    this.tintOverlay = new Graphics();
    this.fadeOverlay = new Graphics();
    this.container.addChild(this.crackOverlay);
    this.container.addChild(this.tintOverlay);
    this.container.addChild(this.fadeOverlay);
    this.fadeOverlay.alpha = 0;
  }

  /** Set of "col,row" keys for all tiles that have been collapsed so far. */
  get collapsedPositions(): Set<string> {
    const set = new Set<string>();
    for (const key of this.savedTiles.keys()) {
      const [col, row] = key.split(',').map(Number);
      if (this.roomData[row]?.[col] === 0) set.add(key);
    }
    for (const key of this.preservedTiles.keys()) {
      const [col, row] = key.split(',').map(Number);
      if (this.roomData[row]?.[col] === 0) set.add(key);
    }
    return set;
  }

  get isDone(): boolean {
    return this.phase === 'done';
  }

  /** Should the scene transition? True once fade-out completes. */
  get shouldTransition(): boolean {
    return this.phase === 'done';
  }

  start(): void {
    this.phase = 'impact';
    this.timer = 0;

    this.saveTilesInRadius();
    this.savePreservedTiles();

    // Phase 1: immediate feedback
    this.onHitstop?.(8);
    this.onScreenFlash?.(0xffffff, 0.6);
  }

  update(dt: number): void {
    if (this.phase === 'idle' || this.phase === 'done') {
      this.updateDebris(dt);
      return;
    }

    this.timer += dt;
    const t = this.timer;
    const shake = SHAKE_INTENSITY[this.rarity];

    // -------------------------------------------------------
    // Phase 1: impact (0 ~ 100ms)
    // -------------------------------------------------------
    if (this.phase === 'impact') {
      if (t >= T_IMPACT_END) {
        this.phase = 'rumble';
        this.drawCracksProgressive(0);
      }
    }

    // -------------------------------------------------------
    // Phase 2: rumble (100 ~ 500ms)
    // Cracks spread from center outward
    // -------------------------------------------------------
    else if (this.phase === 'rumble') {
      const progress = (t - T_IMPACT_END) / (T_RUMBLE_END - T_IMPACT_END);
      this.onShake?.(shake * 0.3 * progress);
      this.drawCracksProgressive(progress);

      if (t >= T_RUMBLE_END) {
        this.phase = 'warning';
      }
    }

    // -------------------------------------------------------
    // Phase 3: warning (500 ~ 800ms)
    // Cracks blink faster, tiles tint red, shake escalates
    // -------------------------------------------------------
    else if (this.phase === 'warning') {
      const progress = (t - T_RUMBLE_END) / (T_WARNING_END - T_RUMBLE_END);
      this.onShake?.(shake * (0.3 + progress * 0.4));

      // Blink cracks faster as warning intensifies
      const blinkSpeed = 30 - progress * 15; // 30ms → 15ms period
      this.crackOverlay.alpha = 0.5 + Math.sin(t / blinkSpeed) * 0.4;

      // Red tint on affected floor tiles
      this.drawTintOverlay(progress * 0.3);

      if (t >= T_WARNING_END) {
        this.phase = 'collapse_outer';
        this.currentRing = this.maxRing;
        this.ringTimer = 0;
        this.crackOverlay.clear();
        this.crackOverlay.alpha = 1;
        this.tintOverlay.clear();
      }
    }

    // -------------------------------------------------------
    // Phase 4: collapse_outer (800 ~ 1200ms)
    // Outer half of rings fall
    // -------------------------------------------------------
    else if (this.phase === 'collapse_outer') {
      this.ringTimer += dt;
      const targetRing = this.maxRing - this.outerRingCount;

      while (this.ringTimer >= RING_DELAY && this.currentRing > targetRing) {
        this.ringTimer -= RING_DELAY;
        this.collapseRing(this.currentRing);
        this.currentRing--;
      }

      const progress = (t - T_WARNING_END) / (T_OUTER_END - T_WARNING_END);
      this.onShake?.(shake * (0.5 + progress * 0.3));

      if (t >= T_OUTER_END || this.currentRing <= targetRing) {
        while (this.currentRing > targetRing) {
          this.collapseRing(this.currentRing);
          this.currentRing--;
        }
        this.phase = 'collapse_inner';
        this.ringTimer = 0;
      }
    }

    // -------------------------------------------------------
    // Phase 5: collapse_inner (1200 ~ 1600ms)
    // Inner rings fall, shake peak, dust particles rise
    // -------------------------------------------------------
    else if (this.phase === 'collapse_inner') {
      this.ringTimer += dt;

      while (this.ringTimer >= RING_DELAY && this.currentRing > 0) {
        this.ringTimer -= RING_DELAY;
        this.collapseRing(this.currentRing);
        this.currentRing--;
      }

      const progress = (t - T_OUTER_END) / (T_INNER_END - T_OUTER_END);
      this.onShake?.(shake * (0.8 + progress * 0.2));

      // Dust rising from the hole
      if (Math.random() < 0.3) {
        this.spawnDust(
          (this.anvilCol + (Math.random() - 0.5) * this.radiusX) * TILE_SIZE,
          this.anvilRow * TILE_SIZE,
        );
      }

      if (t >= T_INNER_END || this.currentRing <= 0) {
        while (this.currentRing > 0) {
          this.collapseRing(this.currentRing);
          this.currentRing--;
        }
        this.collapseRing(0);
        this.collapsePreservedTiles();
        this.onScreenFlash?.(0xffffff, 0.3);
        this.phase = 'anvil_fall';
      }
    }

    // -------------------------------------------------------
    // Phase 7: anvil_fall — player freefalls through the hole
    // -------------------------------------------------------
    else if (this.phase === 'anvil_fall') {
      const progress = (t - T_INNER_END) / (T_ANVIL_FALL_END - T_INNER_END);
      this.onShake?.(shake * 0.2 * (1 - progress));

      if (t >= T_ANVIL_FALL_END) {
        this.phase = 'fade_out';
      }
    }

    // -------------------------------------------------------
    // Phase 8: fade_out (2400 ~ 3000ms)
    // Screen fades to black
    // -------------------------------------------------------
    else if (this.phase === 'fade_out') {
      const progress = (t - T_ANVIL_FALL_END) / (T_FADE_END - T_ANVIL_FALL_END);
      this.fadeOverlay.clear();
      const gridW = (this.roomData[0]?.length ?? 20) * TILE_SIZE;
      const gridH = this.roomData.length * TILE_SIZE;
      this.fadeOverlay.rect(0, 0, gridW, gridH).fill(0x000000);
      this.fadeOverlay.alpha = Math.min(1, progress);

      if (t >= T_FADE_END) {
        this.phase = 'done';
      }
    }

    this.updateDebris(dt);
  }

  /** Restore all removed tiles to their original values. */
  restore(): void {
    for (const [key, value] of this.savedTiles) {
      const [col, row] = key.split(',').map(Number);
      if (this.roomData[row] !== undefined) {
        this.roomData[row][col] = value;
      }
    }
    for (const [key, value] of this.preservedTiles) {
      const [col, row] = key.split(',').map(Number);
      if (this.roomData[row] !== undefined) {
        this.roomData[row][col] = value;
      }
    }
    this.savedTiles.clear();
    this.preservedTiles.clear();

    for (const d of this.debrisList) {
      if (d.gfx.parent) d.gfx.parent.removeChild(d.gfx);
    }
    this.debrisList = [];
    this.crackOverlay.clear();
    this.tintOverlay.clear();
    this.fadeOverlay.clear();
    this.fadeOverlay.alpha = 0;
    this.phase = 'idle';
  }

  destroy(): void {
    for (const d of this.debrisList) {
      if (d.gfx.parent) d.gfx.parent.removeChild(d.gfx);
    }
    this.debrisList = [];
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
    this.container.destroy({ children: true });
  }

  // ---------------------------------------------------------------------------
  // Private — tile management
  // ---------------------------------------------------------------------------

  private isPreserved(col: number, row: number): boolean {
    return (
      col >= this.anvilCol - 1 &&
      col <= this.anvilCol &&
      row >= this.anvilRow &&
      row <= this.anvilRow + 1
    );
  }

  private saveTilesInRadius(): void {
    for (let dy = -this.radiusY; dy <= this.radiusY; dy++) {
      for (let dx = -this.radiusX; dx <= this.radiusX; dx++) {
        const col = this.anvilCol + dx;
        const row = this.anvilRow + dy;
        if (this.isPreserved(col, row)) continue;
        if (row < 0 || row >= this.roomData.length) continue;
        if (col < 0 || col >= (this.roomData[0]?.length ?? 0)) continue;

        const tile = this.roomData[row][col];
        if (tile > 0) {
          this.savedTiles.set(`${col},${row}`, tile);
        }
      }
    }
  }

  private savePreservedTiles(): void {
    for (let dy = 0; dy <= 1; dy++) {
      for (let dx = -1; dx <= 0; dx++) {
        const col = this.anvilCol + dx;
        const row = this.anvilRow + dy;
        if (row < 0 || row >= this.roomData.length) continue;
        if (col < 0 || col >= (this.roomData[0]?.length ?? 0)) continue;
        const tile = this.roomData[row][col];
        if (tile > 0) {
          this.preservedTiles.set(`${col},${row}`, tile);
        }
      }
    }
  }

  private collapsePreservedTiles(): void {
    let removed = false;
    for (const [key] of this.preservedTiles) {
      const [col, row] = key.split(',').map(Number);
      if (this.roomData[row] !== undefined) {
        this.roomData[row][col] = 0;
        this.spawnDebris(col * TILE_SIZE + TILE_SIZE / 2, row * TILE_SIZE + TILE_SIZE / 2);
        removed = true;
      }
    }
    if (removed) this.onTilesRemoved?.();
  }

  /** Collapse tiles at Chebyshev ring distance, clamped to radiusX/radiusY. */
  private collapseRing(ring: number): void {
    const yRange = Math.min(ring, this.radiusY);
    const xRange = Math.min(ring, this.radiusX);
    let removed = false;

    for (let dy = -yRange; dy <= yRange; dy++) {
      for (let dx = -xRange; dx <= xRange; dx++) {
        if (Math.abs(dx) !== ring && Math.abs(dy) !== ring) continue;
        if (Math.abs(dx) > this.radiusX || Math.abs(dy) > this.radiusY) continue;

        const col = this.anvilCol + dx;
        const row = this.anvilRow + dy;
        if (this.isPreserved(col, row)) continue;
        if (row < 0 || row >= this.roomData.length) continue;
        if (col < 0 || col >= (this.roomData[0]?.length ?? 0)) continue;

        if (this.roomData[row][col] > 0) {
          this.roomData[row][col] = 0;
          this.spawnDebris(col * TILE_SIZE + TILE_SIZE / 2, row * TILE_SIZE + TILE_SIZE / 2);
          removed = true;
        }
      }
    }
    if (removed) this.onTilesRemoved?.();
  }

  // ---------------------------------------------------------------------------
  // Private — visual effects
  // ---------------------------------------------------------------------------

  /** Draw cracks that spread outward based on progress (0→1). */
  private drawCracksProgressive(progress: number): void {
    this.crackOverlay.clear();
    const spreadRadius = Math.ceil(this.maxRing * Math.min(1, progress));

    for (const [key] of this.savedTiles) {
      const [col, row] = key.split(',').map(Number);
      const dist = Math.max(Math.abs(col - this.anvilCol), Math.abs(row - this.anvilRow));
      if (dist > spreadRadius) continue;

      const px = col * TILE_SIZE;
      const py = row * TILE_SIZE;

      const intensity = 1 - dist / (this.maxRing + 1);

      this.crackOverlay
        .rect(px, py, TILE_SIZE, TILE_SIZE)
        .fill({ color: 0xff2200, alpha: 0.1 * intensity });

      this.crackOverlay
        .moveTo(px + 2, py + 2)
        .lineTo(px + TILE_SIZE - 2, py + TILE_SIZE - 2)
        .stroke({ color: 0xff4400, width: 1, alpha: 0.5 * intensity });
      this.crackOverlay
        .moveTo(px + TILE_SIZE - 3, py + 1)
        .lineTo(px + 3, py + TILE_SIZE - 1)
        .stroke({ color: 0xff2200, width: 1, alpha: 0.35 * intensity });
    }
  }

  /** Red tint overlay on all affected floor tiles. */
  private drawTintOverlay(alpha: number): void {
    this.tintOverlay.clear();
    for (const [key] of this.savedTiles) {
      const [col, row] = key.split(',').map(Number);
      this.tintOverlay
        .rect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE)
        .fill({ color: 0xff0000, alpha });
    }
  }

  /** Spawn falling debris at a world position. */
  private spawnDebris(wx: number, wy: number): void {
    const count = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      const gfx = new Graphics();
      const size = 3 + Math.random() * 4;
      const shade = 0x443322 + Math.floor(Math.random() * 0x222222);
      gfx.rect(-size / 2, -size / 2, size, size).fill(shade);
      gfx.x = wx + (Math.random() - 0.5) * 8;
      gfx.y = wy + (Math.random() - 0.5) * 4;
      this.container.addChild(gfx);
      this.debrisList.push({
        gfx, x: gfx.x, y: gfx.y,
        vx: (Math.random() - 0.5) * 80,
        vy: -(50 + Math.random() * 80),
        life: 800 + Math.random() * 400,
      });
    }
  }

  /** Spawn dust particles that rise upward (used in phase 5). */
  private spawnDust(wx: number, wy: number): void {
    const gfx = new Graphics();
    const size = 2 + Math.random() * 3;
    gfx.rect(-size / 2, -size / 2, size, size).fill({ color: 0x998877, alpha: 0.6 });
    gfx.x = wx;
    gfx.y = wy;
    this.container.addChild(gfx);
    this.debrisList.push({
      gfx, x: wx, y: wy,
      vx: (Math.random() - 0.5) * 20,
      vy: -(30 + Math.random() * 40), // rises upward
      life: 600 + Math.random() * 300,
    });
  }

  private updateDebris(dt: number): void {
    const dtSec = dt / 1000;
    for (let i = this.debrisList.length - 1; i >= 0; i--) {
      const d = this.debrisList[i];
      d.life -= dt;
      d.vy += 400 * dtSec;
      d.x += d.vx * dtSec;
      d.y += d.vy * dtSec;
      d.gfx.x = d.x;
      d.gfx.y = d.y;
      d.gfx.alpha = Math.max(0, d.life / 800);

      if (d.life <= 0 || d.y > 4000) {
        if (d.gfx.parent) d.gfx.parent.removeChild(d.gfx);
        this.debrisList.splice(i, 1);
      }
    }
  }
}
