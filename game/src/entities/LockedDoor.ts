/**
 * LockedDoor.ts — A barrier that blocks passage until an event unlocks it.
 *
 * Renders as a solid colored rect matching the entity size.
 * Injects collision tiles into the grid on spawn, removes them on unlock.
 */

import { Container, Graphics } from 'pixi.js';

const TILE_SIZE = 16;

export class LockedDoor {
  container: Container;
  x: number;
  y: number;
  width: number;
  height: number;
  unlockEvent: string;
  locked = true;

  private gfx: Graphics;
  /** Collision grid cells this door occupies — stored for removal on unlock. */
  private gridCells: { col: number; row: number }[] = [];

  constructor(x: number, y: number, width: number, height: number, unlockEvent: string) {
    // Entity pivot is bottom-center, so adjust y
    this.x = x - width / 2;
    this.y = y - height;
    this.width = width;
    this.height = height;
    this.unlockEvent = unlockEvent;

    this.container = new Container();
    this.container.x = this.x;
    this.container.y = this.y;

    this.gfx = new Graphics();
    this.gfx.rect(0, 0, width, height).fill({ color: 0x8b4513, alpha: 0.9 });
    this.gfx.rect(0, 0, width, height).stroke({ color: 0x5a2d0c, width: 1 });
    // Door frame lines
    this.gfx.rect(2, 2, width - 4, height - 4).stroke({ color: 0xa0522d, width: 1 });
    this.container.addChild(this.gfx);
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
          grid[gr][gc] = 1; // solid
          this.gridCells.push({ col: gc, row: gr });
        }
      }
    }
  }

  /** Remove collision and hide the door. */
  unlock(grid: number[][]): void {
    if (!this.locked) return;
    this.locked = false;
    this.container.visible = false;

    for (const { col, row } of this.gridCells) {
      if (row >= 0 && row < grid.length && col >= 0 && col < (grid[0]?.length ?? 0)) {
        grid[row][col] = 0; // open
      }
    }
    this.gridCells = [];
  }

  destroy(): void {
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
  }
}
