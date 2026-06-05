/**
 * GrassClumpFire — visual-only ignition system for procedural grass clumps.
 *
 * Scope: only `ProceduralDecorator.grassClumps` (the per-clump Containers).
 * Hangers / clingers / surface overlay are batch-rendered into shared
 * Graphics and are NOT ignitable.
 *
 * Lifecycle:
 *   1. Scene registers clumps via `register(...)` after each
 *      `ProceduralDecorator.generate()`.
 *   2. Each frame the scene calls `update(dt, mutator, roomData, ash, T)`:
 *      - Non-burning clumps ignite when an adjacent (4-neighbour + self) cell
 *        is on fire, or a burning BurnableProp / other burning clump is
 *        within 1-cell distance.
 *      - Burning clumps draw a small teardrop flame, char-tint their base,
 *        and once per CHAIN_INTERVAL_MS attempt to ignite any 4-neighbour
 *        TILE_GRASS cells via `TileMutator.tryIgnite`.
 *      - On burn-out, the clump container is removed and a timed-fade ash
 *        remnant is spawned via `AshRemnantManager`.
 *   3. Scene calls `clear()` on level reset to discard all state.
 *
 * No collision footprint, no damage interaction.
 */

import { Container, Graphics } from 'pixi.js';
import type { IgnitableEntity, TileMutator } from '../systems/TileMutator';
import type { AshRemnantManager } from './AshRemnant';
import { TILE_GRASS, TILE_MAGMA, getTile } from '../core/Physics';
import { destroyDisplayObject } from '../scenes/shared/DisplayObjectLifecycleHelpers';

const BURN_DURATION_MS = 5000;
const ACTIVE_FIRE_RATIO = 0.80;
const ACTIVE_FIRE_MS = BURN_DURATION_MS * ACTIVE_FIRE_RATIO;
const CHAIN_INTERVAL_MS = 800;
const CHAIN_CHANCE = 0.40;
const ASH_FADE_MS = 2500;

interface ClumpEntry {
  readonly spec: { readonly ignitionChance: number };
  container: Container;
  gx: number;
  gy: number;
  cellW: number;
  cellH: number;
  burning: boolean;
  burnElapsed: number;
  chainAccum: number;
  fireGfx: Graphics | null;
  destroyed: boolean;
  resolveCell?: () => { gx: number; gy: number };
  containsCell(gx: number, gy: number): boolean;
  getCells(): Array<[number, number]>;
  ignite(): boolean;
}

export class GrassClumpFireSystem {
  private clumps: ClumpEntry[] = [];
  private fireLayer: Container | null = null;

  setFireLayer(layer: Container | null): void {
    this.fireLayer = layer;
  }

  register(clumps: Array<{ container: Container; gx: number; gy: number }>): IgnitableEntity[] {
    return this.registerWithCellResolver(clumps);
  }

  registerWithCellResolver(
    clumps: Array<{ container: Container; gx: number; gy: number }>,
    resolveCell?: (clump: { container: Container; gx: number; gy: number }) => { gx: number; gy: number },
  ): IgnitableEntity[] {
    const registered: IgnitableEntity[] = [];
    for (const c of clumps) {
      let entry: ClumpEntry;
      entry = {
        spec: { ignitionChance: 0.90 },
        container: c.container,
        gx: c.gx,
        gy: c.gy,
        cellW: 1,
        cellH: 1,
        burning: false,
        burnElapsed: 0,
        chainAccum: 0,
        fireGfx: null,
        destroyed: false,
        resolveCell: resolveCell ? () => resolveCell(c) : undefined,
        containsCell(gx: number, gy: number): boolean {
          const cell = entry.resolveCell?.();
          const ex = cell?.gx ?? entry.gx;
          const ey = cell?.gy ?? entry.gy;
          return gx === ex && gy === ey;
        },
        getCells(): Array<[number, number]> {
          const cell = entry.resolveCell?.();
          return [[cell?.gx ?? entry.gx, cell?.gy ?? entry.gy]];
        },
        ignite: (): boolean => this.ignite(entry),
      } satisfies ClumpEntry;
      this.clumps.push(entry);
      registered.push(entry);
    }
    return registered;
  }

  clear(): void {
    for (const c of this.clumps) {
      if (c.fireGfx) destroyDisplayObject(c.fireGfx);
    }
    this.clumps.length = 0;
  }

  /**
   * Force-ignite every clump whose grid cell falls inside the supplied AABB
   * (in cell coords). Used by ego shard fire impact and similar direct-hit
   * sources so the player gets immediate feedback without waiting for the
   * neighbour-fire propagation tick.
   */
  igniteInCellAABB(gx0: number, gy0: number, gx1: number, gy1: number): number {
    let count = 0;
    for (const c of this.clumps) {
      if (c.destroyed || c.burning || c.burnElapsed > 0) continue;
      if (c.gx < gx0 || c.gx > gx1 || c.gy < gy0 || c.gy > gy1) continue;
      this.ignite(c);
      count++;
    }
    return count;
  }

  update(
    dt: number,
    mutator: TileMutator,
    roomData: number[][],
    ash: AshRemnantManager,
    tileSize: number,
  ): void {
    // Phase 1 — ignition checks for idle clumps.
    for (const c of this.clumps) {
      this.syncCell(c);
      if (c.destroyed || c.burning || c.burnElapsed > 0) continue;
      if (this.shouldIgnite(c, mutator, roomData)) this.ignite(c);
    }

    // Phase 2 — tick burning clumps. Walk in reverse so destroyed entries
    // can be spliced safely.
    for (let i = this.clumps.length - 1; i >= 0; i--) {
      const c = this.clumps[i];
      this.syncCell(c);
      if (c.destroyed) { this.clumps.splice(i, 1); continue; }
      if (c.burning) {
        c.burnElapsed += dt;
        if (c.burnElapsed >= ACTIVE_FIRE_MS) c.burning = false;
      } else if (c.burnElapsed >= ACTIVE_FIRE_MS) {
        c.burnElapsed += dt;
      } else {
        continue;
      }
      c.chainAccum += dt;
      this.animateFire(c);
      if (c.burning && c.chainAccum >= CHAIN_INTERVAL_MS) {
        c.chainAccum -= CHAIN_INTERVAL_MS;
        this.chainToTiles(c, mutator, roomData);
      }
      if (c.burnElapsed >= BURN_DURATION_MS) {
        this.destroyClump(c, ash, tileSize);
      }
    }
  }

  private shouldIgnite(
    c: ClumpEntry, mutator: TileMutator, roomData: number[][],
  ): boolean {
    // Self cell + 4-neighbours: any burning tile?
    if (
      mutator.isOnFire(c.gx, c.gy) ||
      mutator.isOnFire(c.gx + 1, c.gy) ||
      mutator.isOnFire(c.gx - 1, c.gy) ||
      mutator.isOnFire(c.gx, c.gy + 1) ||
      mutator.isOnFire(c.gx, c.gy - 1)
    ) return true;

    // Magma is a permanent fire source — check static grid directly. Without
    // this, a clump sitting one cell from a magma pool would never ignite.
    if (
      getTile(roomData, c.gx, c.gy) === TILE_MAGMA ||
      getTile(roomData, c.gx + 1, c.gy) === TILE_MAGMA ||
      getTile(roomData, c.gx - 1, c.gy) === TILE_MAGMA ||
      getTile(roomData, c.gx, c.gy + 1) === TILE_MAGMA ||
      getTile(roomData, c.gx, c.gy - 1) === TILE_MAGMA
    ) return true;

    // Burning BurnableProp within 1 cell? Pass our own single-cell AABB —
    // TileMutator already inflates prop footprints by 1 cell, so a 1-cell
    // query yields a 1-cell effective adjacency radius.
    return false;
  }

  private ignite(c: ClumpEntry): boolean {
    this.syncCell(c);
    if (c.burning || c.destroyed) return false;
    c.burning = true;
    c.burnElapsed = 0;
    c.chainAccum = 0;
    const gfx = new Graphics();
    // Additive blend so the flame reads as light even when overlapping
    // the dark grass blade graphics.
    gfx.blendMode = 'add';
    if (this.fireLayer) {
      gfx.x = (c.gx + 0.5) * 16;
      gfx.y = (c.gy + 1) * 16;
      this.fireLayer.addChild(gfx);
    } else {
      c.container.addChild(gfx);
    }
    c.fireGfx = gfx;
    return true;
  }

  private animateFire(c: ClumpEntry): void {
    const gfx = c.fireGfx;
    if (!gfx) return;
    if (this.fireLayer && gfx.parent === this.fireLayer) {
      gfx.x = (c.gx + 0.5) * 16;
      gfx.y = (c.gy + 1) * 16;
    }
    gfx.clear();
    const life = 1 - c.burnElapsed / BURN_DURATION_MS;
    if (life <= 0) return;

    // The clump container is pivoted at the root (baseX + T/2, baseY = floor
    // surface). Flame is drawn in container-local space with baseY = 0 and
    // the tip extending upward (negative y).
    const phase = c.burnElapsed * 0.018;
    const wob = 0.85 + Math.sin(phase) * 0.25;
    const flameH = 14 * life * wob;
    const flameW = 4 * (0.9 + Math.sin(phase * 1.4) * 0.18);
    const baseY = 0;

    const drawTeardrop = (halfW: number, hScale: number, color: number, alpha: number) => {
      const hh = flameH * hScale;
      const tY = baseY - hh;
      const mY = baseY - hh * 0.45;
      gfx.moveTo(-halfW, baseY);
      gfx.quadraticCurveTo(-halfW * 1.4, mY, 0, tY);
      gfx.quadraticCurveTo(halfW * 1.4, mY, halfW, baseY);
      gfx.closePath();
      gfx.fill({ color, alpha: alpha * life });
    };
    drawTeardrop(flameW * 1.20, 1.00, 0xff3311, 0.55);
    drawTeardrop(flameW * 0.85, 0.92, 0xff7722, 0.78);
    drawTeardrop(flameW * 0.55, 0.80, 0xffcc44, 0.85);
    drawTeardrop(flameW * 0.30, 0.62, 0xffffaa, 0.85);

    // Char the clump base by tinting — warm at first, dark at the end.
    c.container.tint = life > 0.3 ? 0xffaa66 : 0x553322;
  }

  private syncCell(c: ClumpEntry): void {
    const cell = c.resolveCell?.();
    if (!cell) return;
    c.gx = cell.gx;
    c.gy = cell.gy;
  }

  private chainToTiles(c: ClumpEntry, mutator: TileMutator, roomData: number[][]): void {
    const ns: Array<[number, number]> = [
      [c.gx + 1, c.gy], [c.gx - 1, c.gy], [c.gx, c.gy + 1], [c.gx, c.gy - 1],
    ];
    for (const n of ns) {
      const x = n[0], y = n[1];
      if (getTile(roomData, x, y) !== TILE_GRASS) continue;
      if (mutator.isOnFire(x, y)) continue;
      if (Math.random() < CHAIN_CHANCE) mutator.tryIgnite(roomData, x, y);
    }
  }

  private destroyClump(c: ClumpEntry, _ash: AshRemnantManager, _tileSize: number): void {
    destroyDisplayObject(c.container, { children: true });
    c.destroyed = true;
  }
}
