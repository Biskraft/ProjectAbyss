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

  private halo: Graphics;
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

    // Halo drawn first so the shard sits on top.
    this.halo = new Graphics();
    this.container.addChild(this.halo);

    this.gfx = new Graphics();
    this.drawShard();
    this.container.addChild(this.gfx);
  }

  /**
   * Draw the shard ~80% larger than the 16x16 AABB so it pops against
   * the world tiles. Pickup hitbox stays 16x16 (LDtk-aligned), but the
   * visual extends outward from the 16x16 anchor's center (8, 8).
   * Playtest 2026-04-27: "max HP +10 아이템 아이콘이 너무 작다" feedback.
   */
  private drawShard(): void {
    this.gfx.clear();
    const cx = this.width / 2;   // 8
    const cy = this.height / 2;  // 8
    const halfW = 11;            // diamond half-width (was 6)
    const halfH = 13;            // diamond half-height (was ~6)

    // Dark outline for contrast on bright/orange backgrounds.
    this.gfx.moveTo(cx, cy - halfH - 1)
      .lineTo(cx + halfW + 1, cy)
      .lineTo(cx, cy + halfH + 1)
      .lineTo(cx - halfW - 1, cy)
      .closePath()
      .fill({ color: 0x22000a, alpha: 0.95 });

    // Main pink fill.
    this.gfx.moveTo(cx, cy - halfH)
      .lineTo(cx + halfW, cy)
      .lineTo(cx, cy + halfH)
      .lineTo(cx - halfW, cy)
      .closePath()
      .fill({ color: 0xff4488, alpha: 1.0 });

    // Brighter inner highlight for "gem facet" look.
    this.gfx.moveTo(cx, cy - halfH + 3)
      .lineTo(cx + halfW - 4, cy)
      .lineTo(cx, cy + halfH - 3)
      .lineTo(cx - halfW + 4, cy)
      .closePath()
      .fill({ color: 0xffaad0, alpha: 0.9 });

    // White core sparkle.
    this.gfx.circle(cx - 2, cy - 3, 1.5).fill({ color: 0xffffff, alpha: 0.95 });
  }

  update(dt: number): void {
    if (this.collected) return;
    this.timer += dt;
    const t = this.timer / 1000;

    // Bob.
    this.container.y = this.y + Math.sin(this.timer * 0.003) * 2;

    // Pulsing halo so the shard reads from across the room.
    this.halo.clear();
    const cx = this.width / 2;
    const cy = this.height / 2;
    const outerR = 13 + Math.sin(t * 2.0) * 3;
    const outerA = 0.18 + Math.sin(t * 2.0) * 0.10;
    const innerR = 8 + Math.sin(t * 3.5) * 1.5;
    const innerA = 0.28 + Math.sin(t * 3.5) * 0.12;
    this.halo.circle(cx, cy, outerR).fill({ color: 0xff66aa, alpha: Math.max(0, outerA) });
    this.halo.circle(cx, cy, innerR).fill({ color: 0xffccdd, alpha: Math.max(0, innerA) });

    // Gentle alpha pulse on the shard itself.
    this.gfx.alpha = 0.85 + Math.sin(this.timer * 0.005) * 0.15;
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
