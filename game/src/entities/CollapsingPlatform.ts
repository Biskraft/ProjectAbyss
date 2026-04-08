/**
 * CollapsingPlatform.ts — A platform that shakes and collapses when stepped on.
 *
 * LDtk entity: CollapsingPlatform (resizable, pivot bottom-left)
 * Fields:
 *  - Respawn (Bool): whether the platform respawns after collapsing
 *  - RespawnTime (Float): seconds until respawn (default 3.0)
 *
 * Lifecycle: solid → player stands on it → shake (0.5s) → collapse → [respawn timer] → solid
 */

import { Container, Graphics } from 'pixi.js';

const TILE_SIZE = 16;
const SHAKE_DURATION = 500;   // ms of warning shake before collapse
const SHAKE_INTENSITY = 2;    // px shake amplitude
const PLATFORM_COLOR = 0x887766;
const PLATFORM_CRACK_COLOR = 0x665544;

type PlatformState = 'solid' | 'shaking' | 'collapsed' | 'respawning';

export class CollapsingPlatform {
  container: Container;
  x: number;
  y: number;
  width: number;
  height: number;

  /** Whether this platform respawns after collapsing. */
  respawns: boolean;
  /** Time in ms until respawn after collapse. */
  respawnTimeMs: number;

  private gfx: Graphics;
  private state: PlatformState = 'solid';
  private shakeTimer = 0;
  private respawnTimer = 0;
  private gridCells: { col: number; row: number }[] = [];
  private grid: number[][] = [];

  constructor(x: number, y: number, width: number, height: number, respawns: boolean, respawnTimeSec: number) {
    // Pivot bottom-left
    this.x = x;
    this.y = y - height;
    this.width = width;
    this.height = height;
    this.respawns = respawns;
    this.respawnTimeMs = respawnTimeSec * 1000;

    this.container = new Container();
    this.container.x = this.x;
    this.container.y = this.y;

    this.gfx = new Graphics();
    this.drawSolid();
    this.container.addChild(this.gfx);
  }

  private drawSolid(): void {
    this.gfx.clear();
    this.gfx.rect(0, 0, this.width, this.height).fill({ color: PLATFORM_COLOR, alpha: 0.9 });
    this.gfx.rect(0, 0, this.width, this.height).stroke({ color: PLATFORM_CRACK_COLOR, width: 1 });
    // Crack hints
    this.gfx.moveTo(this.width * 0.3, 0).lineTo(this.width * 0.35, this.height)
      .stroke({ color: PLATFORM_CRACK_COLOR, width: 1 });
    this.gfx.moveTo(this.width * 0.7, 0).lineTo(this.width * 0.65, this.height)
      .stroke({ color: PLATFORM_CRACK_COLOR, width: 1 });
  }

  /** Inject solid collision tiles. */
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

  /** Check if player is standing on this platform. */
  isPlayerOnTop(px: number, py: number, pw: number, ph: number): boolean {
    if (this.state !== 'solid') return false;
    const playerBottom = py + ph;
    const playerRight = px + pw;
    // Player's feet are on top of platform (within 2px tolerance)
    return (
      playerBottom >= this.y && playerBottom <= this.y + 3 &&
      playerRight > this.x + 2 && px < this.x + this.width - 2
    );
  }

  /** Start shaking (called when player steps on it). */
  startShake(): void {
    if (this.state !== 'solid') return;
    this.state = 'shaking';
    this.shakeTimer = SHAKE_DURATION;
  }

  update(dt: number): void {
    if (this.state === 'shaking') {
      this.shakeTimer -= dt;
      // Visual shake
      this.container.x = this.x + (Math.random() - 0.5) * SHAKE_INTENSITY * 2;
      this.container.y = this.y + (Math.random() - 0.5) * SHAKE_INTENSITY;
      // Fade alpha as shake progresses
      this.gfx.alpha = 0.5 + (this.shakeTimer / SHAKE_DURATION) * 0.5;

      if (this.shakeTimer <= 0) {
        this.collapse();
      }
    } else if (this.state === 'respawning') {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) {
        this.restore();
      }
    }
  }

  private collapse(): void {
    this.state = 'collapsed';
    this.container.visible = false;
    this.container.x = this.x;
    this.container.y = this.y;

    // Remove collision
    for (const { col, row } of this.gridCells) {
      if (row >= 0 && row < this.grid.length && col >= 0 && col < (this.grid[0]?.length ?? 0)) {
        this.grid[row][col] = 0;
      }
    }

    if (this.respawns) {
      this.state = 'respawning';
      this.respawnTimer = this.respawnTimeMs;
    }
  }

  private restore(): void {
    this.state = 'solid';
    this.container.visible = true;
    this.gfx.alpha = 1;
    this.drawSolid();

    // Re-inject collision
    for (const { col, row } of this.gridCells) {
      if (row >= 0 && row < this.grid.length && col >= 0 && col < (this.grid[0]?.length ?? 0)) {
        this.grid[row][col] = 1;
      }
    }
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
