/**
 * BreakableProp.ts — Procedurally placed destructible world objects.
 *
 * 1-hit destroy. Spawns gold/flask pickups based on drop table.
 * Zelda grass / Hollow Knight pots equivalent for megastructure world.
 *
 * All props are 2x2 tiles (32x32 px). Anchored bottom-left.
 *
 * Variants:
 *   pipe       — rusted vertical pipe section
 *   panel      — cracked wall panel on floor
 *   crate      — small metal container
 *   debris     — concrete+rebar pile
 *   crystal    — rust crystal (item world only)
 *   tallgrass  — tall industrial moss/weed, sways gently
 */

import { Container, Graphics } from 'pixi.js';
import type { AABB } from '@core/Physics';

export type PropVariant = 'pipe' | 'panel' | 'crate' | 'debris' | 'crystal' | 'tallgrass';

const S = 32; // prop size (2x2 tiles)

// Visual palette per variant
const VARIANT_COLORS: Record<PropVariant, { base: number; accent: number; detail: number }> = {
  pipe:      { base: 0x5a5a5a, accent: 0x8b4513, detail: 0x444444 },
  panel:     { base: 0x6a6a6a, accent: 0x555555, detail: 0x4a4a4a },
  crate:     { base: 0x7a6a50, accent: 0x5a4a30, detail: 0x8a7a60 },
  debris:    { base: 0x707070, accent: 0x505050, detail: 0x606060 },
  crystal:   { base: 0x8b4513, accent: 0xcc6633, detail: 0xff8844 },
  tallgrass: { base: 0x3a6633, accent: 0x4a8844, detail: 0x2a5522 },
};

// Drop table weights (out of 100)
const DROP_NONE = 50;
const DROP_GOLD = 35;
const DROP_FLASK = 10;

export interface PropDrop {
  type: 'none' | 'gold' | 'flask';
  amount: number;
}

/** Simple seeded random for deterministic placement */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

export class BreakableProp {
  readonly container: Container;
  readonly variant: PropVariant;
  x: number;
  y: number;
  width = S;
  height = S;
  destroyed = false;

  private gfx: Graphics;
  private seed: number;
  private swayTimer = 0;
  private swayOffset: number;

  constructor(x: number, y: number, variant: PropVariant, seed = 0) {
    // Anchor bottom-left: y is the floor tile, prop extends upward
    this.x = x;
    this.y = y - S;
    this.variant = variant;
    this.seed = seed;
    this.swayOffset = (seed & 0xff) / 255 * Math.PI * 2;

    this.container = new Container();
    this.container.x = this.x;
    this.container.y = this.y;

    this.gfx = new Graphics();
    this.draw();
    this.container.addChild(this.gfx);
  }

  getAABB(): AABB {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }

  break(): PropDrop {
    if (this.destroyed) return { type: 'none', amount: 0 };
    this.destroyed = true;
    this.container.visible = false;
    return this.rollDrop();
  }

  getParticleColor(): number {
    return VARIANT_COLORS[this.variant].base;
  }

  getAccentColor(): number {
    return VARIANT_COLORS[this.variant].accent;
  }

  update(dt: number): void {
    if (this.destroyed) return;
    if (this.variant === 'tallgrass') {
      this.swayTimer += dt;
      // Gentle sway via skew
      const sway = Math.sin(this.swayTimer * 0.002 + this.swayOffset) * 0.04;
      this.gfx.skew.x = sway;
    }
  }

  private rollDrop(): PropDrop {
    const rand = seededRandom(this.seed + this.x * 7 + this.y * 13);
    const roll = Math.floor(rand() * 100);
    if (roll < DROP_NONE) return { type: 'none', amount: 0 };
    if (roll < DROP_NONE + DROP_GOLD) return { type: 'gold', amount: 1 + Math.floor(rand() * 3) };
    if (roll < DROP_NONE + DROP_GOLD + DROP_FLASK) return { type: 'flask', amount: 1 };
    return { type: 'gold', amount: 3 + Math.floor(rand() * 5) };
  }

  private draw(): void {
    const g = this.gfx;
    const c = VARIANT_COLORS[this.variant];
    const rng = seededRandom(this.seed);

    switch (this.variant) {
      case 'pipe': {
        // Vertical pipe — 2 tiles tall
        const pw = 6 + Math.floor(rng() * 4);
        const px = (S - pw) / 2;
        g.rect(px, 0, pw, S).fill(c.base);
        // Rust patches
        g.rect(px + 1, 5, 3, 4).fill({ color: c.accent, alpha: 0.7 });
        g.rect(px + 2, 18, 4, 3).fill({ color: c.accent, alpha: 0.5 });
        // Joint ring
        g.rect(px - 1, S / 2 - 1, pw + 2, 3).fill(c.detail);
        // Highlight
        g.rect(px, 0, 1, S).fill({ color: 0xffffff, alpha: 0.08 });
        break;
      }
      case 'panel': {
        // Fallen panel leaning on ground — flush with floor
        const pw = S - 4;
        const ph = 10;
        g.rect(2, S - ph, pw, ph).fill(c.base);
        g.rect(2, S - ph, pw, ph).stroke({ color: c.detail, width: 1 });
        // Crack lines
        g.moveTo(6, S - ph).lineTo(S - 8, S).stroke({ color: c.accent, width: 1 });
        g.moveTo(S / 2, S - ph).lineTo(S / 2 + 4, S - 1).stroke({ color: c.accent, width: 1, alpha: 0.6 });
        // Bolts
        g.circle(5, S - ph + 3, 1).fill(c.detail);
        g.circle(S - 7, S - ph + 3, 1).fill(c.detail);
        break;
      }
      case 'crate': {
        // Metal container — sits flush on floor
        const cs = 20;
        const ox = (S - cs) / 2;
        const oy = S - cs;
        g.rect(ox, oy, cs, cs).fill(c.base);
        g.rect(ox, oy, cs, cs).stroke({ color: c.accent, width: 1 });
        // Cross straps
        g.moveTo(ox + 3, oy + 3).lineTo(ox + cs - 3, oy + cs - 3).stroke({ color: c.detail, width: 1 });
        g.moveTo(ox + cs - 3, oy + 3).lineTo(ox + 3, oy + cs - 3).stroke({ color: c.detail, width: 1 });
        // Handle
        g.rect(ox + cs / 2 - 3, oy - 2, 6, 3).fill(c.accent);
        break;
      }
      case 'debris': {
        // Rubble pile — flush with floor
        g.rect(2, S - 10, 12, 10).fill(c.base);
        g.rect(10, S - 14, 14, 14).fill(c.detail);
        g.rect(6, S - 4, 18, 4).fill(c.accent);
        // Rebar sticking up
        g.rect(18, S - 22, 2, 22).fill({ color: 0x8b4513, alpha: 0.8 });
        g.rect(8, S - 18, 2, 18).fill({ color: 0x8b4513, alpha: 0.6 });
        // Small fragment
        g.rect(24, S - 4, 4, 4).fill({ color: c.base, alpha: 0.5 });
        break;
      }
      case 'crystal': {
        // Rust crystal cluster — multiple shards
        const cx = S / 2;
        // Main shard — flush with floor
        g.moveTo(cx, 2).lineTo(cx + 8, S).lineTo(cx - 8, S).closePath().fill(c.base);
        g.moveTo(cx, 6).lineTo(cx + 5, S - 2).lineTo(cx - 5, S - 2).closePath().fill({ color: c.detail, alpha: 0.4 });
        // Smaller side shard
        g.moveTo(cx - 6, 10).lineTo(cx - 2, S).lineTo(cx - 10, S).closePath().fill({ color: c.base, alpha: 0.7 });
        // Inner glow
        g.circle(cx, S / 2 + 4, 4).fill({ color: c.accent, alpha: 0.3 });
        g.circle(cx, S / 2 + 4, 2).fill({ color: 0xffffff, alpha: 0.15 });
        break;
      }
      case 'tallgrass': {
        // Industrial moss/weed — multiple blades growing from base
        const bladeCount = 4 + Math.floor(rng() * 4);
        for (let i = 0; i < bladeCount; i++) {
          const bx = 4 + rng() * (S - 8);
          const bh = 14 + rng() * 16;
          const bw = 2 + rng() * 2;
          const lean = (rng() - 0.5) * 6;
          const shade = rng() > 0.5 ? c.base : c.accent;

          // Blade: bottom to top, slight lean
          g.moveTo(bx, S)
            .lineTo(bx + lean - bw / 2, S - bh)
            .lineTo(bx + lean + bw / 2, S - bh)
            .lineTo(bx + bw, S)
            .closePath()
            .fill({ color: shade, alpha: 0.8 + rng() * 0.2 });
        }
        // Dark base roots
        g.rect(2, S - 3, S - 4, 3).fill({ color: c.detail, alpha: 0.5 });
        break;
      }
    }
  }

  destroy(): void {
    if (this.container.parent) this.container.parent.removeChild(this.container);
    this.container.destroy({ children: true });
  }
}

/** Pick a random variant appropriate for the context */
export function pickVariant(isItemWorld: boolean, rng: () => number): PropVariant {
  if (isItemWorld) {
    const r = rng();
    if (r < 0.35) return 'crystal';
    if (r < 0.55) return 'crate';
    if (r < 0.70) return 'debris';
    if (r < 0.85) return 'pipe';
    return 'tallgrass';
  }
  const r = rng();
  if (r < 0.25) return 'tallgrass';
  if (r < 0.45) return 'pipe';
  if (r < 0.60) return 'crate';
  if (r < 0.75) return 'debris';
  if (r < 0.90) return 'panel';
  return 'tallgrass';
}
