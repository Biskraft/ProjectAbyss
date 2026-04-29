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

import { Assets, Container, Graphics, Rectangle, Sprite, Texture } from 'pixi.js';
import type { AABB } from '@core/Physics';
import { assetPath } from '@core/AssetLoader';

export type PropVariant = 'pipe' | 'panel' | 'crate' | 'debris' | 'crystal' | 'tallgrass';

const S = 32; // prop size (2x2 tiles)

/**
 * Artifact sprite sheet (breakable_01.png) — 256×256, 8 cols × 8 rows of 32×32.
 * Only 24 cells contain real artwork; the rest of the sheet is empty. The
 * coords below enumerate the populated cells so we never sample a blank tile.
 *   Row 0 (cols 0..7): assorted crates / containers          — 8 frames
 *   Row 1 (cols 0..7): barrels, debris pile, kiosks, etc.    — 8 frames
 *   Row 2 (cols 0..6): smaller barrels, bowls, sacks         — 7 frames
 *   Row 3 (col  0   ): industrial arm                        — 1 frame
 */
const ARTIFACT_SHEET = 'assets/sprites/breakable_01.png';
const ARTIFACT_FRAME_COORDS: ReadonlyArray<readonly [number, number]> = [
  [0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0],
  [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1],
  [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2],
  [0, 3],
];
const ARTIFACT_FRAME_COUNT = ARTIFACT_FRAME_COORDS.length; // 24
const ARTIFACT_VARIANTS: ReadonlySet<PropVariant> = new Set<PropVariant>([
  'pipe', 'panel', 'crate', 'debris',
]);
let artifactFrames: Texture[] | null = null;
let artifactLoadPromise: Promise<Texture[]> | null = null;

function loadArtifactFrames(): Promise<Texture[]> {
  if (artifactLoadPromise) return artifactLoadPromise;
  artifactLoadPromise = (async () => {
    const sheetTex = await Assets.load<Texture>(assetPath(ARTIFACT_SHEET));
    sheetTex.source.scaleMode = 'nearest';
    const out: Texture[] = [];
    for (const [col, row] of ARTIFACT_FRAME_COORDS) {
      out.push(new Texture({
        source: sheetTex.source,
        frame: new Rectangle(col * S, row * S, S, S),
      }));
    }
    artifactFrames = out;
    return out;
  })();
  return artifactLoadPromise;
}

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

  /**
   * For artifact variants whose sprite has finished loading, returns the
   * Texture so the shatter effect can slice it into sprite-chunk debris.
   * Returns null for procedural variants (crystal/tallgrass) or while the
   * sheet is still loading.
   */
  getArtifactTexture(): Texture | null {
    if (!ARTIFACT_VARIANTS.has(this.variant)) return null;
    if (!artifactFrames) return null;
    const frameIdx = (this.seed >>> 0) % ARTIFACT_FRAME_COUNT;
    return artifactFrames[frameIdx];
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

  /**
   * Render artifact variants (pipe/panel/crate/debris) using one of the 8
   * top-row frames from breakable_01.png. Frame index is seed-derived so the
   * same prop always picks the same sprite. Falls back to a placeholder
   * Graphics rect while the sheet is still loading.
   */
  private drawArtifactSprite(): void {
    const frameIdx = (this.seed >>> 0) % ARTIFACT_FRAME_COUNT;
    if (artifactFrames) {
      this.gfx.visible = false;
      const sp = new Sprite(artifactFrames[frameIdx]);
      this.container.addChild(sp);
      return;
    }
    // Placeholder until sheet is ready — neutral metal block.
    const g = this.gfx;
    g.rect(4, 4, S - 8, S - 8).fill(0x6a6a6a);
    g.rect(4, 4, S - 8, S - 8).stroke({ color: 0x4a4a4a, width: 1 });
    loadArtifactFrames().then(frames => {
      if (this.destroyed) return;
      g.clear();
      g.visible = false;
      const sp = new Sprite(frames[frameIdx]);
      this.container.addChild(sp);
    }).catch(() => { /* sheet missing — keep placeholder */ });
  }

  private draw(): void {
    if (ARTIFACT_VARIANTS.has(this.variant)) {
      this.drawArtifactSprite();
      return;
    }
    const g = this.gfx;
    const c = VARIANT_COLORS[this.variant];
    const rng = seededRandom(this.seed);

    switch (this.variant) {
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

/** Pick a random variant appropriate for the context.
 *  Natural variants (crystal/tallgrass) are tuned to ~40% of the pool. */
export function pickVariant(isItemWorld: boolean, rng: () => number): PropVariant {
  if (isItemWorld) {
    // Natural 40% (crystal 25 + tallgrass 15) / Artifacts 60% (pipe/crate/debris 20 each)
    const r = rng();
    if (r < 0.25) return 'crystal';
    if (r < 0.40) return 'tallgrass';
    if (r < 0.60) return 'pipe';
    if (r < 0.80) return 'crate';
    return 'debris';
  }
  // World: Natural 40% (tallgrass) / Artifacts 60% (pipe/crate/debris/panel 15 each)
  const r = rng();
  if (r < 0.40) return 'tallgrass';
  if (r < 0.55) return 'pipe';
  if (r < 0.70) return 'crate';
  if (r < 0.85) return 'debris';
  return 'panel';
}
