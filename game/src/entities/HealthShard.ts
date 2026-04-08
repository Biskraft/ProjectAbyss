/**
 * HealthShard.ts — Collectible that permanently increases max HP.
 *
 * Like Hollow Knight's Mask Shard. Placed in secret areas as exploration reward.
 * Once collected, saved permanently and never respawns.
 *
 * LDtk entity: HealthShard (16x16 fixed, pivot bottom-left)
 * Fields:
 *  - HpBonus (Int): HP increase amount (default 10)
 */

import { Container, Graphics } from 'pixi.js';

export class HealthShard {
  container: Container;
  x: number;
  y: number;
  width = 16;
  height = 16;
  hpBonus: number;
  collected = false;

  private gfx: Graphics;
  private timer = 0;

  constructor(x: number, y: number, hpBonus: number) {
    // Pivot bottom-left
    this.x = x;
    this.y = y - this.height;
    this.hpBonus = hpBonus;

    this.container = new Container();
    this.container.x = this.x;
    this.container.y = this.y;

    this.gfx = new Graphics();
    this.draw();
    this.container.addChild(this.gfx);
  }

  private draw(): void {
    this.gfx.clear();
    // Heart/shard shape — pink diamond with white core
    const cx = this.width / 2;
    const cy = this.height / 2;
    this.gfx.moveTo(cx, 2).lineTo(cx + 6, cy).lineTo(cx, this.height - 2).lineTo(cx - 6, cy).closePath()
      .fill({ color: 0xff4488, alpha: 0.9 });
    this.gfx.moveTo(cx, 5).lineTo(cx + 3, cy).lineTo(cx, this.height - 5).lineTo(cx - 3, cy).closePath()
      .fill({ color: 0xffffff, alpha: 0.5 });
  }

  update(dt: number): void {
    if (this.collected) return;
    // Gentle bob + glow pulse
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
