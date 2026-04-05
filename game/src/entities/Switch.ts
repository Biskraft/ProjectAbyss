/**
 * Switch.ts — An attackable barrier that unlocks a linked LockedDoor when destroyed.
 *
 * LDtk fields:
 *  - targetDoor (EntityRef): reference to the LockedDoor entity to unlock.
 *
 * Like LockedDoor, injects solid collision tiles into the grid.
 * When the player's attack hitbox overlaps it, it breaks: collision is
 * removed, the visual disappears, and the linked door opens.
 */

import { Container, Graphics } from 'pixi.js';

const TILE_SIZE = 16;

export class Switch {
  container: Container;
  x: number;
  y: number;
  width: number;
  height: number;
  /** IID of the target LockedDoor entity. */
  targetDoorIid: string;
  activated = false;

  private gfx: Graphics;
  /** Collision grid cells this switch occupies. */
  private gridCells: { col: number; row: number }[] = [];

  constructor(x: number, y: number, width: number, height: number, targetDoorIid: string) {
    // Pivot is bottom-center (LDtk default)
    this.x = x - width / 2;
    this.y = y - height;
    this.width = width;
    this.height = height;
    this.targetDoorIid = targetDoorIid;

    this.container = new Container();
    this.container.x = this.x;
    this.container.y = this.y;

    this.gfx = new Graphics();
    this.drawIdle();
    this.container.addChild(this.gfx);
  }

  private drawIdle(): void {
    this.gfx.clear();
    // Solid block with a distinct color to hint at interactability
    this.gfx.rect(0, 0, this.width, this.height).fill({ color: 0x996633, alpha: 0.9 });
    this.gfx.rect(0, 0, this.width, this.height).stroke({ color: 0x664422, width: 1 });
    // Crack lines — hint that it can be broken
    this.gfx.moveTo(3, this.height * 0.3)
      .lineTo(this.width * 0.5, this.height * 0.5)
      .lineTo(4, this.height * 0.7)
      .stroke({ color: 0xffaa44, width: 1 });
    this.gfx.moveTo(this.width - 3, this.height * 0.2)
      .lineTo(this.width * 0.5, this.height * 0.45)
      .lineTo(this.width - 4, this.height * 0.7)
      .stroke({ color: 0xffaa44, width: 1 });
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

  /** Activate: remove collision, hide visual. Returns true if newly activated. */
  activate(grid: number[][]): boolean {
    if (this.activated) return false;
    this.activated = true;
    this.container.visible = false;

    // Remove collision
    for (const { col, row } of this.gridCells) {
      if (row >= 0 && row < grid.length && col >= 0 && col < (grid[0]?.length ?? 0)) {
        grid[row][col] = 0;
      }
    }
    this.gridCells = [];
    return true;
  }

  /** AABB for hit detection. */
  getHitAABB(): { x: number; y: number; width: number; height: number } {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }

  destroy(): void {
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
  }
}
