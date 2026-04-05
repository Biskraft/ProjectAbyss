/**
 * Switch.ts — An attackable trigger that unlocks a linked LockedDoor.
 *
 * LDtk fields:
 *  - targetDoor (EntityRef): reference to the LockedDoor entity to unlock.
 *
 * When the player's attack hitbox overlaps the switch, it fires once and
 * visually changes to an "activated" state.
 */

import { Container, Graphics } from 'pixi.js';

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
    // Base
    this.gfx.rect(2, this.height - 6, this.width - 4, 6).fill({ color: 0x555555 });
    // Lever arm — upright
    const cx = this.width / 2;
    this.gfx.moveTo(cx, this.height - 6).lineTo(cx - 3, 2)
      .stroke({ color: 0xcc8833, width: 2 });
    // Knob
    this.gfx.circle(cx - 3, 2, 3).fill({ color: 0xffaa44 });
  }

  private drawActivated(): void {
    this.gfx.clear();
    // Base
    this.gfx.rect(2, this.height - 6, this.width - 4, 6).fill({ color: 0x555555 });
    // Lever arm — tilted right
    const cx = this.width / 2;
    this.gfx.moveTo(cx, this.height - 6).lineTo(cx + 5, 4)
      .stroke({ color: 0x887744, width: 2 });
    // Knob — dimmed
    this.gfx.circle(cx + 5, 4, 3).fill({ color: 0x887744 });
  }

  /** Activate the switch. Returns true if newly activated, false if already done. */
  activate(): boolean {
    if (this.activated) return false;
    this.activated = true;
    this.drawActivated();
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
