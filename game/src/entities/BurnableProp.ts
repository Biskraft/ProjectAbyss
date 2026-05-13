/**
 * BurnableProp — Tier B procedural burnable objects.
 *
 * Sprite-based entities that occupy 1+ cell footprints and react to the
 * TileMutator fire propagation. When a neighbouring cell (or another
 * BurnableProp) ignites, this prop catches fire, animates, and after
 * `burnMs` is consumed: removes itself from the scene + clears its
 * footprint cells from the mutator registry.
 *
 * Visual placeholders (Pixi Graphics primitives) ship now; replace with
 * sprite atlas once art assets land. Catalog entry has `assetPath?: string`
 * slot reserved for that swap.
 *
 * GDD: Documents/System/System_World_TileSystem.md §7.2.2
 */

import { Container, Graphics, BlurFilter } from 'pixi.js';

export type BurnableAnchor = 'floor' | 'ceiling' | 'free';

export interface BurnableSpec {
  /** Display name (debug / DEC log). */
  name: string;
  /** Cell footprint width × height. */
  cells: [number, number];
  /** Total burn duration once ignited (ms). */
  burnMs: number;
  /** Hit points (each non-fire attack does 1 dmg; 0 → destroy). */
  hp: number;
  /** Anchoring rule for spawn — fits placement to a floor or ceiling neighbour. */
  anchor: BurnableAnchor;
  /** Chance (0..1) of catching fire from a burning neighbour each spread tick. */
  ignitionChance: number;
  /** Base body color for placeholder graphics. */
  bodyColor: number;
  /** Accent color (rivets, leaf tips, etc). */
  accentColor: number;
  /** Optional sprite atlas path — null = use placeholder Graphics. */
  assetPath?: string | null;
}

// burnMs — shippable showcase values. 원소 화염 연쇄가 핵심 메카닉이라
// 플레이어가 점화 → 확산 → 잔존 시퀀스를 관전할 수 있도록 의도적으로 김.
export const BURNABLE_CATALOG = {
  WoodCrate: {
    name: 'Wood Crate', cells: [1, 1], burnMs: 12500, hp: 1, anchor: 'floor',
    ignitionChance: 0.45, bodyColor: 0xA6743C, accentColor: 0x5A3A1E,
  },
  BranchPile: {
    name: 'Branch Pile', cells: [1, 1], burnMs: 4000, hp: 1, anchor: 'floor',
    ignitionChance: 0.85, bodyColor: 0x6E4823, accentColor: 0x3B260F,
  },
  Bush: {
    name: 'Bush', cells: [1, 1], burnMs: 10000, hp: 1, anchor: 'floor',
    ignitionChance: 0.90, bodyColor: 0x5D8A3A, accentColor: 0x2E4A1A,
  },
  Curtain: {
    name: 'Curtain', cells: [1, 3], burnMs: 6000, hp: 1, anchor: 'ceiling',
    ignitionChance: 0.75, bodyColor: 0x884444, accentColor: 0x442222,
  },
  Vine: {
    name: 'Vine', cells: [1, 3], burnMs: 4500, hp: 1, anchor: 'ceiling',
    ignitionChance: 0.70, bodyColor: 0x4A6E3A, accentColor: 0x294020,
  },
} as const satisfies Record<string, BurnableSpec>;

export type BurnablePropId = keyof typeof BURNABLE_CATALOG;

/** Returns true if `id` is a valid catalog id. */
export function isBurnablePropId(id: string): id is BurnablePropId {
  return id in BURNABLE_CATALOG;
}

/** Pick a catalog id appropriate for a BurnableZone Type field. */
export function pickPropForZone(
  zoneType: 'Grass' | 'Wood' | 'Mixed',
  rng: () => number,
  anchorPreference: BurnableAnchor,
): BurnablePropId | null {
  const pool: BurnablePropId[] = [];
  for (const id of Object.keys(BURNABLE_CATALOG) as BurnablePropId[]) {
    const spec = BURNABLE_CATALOG[id];
    if (anchorPreference !== 'free' && spec.anchor !== anchorPreference) continue;
    if (zoneType === 'Grass') {
      if (id === 'Bush' || id === 'BranchPile' || id === 'Vine') pool.push(id);
    } else if (zoneType === 'Wood') {
      if (id === 'WoodCrate' || id === 'BranchPile' || id === 'Curtain') pool.push(id);
    } else {
      pool.push(id);
    }
  }
  if (!pool.length) return null;
  return pool[Math.floor(rng() * pool.length)];
}

// ============================================================
// Runtime entity
// ============================================================

export class BurnableProp {
  readonly id: BurnablePropId;
  readonly spec: BurnableSpec;
  /** Top-left cell of footprint (gx, gy). */
  readonly gx: number;
  readonly gy: number;
  readonly cellW: number;
  readonly cellH: number;
  /** Top-left pixel position. */
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;

  hp: number;
  burning = false;
  burnRemainingMs = 0;
  destroyed = false;

  readonly container = new Container();
  private body!: Graphics;
  private fireGfx: Graphics | null = null;
  /** Separate Graphics with BlurFilter for the prop's light-source halo. */
  private fireHaloGfx: Graphics | null = null;
  private flickerT = 0;

  constructor(id: BurnablePropId, gx: number, gy: number, tileSize = 16) {
    this.id = id;
    this.spec = BURNABLE_CATALOG[id];
    this.gx = gx; this.gy = gy;
    this.cellW = this.spec.cells[0];
    this.cellH = this.spec.cells[1];
    this.x = gx * tileSize;
    this.y = gy * tileSize;
    this.width = this.cellW * tileSize;
    this.height = this.cellH * tileSize;
    this.hp = this.spec.hp;

    this.container.x = this.x;
    this.container.y = this.y;
    this.drawBody();
  }

  /** Cell footprint as gx/gy pairs. */
  getCells(): Array<[number, number]> {
    const out: Array<[number, number]> = [];
    for (let dy = 0; dy < this.cellH; dy++) {
      for (let dx = 0; dx < this.cellW; dx++) {
        out.push([this.gx + dx, this.gy + dy]);
      }
    }
    return out;
  }

  containsCell(gx: number, gy: number): boolean {
    return gx >= this.gx && gx < this.gx + this.cellW &&
           gy >= this.gy && gy < this.gy + this.cellH;
  }

  ignite(): boolean {
    if (this.burning || this.destroyed) return false;
    this.burning = true;
    this.burnRemainingMs = this.spec.burnMs;
    this.spawnFireGfx();
    return true;
  }

  /** Non-fire damage (sword swing, etc). */
  takeDamage(amount: number): void {
    if (this.destroyed) return;
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.destroyed = true;
    }
  }

  update(dtMs: number): void {
    if (this.destroyed) return;
    if (!this.burning) return;
    this.burnRemainingMs -= dtMs;
    this.flickerT += dtMs;
    if (this.fireGfx) this.animateFire();
    if (this.burnRemainingMs <= 0) {
      this.burnRemainingMs = 0;
      this.destroyed = true;
    }
  }

  /** Caller (scene) invokes after detecting destroyed=true. Removes graphics. */
  destroy(): void {
    this.destroyed = true;
    if (this.container.parent) this.container.parent.removeChild(this.container);
    this.container.destroy({ children: true });
  }

  // === Visuals (placeholder until sprite atlas lands) ===

  private drawBody(): void {
    this.body = new Graphics();
    const w = this.width, h = this.height;
    const body = this.spec.bodyColor;
    const acc = this.spec.accentColor;

    switch (this.id) {
      case 'WoodCrate': {
        // Box with cross-strap (4 wood planks)
        this.body
          .rect(1, 4, w - 2, h - 5).fill(body)
          .rect(1, 4, w - 2, 1).fill(acc)
          .rect(1, h - 2, w - 2, 1).fill(acc)
          .moveTo(1, 4).lineTo(w - 1, h - 1).stroke({ color: acc, width: 1 })
          .moveTo(w - 1, 4).lineTo(1, h - 1).stroke({ color: acc, width: 1 });
        break;
      }
      case 'BranchPile': {
        // Crossed sticks pile — dark mound + 3 angular lines
        this.body
          .ellipse(w / 2, h - 2, w / 2 - 1, 3).fill(body)
          .moveTo(2, h - 4).lineTo(w - 2, h - 8).stroke({ color: acc, width: 1.5 })
          .moveTo(w - 2, h - 4).lineTo(2, h - 8).stroke({ color: acc, width: 1.5 })
          .moveTo(w / 2, h - 3).lineTo(w / 2 + 1, h - 9).stroke({ color: body, width: 1.5 });
        break;
      }
      case 'Bush': {
        // Rounded clump — 3 overlapping circles
        const baseY = h - 3;
        this.body
          .circle(w / 2, baseY - 3, 5).fill(body)
          .circle(w / 2 - 4, baseY - 1, 4).fill(body)
          .circle(w / 2 + 4, baseY - 1, 4).fill(body)
          .circle(w / 2, baseY - 5, 2).fill(acc)
          .rect(0, h - 2, w, 2).fill(acc); // grounding shadow line
        break;
      }
      case 'Curtain': {
        // Vertical fabric strip with rod + bottom taper
        this.body
          .rect(1, 0, w - 2, 2).fill(acc)            // rod
          .rect(2, 2, w - 4, h - 6).fill(body)       // fabric
          .moveTo(2, h - 4).lineTo(w / 2, h - 1).lineTo(w - 2, h - 4)
          .fill(body)                                 // tapered hem
          .rect(w / 2 - 1, 2, 2, h - 6).fill(acc);   // center pleat
        break;
      }
      case 'Vine': {
        // Wavy vertical line + leaf clusters
        this.body
          .rect(w / 2 - 1, 0, 2, h).fill(acc);       // stem
        for (let i = 4; i < h - 2; i += 6) {
          const offX = (i / 6) % 2 === 0 ? -3 : 3;
          this.body.circle(w / 2 + offX, i, 3).fill(body);
        }
        this.body.circle(w / 2, h - 2, 2).fill(body); // tip
        break;
      }
      default: {
        // Fallback rect
        if (this.spec.anchor === 'ceiling') {
          this.body.rect(2, 0, w - 4, h - 2).fill(body).rect(2, 0, w - 4, 2).fill(acc);
        } else {
          this.body.rect(1, 2, w - 2, h - 3).fill(body).rect(1, h - 3, w - 2, 2).fill(acc);
        }
      }
    }
    this.container.addChild(this.body);
  }

  private spawnFireGfx(): void {
    // Halo behind the prop body — drawn FIRST so flames render on top.
    // BlurFilter feathers the halo into a soft warm light bath. Added to the
    // container's parent index 0 so it lives "behind" via depth ordering.
    this.fireHaloGfx = new Graphics();
    const blur = new BlurFilter({ strength: 10, quality: 4 });
    this.fireHaloGfx.filters = [blur];
    this.container.addChildAt(this.fireHaloGfx, 0);
    this.fireGfx = new Graphics();
    this.container.addChild(this.fireGfx);
  }

  private animateFire(): void {
    if (!this.fireGfx) return;
    this.fireGfx.clear();
    const w = this.width, h = this.height;
    const lifeRatio = Math.max(0, this.burnRemainingMs / this.spec.burnMs);
    // ── Multi-strand teardrop flames (realistic fire silhouette) ──
    // Three independently-phased strands across the prop width. Tall center,
    // shorter shoulders. 4 color layers (red→orange→yellow→white core).
    const isCeiling = this.spec.anchor === 'ceiling';
    // For floor anchor: flames rise from prop top edge (y=0) upward (negative y).
    // For ceiling anchor: flames descend from prop bottom edge (y=h) downward.
    const baseY = isCeiling ? h : 0;
    const tallScale = lifeRatio * 1.0;             // fades with burn time
    const strands: Array<{ cx: number; phase: number; tall: number; wide: number }> = [
      { cx: w * 0.5, phase: this.flickerT * 0.018 + 0,  tall: 26 * tallScale, wide: 5.5 },
      { cx: w * 0.25, phase: this.flickerT * 0.020 + 1.3, tall: 18 * tallScale, wide: 4   },
      { cx: w * 0.75, phase: this.flickerT * 0.019 + 2.7, tall: 19 * tallScale, wide: 4.2 },
    ];
    for (const s of strands) {
      const wobble = 0.85 + Math.sin(s.phase) * 0.25;
      const flameH = s.tall * wobble;
      const flameW = s.wide * (0.9 + Math.sin(s.phase * 1.4) * 0.18);
      const swayX = Math.sin(s.phase * 0.7) * 1.6;
      const sx = s.cx + swayX;
      // Tip lies above (floor) or below (ceiling) the base.
      const tipY = isCeiling ? baseY + flameH : baseY - flameH;
      // Side bulge midpoint Y — between base and tip.
      const midY = isCeiling ? baseY + flameH * 0.45 : baseY - flameH * 0.45;
      const drawTeardrop = (halfW: number, hScale: number, color: number, alpha: number) => {
        const hh = flameH * hScale;
        const tY = isCeiling ? baseY + hh : baseY - hh;
        const mY = isCeiling ? baseY + hh * 0.45 : baseY - hh * 0.45;
        this.fireGfx!.moveTo(sx - halfW, baseY);
        this.fireGfx!.quadraticCurveTo(sx - halfW * 1.4, mY, sx, tY);
        this.fireGfx!.quadraticCurveTo(sx + halfW * 1.4, mY, sx + halfW, baseY);
        this.fireGfx!.closePath();
        this.fireGfx!.fill({ color, alpha: alpha * lifeRatio });
      };
      void tipY; void midY; // referenced by closure below via locals
      drawTeardrop(flameW * 1.20, 1.00, 0xff3311, 0.55);
      drawTeardrop(flameW * 0.85, 0.92, 0xff7722, 0.78);
      drawTeardrop(flameW * 0.55, 0.80, 0xffcc44, 0.85);
      drawTeardrop(flameW * 0.30, 0.62, 0xffffaa, 0.85);
    }
    // Embers — bright pixel sparks rising/falling along the flame column.
    if (Math.random() < 0.6) {
      const ex = Math.random() * w;
      const ey = isCeiling
        ? baseY + 14 + Math.random() * 12
        : baseY - 14 - Math.random() * 12;
      this.fireGfx.rect(ex | 0, ey | 0, 1, 1).fill({ color: 0xffee88, alpha: 0.95 });
    }
    if (Math.random() < 0.30) {
      const ex = Math.random() * w;
      const ey = isCeiling
        ? baseY + 8 + Math.random() * 18
        : baseY - 8 - Math.random() * 18;
      this.fireGfx.rect(ex | 0, ey | 0, 1, 1).fill({ color: 0xffffff, alpha: 0.9 });
    }
    // body tint while burning — darken as it chars
    this.body.tint = lifeRatio > 0.3 ? 0xffffff : 0x553322;

    // ── Light-source halo (behind body, soft pulse) ──
    if (this.fireHaloGfx) {
      const halo = this.fireHaloGfx;
      halo.clear();
      const haloPulse = 0.8 + Math.sin(this.flickerT * 0.008) * 0.2;
      const cx = w / 2;
      const cy = this.spec.anchor === 'ceiling' ? h * 0.25 : h * 0.55;
      // Outer wash — broad warm light extending past the prop edges
      halo.ellipse(cx, cy, w * 1.6 * haloPulse, h * 1.3 * haloPulse)
        .fill({ color: 0xff6622, alpha: 0.45 * lifeRatio });
      // Mid layer — hotter yellow
      halo.ellipse(cx, cy - 2, w * 1.0 * haloPulse, h * 0.8 * haloPulse)
        .fill({ color: 0xffaa44, alpha: 0.65 * lifeRatio });
      // Core — bright white-yellow
      halo.ellipse(cx, cy - 3, w * 0.5 * haloPulse, h * 0.4 * haloPulse)
        .fill({ color: 0xfff0aa, alpha: 0.85 * lifeRatio });
    }
  }
}
