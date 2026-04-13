/**
 * HealingPickup.ts — Tiered healing item that restores HP on pickup.
 *
 * GDD System_Healing_Recovery.md §4 — 3-tier drop system:
 *   Small  (Ember Shard)  — 10% maxHP, green cross
 *   Medium (Forge Ember)  — 25% maxHP, blue cross
 *   Large  (Anvil Flame)  — 50% maxHP, gold cross
 *
 * LDtk entity: HealingPickup (16x16 fixed, pivot bottom-left)
 * Fields:
 *  - HealAmount (Int): HP to restore (default 30)
 */

import { Container, Graphics } from 'pixi.js';

export type HealingTier = 'small' | 'medium' | 'large';

const TIER_COLORS: Record<HealingTier, number> = {
  small:  0x44ff44, // green
  medium: 0x44aaff, // blue
  large:  0xffd700, // gold
};

const TIER_SIZES: Record<HealingTier, { cross: number; center: number }> = {
  small:  { cross: 4, center: 2 },
  medium: { cross: 5, center: 2 },
  large:  { cross: 6, center: 3 },
};

export class HealingPickup {
  container: Container;
  x: number;
  y: number;
  width = 16;
  height = 16;
  healAmount: number;
  tier: HealingTier;
  collected = false;

  private gfx: Graphics;
  private timer = 0;

  constructor(x: number, y: number, healAmount: number, tier: HealingTier = 'small') {
    this.x = x;
    this.y = y - this.height;
    this.healAmount = healAmount;
    this.tier = tier;

    this.container = new Container();
    this.container.x = this.x;
    this.container.y = this.y;

    this.gfx = new Graphics();
    this.draw();
    this.container.addChild(this.gfx);
  }

  private draw(): void {
    this.gfx.clear();
    const color = TIER_COLORS[this.tier];
    const { cross, center } = TIER_SIZES[this.tier];
    const cx = this.width / 2;
    const cy = this.height / 2;
    const half = Math.floor(cross / 2);
    const arm = cross + 1;
    // Cross shape
    this.gfx.rect(cx - half, cy - arm, cross, arm * 2).fill({ color, alpha: 0.9 });
    this.gfx.rect(cx - arm, cy - half, arm * 2, cross).fill({ color, alpha: 0.9 });
    // White center
    const ch = Math.floor(center / 2);
    this.gfx.rect(cx - ch, cy - ch, center, center).fill({ color: 0xffffff, alpha: 0.7 });

    // Large tier: extra glow ring
    if (this.tier === 'large') {
      this.gfx.circle(cx, cy, 9).stroke({ color, width: 1, alpha: 0.4 });
    }
  }

  update(dt: number): void {
    if (this.collected) return;
    this.timer += dt;
    // Larger tiers bob faster for visual distinction
    const bobSpeed = this.tier === 'large' ? 0.005 : this.tier === 'medium' ? 0.004 : 0.003;
    this.container.y = this.y + Math.sin(this.timer * bobSpeed) * 2;
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

// --- Drop helpers (GDD §4.1 parameters) ---

/** Create an Ember Shard (small): 10% maxHP */
export function createEmberShard(x: number, y: number, playerMaxHp: number): HealingPickup {
  return new HealingPickup(x, y, Math.max(1, Math.floor(playerMaxHp * 0.10)), 'small');
}

/** Create a Forge Ember (medium): 25% maxHP */
export function createForgeEmber(x: number, y: number, playerMaxHp: number): HealingPickup {
  return new HealingPickup(x, y, Math.max(1, Math.floor(playerMaxHp * 0.25)), 'medium');
}

/** Create an Anvil Flame (large): 50% maxHP */
export function createAnvilFlame(x: number, y: number, playerMaxHp: number): HealingPickup {
  return new HealingPickup(x, y, Math.max(1, Math.floor(playerMaxHp * 0.50)), 'large');
}
