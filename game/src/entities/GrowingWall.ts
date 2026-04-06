/**
 * GrowingWall.ts — A living wall that grows, spawns slimes, and can be destroyed.
 *
 * Behaviors:
 *  1. Grows: periodically expands 1 tile outward (collision added), then shrinks back
 *  2. Spawns: slimes crawl out of the wall surface on a timer
 *  3. Destructible: dive attack shatters the wall (collision removed, visual destroyed)
 *
 * LDtk entity: GrowingWall (resizable, placed in Entities layer)
 */

import { Container, Graphics } from 'pixi.js';
import { Slime } from './Slime';

const TILE_SIZE = 16;
const WALL_COLOR = 0x8a8a7a;
const CRACK_COLOR = 0x6a6a5a;

// Growth cycle
const GROW_INTERVAL = 8000;       // ms between growth pulses
const GROW_DURATION = 3000;       // ms the extra tile stays before shrinking
const GROW_ANIM_SPEED = 0.004;    // visual animation speed

// Slime spawning
const SLIME_INTERVAL_MIN = 10000; // ms
const SLIME_INTERVAL_MAX = 18000;

// Dust
const DUST_INTERVAL = 2000;
const DUST_LIFETIME = 1500;

interface DustParticle {
  x: number;
  y: number;
  vy: number;
  life: number;
  gfx: Graphics;
}

export class GrowingWall {
  container: Container;
  x: number;
  y: number;
  width: number;
  height: number;
  destroyed = false;

  private gfx: Graphics;
  private dusts: DustParticle[] = [];
  private gridCells: { col: number; row: number }[] = [];

  // Growth state
  private growTimer: number;
  private growActive = false;
  private growElapsed = 0;
  private growCells: { col: number; row: number }[] = [];
  private growGfx: Graphics;
  private grid: number[][] = [];

  // Slime spawn
  private slimeTimer: number;
  /** Slimes spawned by this wall — scene picks these up. */
  pendingSlimes: Slime[] = [];

  // Dust
  private dustTimer: number;

  // Visual pulse
  private pulseTimer = 0;

  constructor(x: number, y: number, width: number, height: number) {
    // Pivot bottom-left
    this.x = x;
    this.y = y - height;
    this.width = width;
    this.height = height;

    this.container = new Container();
    this.container.x = this.x;
    this.container.y = this.y;

    this.gfx = new Graphics();
    this.drawWall();
    this.container.addChild(this.gfx);

    // Growth visual overlay
    this.growGfx = new Graphics();
    this.container.addChild(this.growGfx);

    // Randomize timers
    this.growTimer = GROW_INTERVAL * (0.5 + Math.random() * 0.5);
    this.slimeTimer = SLIME_INTERVAL_MIN + Math.random() * (SLIME_INTERVAL_MAX - SLIME_INTERVAL_MIN);
    this.dustTimer = Math.random() * DUST_INTERVAL;
    this.pulseTimer = Math.random() * 6000;
  }

  private drawWall(): void {
    this.gfx.clear();
    this.gfx.rect(0, 0, this.width, this.height)
      .fill({ color: WALL_COLOR, alpha: 0.95 });
    this.gfx.rect(0, 0, this.width, this.height)
      .stroke({ color: CRACK_COLOR, width: 1 });

    // Crack lines
    const w = this.width;
    const h = this.height;
    this.gfx.moveTo(w * 0.3, 0).lineTo(w * 0.35, h * 0.3).lineTo(w * 0.25, h * 0.6).lineTo(w * 0.3, h)
      .stroke({ color: CRACK_COLOR, width: 1 });
    this.gfx.moveTo(0, h * 0.4).lineTo(w * 0.5, h * 0.5).lineTo(w, h * 0.35)
      .stroke({ color: CRACK_COLOR, width: 1 });
    this.gfx.moveTo(w * 0.6, 0).lineTo(w * 0.65, h * 0.5).lineTo(w * 0.55, h)
      .stroke({ color: CRACK_COLOR, width: 1 });
  }

  /** Inject solid collision tiles into the grid. */
  injectCollision(grid: number[][]): void {
    this.grid = grid;
    const startCol = Math.floor(this.x / TILE_SIZE);
    const startRow = Math.floor(this.y / TILE_SIZE);
    const cols = Math.ceil(this.width / TILE_SIZE);
    const rows = Math.ceil(this.height / TILE_SIZE);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const gr = startRow + r;
        const gc = startCol + c;
        if (gr >= 0 && gr < grid.length && gc >= 0 && gc < (grid[0]?.length ?? 0)) {
          grid[gr][gc] = 1;
          this.gridCells.push({ col: gc, row: gr });
        }
      }
    }
  }

  update(dt: number): void {
    if (this.destroyed) return;

    this.pulseTimer += dt;

    // --- Growth cycle ---
    if (!this.growActive) {
      this.growTimer -= dt;
      if (this.growTimer <= 0) {
        this.startGrowth();
      }
    } else {
      this.growElapsed += dt;
      // Animate growth visual
      const growProgress = Math.min(1, this.growElapsed / 500); // 500ms to fully extend
      this.drawGrowth(growProgress);

      if (this.growElapsed >= GROW_DURATION) {
        this.endGrowth();
      }
    }

    // --- Slime spawn ---
    this.slimeTimer -= dt;
    if (this.slimeTimer <= 0) {
      this.slimeTimer = SLIME_INTERVAL_MIN + Math.random() * (SLIME_INTERVAL_MAX - SLIME_INTERVAL_MIN);
      this.spawnSlime();
    }

    // --- Dust particles ---
    this.dustTimer -= dt;
    if (this.dustTimer <= 0) {
      this.dustTimer = DUST_INTERVAL + Math.random() * 1000;
      this.spawnDust();
    }

    // --- Pulse visual (breathing) ---
    const pulse = Math.sin(this.pulseTimer * 0.001) * 1.5;
    this.gfx.scale.x = 1 + Math.max(0, pulse) / this.width * 0.5;

    // Update dust
    for (let i = this.dusts.length - 1; i >= 0; i--) {
      const d = this.dusts[i];
      d.life -= dt;
      d.y += d.vy * (dt / 1000);
      d.gfx.x = d.x;
      d.gfx.y = d.y;
      d.gfx.alpha = Math.max(0, d.life / DUST_LIFETIME);
      if (d.life <= 0) {
        if (d.gfx.parent) d.gfx.parent.removeChild(d.gfx);
        this.dusts.splice(i, 1);
      }
    }
  }

  // --- Growth ---

  private startGrowth(): void {
    if (this.grid.length === 0) return;
    this.growActive = true;
    this.growElapsed = 0;
    this.growCells = [];

    // Expand 1 tile on each side (left and right edges)
    const startCol = Math.floor(this.x / TILE_SIZE);
    const startRow = Math.floor(this.y / TILE_SIZE);
    const cols = Math.ceil(this.width / TILE_SIZE);
    const rows = Math.ceil(this.height / TILE_SIZE);
    const gridH = this.grid.length;
    const gridW = this.grid[0]?.length ?? 0;

    // Try left and right expansion
    const expandCols = [startCol - 1, startCol + cols];
    for (const ec of expandCols) {
      if (ec < 0 || ec >= gridW) continue;
      for (let r = 0; r < rows; r++) {
        const gr = startRow + r;
        if (gr < 0 || gr >= gridH) continue;
        if (this.grid[gr][ec] === 0) {
          this.grid[gr][ec] = 1;
          this.growCells.push({ col: ec, row: gr });
        }
      }
    }
  }

  private drawGrowth(progress: number): void {
    this.growGfx.clear();
    for (const cell of this.growCells) {
      const lx = (cell.col * TILE_SIZE) - this.x;
      const ly = (cell.row * TILE_SIZE) - this.y;
      const alpha = 0.3 + progress * 0.5;
      this.growGfx.rect(lx, ly, TILE_SIZE, TILE_SIZE)
        .fill({ color: WALL_COLOR, alpha });
      this.growGfx.rect(lx, ly, TILE_SIZE, TILE_SIZE)
        .stroke({ color: CRACK_COLOR, width: 1, alpha: alpha * 0.5 });
    }
  }

  private endGrowth(): void {
    this.growActive = false;
    this.growTimer = GROW_INTERVAL * (0.8 + Math.random() * 0.4);
    this.growGfx.clear();

    // Remove expanded collision
    for (const cell of this.growCells) {
      if (this.grid[cell.row]?.[cell.col] === 1) {
        this.grid[cell.row][cell.col] = 0;
      }
    }
    this.growCells = [];
  }

  // --- Slime spawn ---

  private spawnSlime(): void {
    // Spawn at wall surface (left or right edge)
    const side = Math.random() < 0.5 ? -1 : 1;
    const sx = side > 0 ? this.x + this.width + 4 : this.x - 20;
    const sy = this.y + this.height - 16; // bottom of wall

    const slime = new Slime();
    slime.x = sx;
    slime.y = sy;
    this.pendingSlimes.push(slime);
  }

  // --- Destruction (dive attack) ---

  /** Shatter the wall — remove collision, hide visual. Returns true if destroyed. */
  shatter(grid: number[][]): boolean {
    if (this.destroyed) return false;
    this.destroyed = true;
    this.container.visible = false;

    // Remove base collision
    for (const { col, row } of this.gridCells) {
      if (row >= 0 && row < grid.length && col >= 0 && col < (grid[0]?.length ?? 0)) {
        grid[row][col] = 0;
      }
    }
    this.gridCells = [];

    // Remove growth collision too
    for (const cell of this.growCells) {
      if (grid[cell.row]?.[cell.col] === 1) {
        grid[cell.row][cell.col] = 0;
      }
    }
    this.growCells = [];

    return true;
  }

  getAABB(): { x: number; y: number; width: number; height: number } {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }

  // --- Dust ---

  private spawnDust(): void {
    const gfx = new Graphics();
    const size = 1 + Math.random();
    gfx.rect(0, 0, size, size).fill({ color: 0x999988, alpha: 0.6 });
    const x = Math.random() * this.width;
    const y = -1;
    gfx.x = x;
    gfx.y = y;
    this.container.addChild(gfx);
    this.dusts.push({ x, y, vy: 10 + Math.random() * 15, life: DUST_LIFETIME, gfx });
  }

  destroy(): void {
    for (const d of this.dusts) {
      if (d.gfx.parent) d.gfx.parent.removeChild(d.gfx);
    }
    this.dusts = [];
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
  }
}
