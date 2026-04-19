/**
 * LockedDoor.ts — A barrier that blocks passage until unlocked.
 *
 * Unlock conditions:
 *  - 'event':  unlocked externally via unlockDoors(eventName)
 *  - 'switch': player attacks the door to unlock it
 *  - 'stat':   player attacks the door AND meets a stat threshold (e.g. ATK >= 40)
 *
 * Renders as a solid colored rect matching the entity size.
 * Injects collision tiles into the grid on spawn, removes them on unlock.
 */

import { Container, Graphics, Text, TextStyle } from 'pixi.js';

/**
 * Build a small hammer pictogram (no language text) hinting the upgrade altar.
 * See Playtest 2026-04-17 §9.6-T3: gate must point to its own solution.
 */
function buildHammerIcon(): Graphics {
  const g = new Graphics();
  // Handle (diagonal wooden rod)
  g.rect(0, 4, 8, 2).fill(0xc8854a);
  g.rect(0, 4, 8, 2).stroke({ color: 0x5a3a1a, width: 1 });
  // Head (steel block)
  g.rect(6, 1, 5, 5).fill(0xcfd6dd);
  g.rect(6, 1, 5, 5).stroke({ color: 0x444b55, width: 1 });
  return g;
}

const TILE_SIZE = 16;

export type UnlockCondition = 'event' | 'switch' | 'stat';

export class LockedDoor {
  container: Container;
  x: number;
  y: number;
  width: number;
  height: number;

  /** LDtk entity instance ID — used by Switch entity references. */
  iid: string;
  /** For 'event' condition: the event name that unlocks this door. */
  unlockEvent: string;
  /** What kind of condition unlocks this door. */
  unlockCondition: UnlockCondition;
  /** For 'stat' condition: which stat to check (e.g. 'atk'). */
  statType: string;
  /** For 'stat' condition: minimum stat value required. */
  statThreshold: number;

  locked = true;

  private gfx: Graphics;
  private label: Text | null = null;
  /** Hammer pictogram shown on stat gates — points the player to the altar. */
  private hammerIcon: Graphics | null = null;
  /** Red X shown on rejected attack (stat insufficient). */
  private rejectCross: Graphics | null = null;
  /** Collision grid cells this door occupies — stored for removal on unlock. */
  private gridCells: { col: number; row: number }[] = [];

  /** Reject animation timer (ms remaining). */
  private rejectTimer = 0;
  private rejectShakeOffset = 0;

  constructor(
    x: number, y: number,
    width: number, height: number,
    iid: string,
    unlockCondition: UnlockCondition,
    unlockEvent: string,
    statType: string,
    statThreshold: number,
  ) {
    // Pivot bottom-left
    this.x = x;
    this.y = y - height;
    this.width = width;
    this.height = height;
    this.iid = iid;
    this.unlockCondition = unlockCondition;
    this.unlockEvent = unlockEvent;
    this.statType = statType;
    this.statThreshold = statThreshold;

    this.container = new Container();
    this.container.x = this.x;
    this.container.y = this.y;

    this.gfx = new Graphics();
    this.drawDoor();
    this.container.addChild(this.gfx);

    // Show stat threshold label for 'stat' condition doors
    if (unlockCondition === 'stat' && statThreshold > 0) {
      const style = new TextStyle({
        fontFamily: 'monospace',
        fontSize: 8,
        fill: 0xff4444,
        align: 'center',
        fontWeight: 'bold',
      });
      this.label = new Text({ text: `${statType.toUpperCase()} ${statThreshold}`, style });
      this.label.anchor.set(0.5, 0.5);
      this.label.x = width / 2;
      this.label.y = height / 2 - 6;
      this.container.addChild(this.label);

      // A8/T3: hammer pictogram below the stat number points at the solution.
      this.hammerIcon = buildHammerIcon();
      // Center the ~11x6 hammer horizontally under the label
      this.hammerIcon.x = width / 2 - 5;
      this.hammerIcon.y = height / 2 + 2;
      this.container.addChild(this.hammerIcon);

      // Reject-state cross (hidden by default, flashed on failed attack)
      this.rejectCross = new Graphics();
      this.rejectCross.moveTo(-4, -4).lineTo(4, 4).stroke({ color: 0xff2222, width: 2 });
      this.rejectCross.moveTo(4, -4).lineTo(-4, 4).stroke({ color: 0xff2222, width: 2 });
      this.rejectCross.x = width / 2;
      this.rejectCross.y = height / 2 - 6;
      this.rejectCross.visible = false;
      this.container.addChild(this.rejectCross);
    }
  }

  private drawDoor(): void {
    this.gfx.clear();
    const color = this.unlockCondition === 'stat' ? 0x994422 : 0x8b4513;
    this.gfx.rect(0, 0, this.width, this.height).fill({ color, alpha: 0.9 });
    this.gfx.rect(0, 0, this.width, this.height).stroke({ color: 0x5a2d0c, width: 1 });
    this.gfx.rect(2, 2, this.width - 4, this.height - 4).stroke({ color: 0xa0522d, width: 1 });

    // Stat doors get crack lines to hint at destructibility
    if (this.unlockCondition === 'stat' || this.unlockCondition === 'switch') {
      this.gfx.moveTo(4, this.height * 0.3)
        .lineTo(this.width * 0.4, this.height * 0.5)
        .lineTo(6, this.height * 0.7)
        .stroke({ color: 0x332211, width: 1 });
      this.gfx.moveTo(this.width - 4, this.height * 0.25)
        .lineTo(this.width * 0.6, this.height * 0.45)
        .lineTo(this.width - 6, this.height * 0.65)
        .stroke({ color: 0x332211, width: 1 });
    }
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

  /**
   * Try to unlock via player attack. Returns result:
   *  - 'unlocked': door opens
   *  - 'rejected': stat too low, plays reject animation
   *  - 'ignored':  this door doesn't respond to attacks (event-type)
   */
  tryAttackUnlock(playerStats: Record<string, number>, grid: number[][]): 'unlocked' | 'rejected' | 'ignored' {
    if (!this.locked) return 'ignored';

    // 'event' and 'switch' doors don't respond to direct attacks.
    // 'switch' doors are unlocked by hitting a linked Switch entity.
    if (this.unlockCondition === 'event' || this.unlockCondition === 'switch') return 'ignored';

    if (this.unlockCondition === 'stat') {
      const val = playerStats[this.statType] ?? 0;
      if (val >= this.statThreshold) {
        this.unlock(grid);
        return 'unlocked';
      }
      this.reject();
      return 'rejected';
    }

    return 'ignored';
  }

  /** Remove collision and hide the door with a brief break effect. */
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

  /** Play reject animation — shake + red flash. */
  private reject(): void {
    this.rejectTimer = 400; // ms
  }

  /** Call every frame with dt in ms. */
  update(dt: number): void {
    if (this.rejectTimer > 0) {
      this.rejectTimer -= dt;
      // Shake horizontally
      this.rejectShakeOffset = Math.sin(this.rejectTimer * 0.05) * 3;
      this.container.x = this.x + this.rejectShakeOffset;

      // Flash red tint + show cross over the stat requirement
      const flash = Math.sin(this.rejectTimer * 0.02) > 0;
      if (this.label) this.label.style.fill = flash ? 0xff0000 : 0xff4444;
      if (this.rejectCross) this.rejectCross.visible = flash;
      // Pulse the hammer hint to say "this is how you solve it"
      if (this.hammerIcon) this.hammerIcon.alpha = 0.6 + Math.abs(Math.sin(this.rejectTimer * 0.03)) * 0.4;

      if (this.rejectTimer <= 0) {
        this.rejectTimer = 0;
        this.container.x = this.x;
        if (this.label) this.label.style.fill = 0xff4444;
        if (this.rejectCross) this.rejectCross.visible = false;
        if (this.hammerIcon) this.hammerIcon.alpha = 1;
      }
    }
  }

  /** Get the door's AABB for hit detection. */
  getHitAABB(): { x: number; y: number; width: number; height: number } {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }

  destroy(): void {
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
  }
}
