/**
 * SecretWall.ts — Hidden wall that looks identical to normal walls.
 *
 * Two variants controlled by the `mode` field:
 *   - "item"    : attack to reveal a hidden item drop
 *   - "passage" : attack to open a hidden path to the next room
 *
 * The wall renders using the same palette-swapped tile appearance so it
 * blends seamlessly with surrounding walls. A subtle visual hint (faint
 * crack pattern at low alpha) rewards observant players without breaking
 * immersion.
 *
 * LDtk entity: SecretWall (resizable)
 *   Fields:
 *     - Mode     (Enum: "item" | "passage")  — what happens on break
 *     - HintAlpha (Float, default 0.08)      — crack hint visibility
 *
 * Pattern: CrackedFloor (collision inject/remove) + Switch (attack hit detection)
 */

import { Container, Graphics } from 'pixi.js';
import type { Game } from '../Game';

const TILE_SIZE = 16;

// Grayscale wall colors — PaletteSwapFilter will remap these to
// match the current area's wall palette, making the secret wall
// indistinguishable from surrounding walls.
const WALL_COLOR = 0x222222;      // dark gray → palette maps to wall color
const WALL_BORDER = 0x181818;     // slightly darker edge
const CRACK_HINT_COLOR = 0x444444; // mid gray for hint cracks

// Hit feedback — same feel as hitting a monster
const HIT_SHAKE_INTENSITY = 2.5;
const HIT_HITSTOP_FRAMES = 3;
const BREAK_SHAKE_INTENSITY = 5;
const BREAK_HITSTOP_FRAMES = 6;

export type SecretWallMode = 'item' | 'passage';

export interface SecretWallConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  mode: SecretWallMode;
  /** Crack hint alpha — 0 = fully hidden, 0.08 = faint hint (default). */
  hintAlpha?: number;
}

export class SecretWall {
  readonly container: Container;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly mode: SecretWallMode;

  destroyed = false;

  private gfx: Graphics;
  private hintGfx: Graphics;
  private hintAlpha: number;
  private gridCells: { col: number; row: number }[] = [];

  // --- Hit flash ---
  private flashTimer = 0;
  private static readonly FLASH_DURATION = 120; // ms

  constructor(cfg: SecretWallConfig) {
    // LDtk pivot: bottom-left for resizable entities
    this.x = cfg.x;
    this.y = cfg.y - cfg.height;
    this.width = cfg.width;
    this.height = cfg.height;
    this.mode = cfg.mode;
    this.hintAlpha = cfg.hintAlpha ?? 0.08;

    this.container = new Container();
    this.container.x = this.x;
    this.container.y = this.y;

    // No main wall visual — the LDtk IntGrid is solid(1) so AutoTile
    // already renders real wall tiles here. We only draw the hint cracks.
    this.gfx = new Graphics();
    this.container.addChild(this.gfx);

    // Hint layer — very faint crack pattern for observant players
    this.hintGfx = new Graphics();
    this.drawHint();
    this.hintGfx.alpha = this.hintAlpha;
    this.container.addChild(this.hintGfx);
  }

  // ---------------------------------------------------------------------------
  // Visual
  // ---------------------------------------------------------------------------

  private drawWall(): void {
    this.gfx.clear();
    this.gfx.rect(0, 0, this.width, this.height).fill({ color: WALL_COLOR });
    this.gfx.rect(0, 0, this.width, this.height).stroke({ color: WALL_BORDER, width: 1 });
  }

  private drawHint(): void {
    this.hintGfx.clear();
    const w = this.width;
    const h = this.height;
    // Faint diagonal cracks — barely visible at hintAlpha
    this.hintGfx.moveTo(w * 0.15, 0)
      .lineTo(w * 0.4, h * 0.5)
      .lineTo(w * 0.25, h)
      .stroke({ color: CRACK_HINT_COLOR, width: 1 });
    this.hintGfx.moveTo(w * 0.65, 0)
      .lineTo(w * 0.75, h * 0.45)
      .lineTo(w * 0.6, h)
      .stroke({ color: CRACK_HINT_COLOR, width: 1 });
  }

  // ---------------------------------------------------------------------------
  // Collision grid
  // ---------------------------------------------------------------------------

  /**
   * Record which grid cells this wall covers. The IntGrid should already
   * be solid(1) at these positions so AutoTile renders real wall tiles.
   * We do NOT overwrite the grid here — just record the cells so break()
   * can clear them later.
   */
  recordCollision(grid: number[][]): void {
    const startCol = Math.floor(this.x / TILE_SIZE);
    const startRow = Math.floor(this.y / TILE_SIZE);
    const cols = Math.ceil(this.width / TILE_SIZE);
    const rows = Math.ceil(this.height / TILE_SIZE);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const gr = startRow + r;
        const gc = startCol + c;
        if (gr >= 0 && gr < grid.length && gc >= 0 && gc < (grid[0]?.length ?? 0)) {
          this.gridCells.push({ col: gc, row: gr });
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Hit detection
  // ---------------------------------------------------------------------------

  /** AABB for attack hit check — used by scene update loop. */
  getHitAABB(): { x: number; y: number; width: number; height: number } {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }

  // ---------------------------------------------------------------------------
  // Destruction
  // ---------------------------------------------------------------------------

  /**
   * Break the secret wall — remove collision, hide visual, trigger
   * heavy camera shake + hitstop.
   *
   * Returns true if newly destroyed.
   *
   * The caller (scene) is responsible for:
   *   - mode "item": spawning an ItemDropEntity at the wall center
   *   - mode "passage": the cleared grid cells already allow passage
   */
  break(grid: number[][], game: Game, dirX: number): boolean {
    if (this.destroyed) return false;
    this.destroyed = true;
    this.container.visible = false;

    // Remove collision — path is now open
    for (const { col, row } of this.gridCells) {
      if (row >= 0 && row < grid.length && col >= 0 && col < (grid[0]?.length ?? 0)) {
        grid[row][col] = 0;
      }
    }
    this.gridCells = [];

    // Break feedback — heavier than normal hit
    this.onBreakFeedback(game, dirX);

    return true;
  }

  // ---------------------------------------------------------------------------
  // Hit flash feedback
  // ---------------------------------------------------------------------------

  /**
   * Call when the wall is hit. Applies camera shake + hitstop identical
   * to monster hits so the player feels the impact.
   *
   * @param game  Game instance for camera/hitstop access
   * @param dirX  Attack direction (-1 left, +1 right) for directional shake
   */
  onHit(game: Game, dirX: number): void {
    this.flashTimer = SecretWall.FLASH_DURATION;
    // Make hint cracks more visible momentarily
    this.hintGfx.alpha = 0.5;

    // Camera shake — directional, same as monster hit (HitManager technique 8)
    game.camera.shakeDirectional(HIT_SHAKE_INTENSITY, dirX, 0);

    // Hitstop — freeze frame, same as monster hit (HitManager technique 5)
    game.hitstopFrames = HIT_HITSTOP_FRAMES;
  }

  /**
   * Enhanced feedback on break — bigger shake + longer hitstop.
   * Called by break() internally when destruction succeeds.
   */
  private onBreakFeedback(game: Game, dirX: number): void {
    game.camera.shakeDirectional(BREAK_SHAKE_INTENSITY, dirX, 0);
    game.hitstopFrames = BREAK_HITSTOP_FRAMES;
  }

  update(dt: number): void {
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) {
        this.hintGfx.alpha = this.hintAlpha;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  destroy(): void {
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
  }

  /** Center position — useful for spawning items/particles. */
  get centerX(): number { return this.x + this.width / 2; }
  get centerY(): number { return this.y + this.height / 2; }
}
