/**
 * CrackedFloor.ts — Breakable floor tile destroyed by Dive Attack.
 *
 * Renders as a cracked-looking floor block. Injects collision on spawn.
 * When the player's dive attack lands on/near it, the floor shatters:
 * collision is removed, particles fly, and the path below opens.
 *
 * LDtk entity: CrackedFloor (resizable)
 */

import { Container, Graphics } from 'pixi.js';

const TILE_SIZE = 16;
const FLOOR_COLOR = 0x7a7a6a;
const CRACK_COLOR = 0x5a5a4a;

export class CrackedFloor {
  container: Container;
  x: number;
  y: number;
  width: number;
  height: number;
  destroyed = false;

  private gfx: Graphics;
  private gridCells: { col: number; row: number }[] = [];

  constructor(x: number, y: number, width: number, height: number) {
    // Pivot bottom-center
    this.x = x - width / 2;
    this.y = y - height;
    this.width = width;
    this.height = height;

    this.container = new Container();
    this.container.x = this.x;
    this.container.y = this.y;

    this.gfx = new Graphics();
    this.drawFloor();
    this.container.addChild(this.gfx);
  }

  private drawFloor(): void {
    this.gfx.clear();
    this.gfx.rect(0, 0, this.width, this.height).fill({ color: FLOOR_COLOR, alpha: 0.95 });
    this.gfx.rect(0, 0, this.width, this.height).stroke({ color: CRACK_COLOR, width: 1 });

    // Crack pattern
    const w = this.width;
    const h = this.height;
    // Main diagonal crack
    this.gfx.moveTo(w * 0.2, 0)
      .lineTo(w * 0.45, h * 0.5)
      .lineTo(w * 0.3, h)
      .stroke({ color: CRACK_COLOR, width: 1 });
    // Secondary crack
    this.gfx.moveTo(w * 0.6, 0)
      .lineTo(w * 0.7, h * 0.4)
      .lineTo(w * 0.55, h)
      .stroke({ color: CRACK_COLOR, width: 1 });
    // Cross crack
    this.gfx.moveTo(0, h * 0.4)
      .lineTo(w * 0.5, h * 0.5)
      .lineTo(w, h * 0.35)
      .stroke({ color: CRACK_COLOR, width: 1 });
  }

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

  /** Shatter the floor — remove collision and visual. */
  shatter(grid: number[][]): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.container.visible = false;

    for (const { col, row } of this.gridCells) {
      if (row >= 0 && row < grid.length && col >= 0 && col < (grid[0]?.length ?? 0)) {
        grid[row][col] = 0;
      }
    }
    this.gridCells = [];
  }

  getAABB(): { x: number; y: number; width: number; height: number } {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }

  destroy(): void {
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
  }
}
