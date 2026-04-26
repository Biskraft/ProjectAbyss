/**
 * GoldPickup.ts — Collectible gold currency.
 *
 * Once collected, saved permanently and never respawns.
 *
 * LDtk entity: GoldPickup (16x16 fixed, pivot bottom-left)
 * Fields:
 *  - Amount (Int): gold amount (default 10)
 */

import { Container, Graphics } from 'pixi.js';

export class GoldPickup {
  container: Container;
  x: number;
  y: number;
  width = 16;
  height = 16;
  amount: number;
  /** Bob center Y. World-space for normal pickups, builder-local for pickups
   *  reparented under GiantBuilder. */
  baseY: number;
  collected = false;

  private gfx: Graphics;
  private timer = 0;

  constructor(x: number, y: number, amount: number) {
    this.x = x;
    this.y = y - this.height;
    this.baseY = this.y;
    this.amount = amount;

    this.container = new Container();
    this.container.x = this.x;
    this.container.y = this.y;

    this.gfx = new Graphics();
    this.draw();
    this.container.addChild(this.gfx);
  }

  private draw(): void {
    this.gfx.clear();
    // Gold coin shape
    const cx = this.width / 2;
    const cy = this.height / 2;
    this.gfx.circle(cx, cy, 5).fill({ color: 0xffd700, alpha: 0.9 });
    this.gfx.circle(cx, cy, 3).fill({ color: 0xffee88, alpha: 0.6 });
    this.gfx.circle(cx, cy, 5).stroke({ color: 0xcc9900, width: 1 });
  }

  update(dt: number): void {
    if (this.collected) return;
    this.timer += dt;
    this.container.y = this.baseY + Math.sin(this.timer * 0.003) * 2;
    this.gfx.alpha = 0.7 + Math.sin(this.timer * 0.005) * 0.3;
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
