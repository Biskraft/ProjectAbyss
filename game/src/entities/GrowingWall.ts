/**
 * GrowingWall.ts — A wall that visually expands over time.
 *
 * Represents the megastructure growing — concrete slowly bulging outward.
 * Solid collision, indestructible, no interaction.
 * Visual: brighter color than normal walls, slow pulsing scale animation,
 * dust particles falling from surface.
 *
 * LDtk entity: GrowingWall (resizable, placed in Entities layer)
 */

import { Container, Graphics } from 'pixi.js';

const TILE_SIZE = 16;
const WALL_COLOR = 0x8a8a7a;        // lighter concrete
const CRACK_COLOR = 0x6a6a5a;
const PULSE_SPEED = 0.0008;          // cycles per ms
const PULSE_AMPLITUDE = 1.5;         // px visual expansion
const DUST_INTERVAL = 2000;          // ms between dust spawns
const DUST_LIFETIME = 1500;          // ms

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

  private gfx: Graphics;
  private pulseTimer = 0;
  private dustTimer = 0;
  private dusts: DustParticle[] = [];
  private gridCells: { col: number; row: number }[] = [];

  constructor(x: number, y: number, width: number, height: number) {
    // Pivot bottom-center (LDtk default)
    this.x = x - width / 2;
    this.y = y - height;
    this.width = width;
    this.height = height;

    this.container = new Container();
    this.container.x = this.x;
    this.container.y = this.y;

    this.gfx = new Graphics();
    this.drawWall(0);
    this.container.addChild(this.gfx);

    // Randomize timers so multiple walls don't pulse in sync
    this.pulseTimer = Math.random() * 6000;
    this.dustTimer = Math.random() * DUST_INTERVAL;
  }

  private drawWall(expand: number): void {
    this.gfx.clear();
    const ex = expand / 2;
    // Main body — slightly lighter than normal walls
    this.gfx.rect(-ex, -ex, this.width + expand, this.height + expand)
      .fill({ color: WALL_COLOR, alpha: 0.95 });
    this.gfx.rect(-ex, -ex, this.width + expand, this.height + expand)
      .stroke({ color: CRACK_COLOR, width: 1 });

    // Crack lines — organic, irregular
    const w = this.width + expand;
    const h = this.height + expand;
    // Vertical crack
    this.gfx.moveTo(w * 0.3 - ex, -ex)
      .lineTo(w * 0.35 - ex, h * 0.3 - ex)
      .lineTo(w * 0.25 - ex, h * 0.6 - ex)
      .lineTo(w * 0.3 - ex, h - ex)
      .stroke({ color: CRACK_COLOR, width: 1 });
    // Horizontal crack
    this.gfx.moveTo(-ex, h * 0.4 - ex)
      .lineTo(w * 0.4 - ex, h * 0.45 - ex)
      .lineTo(w * 0.7 - ex, h * 0.38 - ex)
      .lineTo(w - ex, h * 0.42 - ex)
      .stroke({ color: CRACK_COLOR, width: 1 });
    // Diagonal crack
    this.gfx.moveTo(w * 0.6 - ex, -ex)
      .lineTo(w * 0.65 - ex, h * 0.5 - ex)
      .lineTo(w * 0.55 - ex, h - ex)
      .stroke({ color: CRACK_COLOR, width: 1 });
  }

  /** Inject solid collision tiles into the grid. */
  injectCollision(grid: number[][]): void {
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
    // Pulse — slow breathing expansion
    this.pulseTimer += dt;
    const expand = Math.sin(this.pulseTimer * PULSE_SPEED) * PULSE_AMPLITUDE;
    this.drawWall(Math.max(0, expand));

    // Dust particles
    this.dustTimer -= dt;
    if (this.dustTimer <= 0) {
      this.dustTimer = DUST_INTERVAL + Math.random() * 1000;
      this.spawnDust();
    }

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

  private spawnDust(): void {
    const gfx = new Graphics();
    const size = 1 + Math.random();
    gfx.rect(0, 0, size, size).fill({ color: 0x999988, alpha: 0.6 });

    const x = Math.random() * this.width;
    const y = -1;
    gfx.x = x;
    gfx.y = y;
    this.container.addChild(gfx);

    this.dusts.push({
      x,
      y,
      vy: 10 + Math.random() * 15,
      life: DUST_LIFETIME,
      gfx,
    });
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
