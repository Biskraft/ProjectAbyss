/**
 * HealingPickup.ts — One-time healing item that restores HP on pickup.
 *
 * Once collected, saved permanently and never respawns.
 *
 * LDtk entity: HealingPickup (16x16 fixed, pivot bottom-left)
 * Fields:
 *  - HealAmount (Int): HP to restore (default 30)
 */

import { Container, Graphics } from 'pixi.js';

export class HealingPickup {
  container: Container;
  x: number;
  y: number;
  width = 16;
  height = 16;
  healAmount: number;
  collected = false;

  private gfx: Graphics;
  private timer = 0;

  constructor(x: number, y: number, healAmount: number) {
    this.x = x;
    this.y = y - this.height;
    this.healAmount = healAmount;

    this.container = new Container();
    this.container.x = this.x;
    this.container.y = this.y;

    this.gfx = new Graphics();
    this.draw();
    this.container.addChild(this.gfx);
  }

  private draw(): void {
    this.gfx.clear();
    // Green cross shape
    const cx = this.width / 2;
    const cy = this.height / 2;
    this.gfx.rect(cx - 2, cy - 5, 4, 10).fill({ color: 0x44ff44, alpha: 0.9 });
    this.gfx.rect(cx - 5, cy - 2, 10, 4).fill({ color: 0x44ff44, alpha: 0.9 });
    // White center
    this.gfx.rect(cx - 1, cy - 1, 2, 2).fill({ color: 0xffffff, alpha: 0.7 });
  }

  update(dt: number): void {
    if (this.collected) return;
    this.timer += dt;
    this.container.y = this.y + Math.sin(this.timer * 0.003) * 2;
    this.gfx.alpha = 0.7 + Math.sin(this.timer * 0.005) * 0.3;
  }

  getAABB(): { x: number; y: number; width: number; height: number } {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }

  collect(): void {
    this.collected = true;
    this.container.visible = false;
  }

  destroy(): void {
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
  }
}
