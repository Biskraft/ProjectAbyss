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

import { Container, Graphics } from 'pixi.js';

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

export const BURNABLE_CATALOG = {
  WoodCrate: {
    name: 'Wood Crate', cells: [1, 1], burnMs: 2500, hp: 1, anchor: 'floor',
    ignitionChance: 0.45, bodyColor: 0xA6743C, accentColor: 0x5A3A1E,
  },
  BranchPile: {
    name: 'Branch Pile', cells: [1, 1], burnMs: 800, hp: 1, anchor: 'floor',
    ignitionChance: 0.85, bodyColor: 0x6E4823, accentColor: 0x3B260F,
  },
  Bush: {
    name: 'Bush', cells: [1, 1], burnMs: 600, hp: 1, anchor: 'floor',
    ignitionChance: 0.90, bodyColor: 0x5D8A3A, accentColor: 0x2E4A1A,
  },
  Curtain: {
    name: 'Curtain', cells: [1, 3], burnMs: 1200, hp: 1, anchor: 'ceiling',
    ignitionChance: 0.75, bodyColor: 0x884444, accentColor: 0x442222,
  },
  Vine: {
    name: 'Vine', cells: [1, 3], burnMs: 900, hp: 1, anchor: 'ceiling',
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
    if (this.spec.anchor === 'ceiling') {
      // hangs from top — body fills downward from y=0
      this.body
        .rect(2, 0, w - 4, h - 2).fill(this.spec.bodyColor)
        .rect(2, 0, w - 4, 3).fill(this.spec.accentColor);
    } else {
      // floor / free — body sits at bottom
      this.body
        .rect(1, 2, w - 2, h - 3).fill(this.spec.bodyColor)
        .rect(1, h - 3, w - 2, 2).fill(this.spec.accentColor);
    }
    this.container.addChild(this.body);
  }

  private spawnFireGfx(): void {
    this.fireGfx = new Graphics();
    this.container.addChild(this.fireGfx);
  }

  private animateFire(): void {
    if (!this.fireGfx) return;
    this.fireGfx.clear();
    const w = this.width, h = this.height;
    const lifeRatio = Math.max(0, this.burnRemainingMs / this.spec.burnMs);
    const intensity = 0.6 + Math.sin(this.flickerT * 0.04) * 0.2;
    const flameH = Math.min(h * 0.7, 12 * intensity);
    const baseY = this.spec.anchor === 'ceiling' ? flameH : -flameH;

    // base flame band
    this.fireGfx
      .rect(0, baseY, w, flameH)
      .fill({ color: 0xff7733, alpha: 0.35 * lifeRatio });
    // hot core
    this.fireGfx
      .rect(2, baseY + flameH * 0.3, w - 4, flameH * 0.6)
      .fill({ color: 0xffdd66, alpha: 0.55 * lifeRatio });
    // body tint while burning
    this.body.tint = lifeRatio > 0.3 ? 0xffffff : 0x553322; // darken to char
  }
}
