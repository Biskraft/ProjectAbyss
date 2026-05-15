/**
 * FluidSpawner — emit fluid cells at a fixed grid position on a timer.
 *
 * Conceptually a "leaky pipe" / "broken nozzle" / "submerged source".
 * Each tick we set the target cell to the configured fluid value if it's
 * empty; the scene's FluidSystem.gravityTick then carries it downward via
 * cellular gravity, producing a continuous waterfall / stream effect when
 * the spawn point is placed in mid-air over open space.
 *
 * Source spec: Documents/System/System_World_Container.md §12 sibling.
 *
 * LDtk Entity: `FluidSpawner`
 *   - type: enum "water" | "oil" | "magma" | "acid"
 *   - intervalMs: int (default 200) — ms between cell emissions
 *
 * Placement notes:
 *   - Point entity (uses `grid` cell coords for spawn point).
 *   - If spawn cell is already non-air, the tick is skipped. This naturally
 *     throttles the stream when downstream cellular gravity stalls.
 *   - Stacking 2+ spawners on adjacent cells multiplies the flow rate.
 */

import { Container, Graphics } from 'pixi.js';
import type { LdtkEntity } from '@level/LdtkLoader';
import type { FluidSystem } from '@effects/FluidSystem';

export type FluidSpawnerType = 'water' | 'oil' | 'magma' | 'acid';

const FLUID_TYPE_TO_TILE: Record<FluidSpawnerType, number> = {
  water: 2,
  oil:   11,
  magma: 6,
  acid:  13,
};

const TYPE_DEBUG_COLOR: Record<FluidSpawnerType, number> = {
  water: 0x4488ff,
  oil:   0x88553a,
  magma: 0xff6633,
  acid:  0x88cc44,
};

export interface FluidSpawnerOptions {
  /** Cell coordinates (grid units) of the spawn point. */
  gx: number;
  gy: number;
  type: FluidSpawnerType;
  /** Milliseconds between cell emissions. */
  intervalMs: number;
}

/**
 * Read fields with safe defaults from a `FluidSpawner` LDtk entity and
 * expand its rect into per-cell spawn points.
 *
 * - Default intervalMs = 16 (≈ 1 cell per frame at 60 fps). Matches the
 *   FluidSystem.gravityTick fall speed so the column reads as a continuous
 *   waterfall instead of a dotted drip line.
 * - Default rect = 16×16 (single cell). Resize the entity in LDtk Editor
 *   to widen / lengthen the spawn area — every covered cell becomes its
 *   own emitter, so a 5-cell-wide entity produces a 5-cell-wide waterfall.
 *
 * Designers wanting a "drip" feel raise IntervalMs to 200~500 ms.
 */
export function readFluidSpawnerEntities(ent: LdtkEntity): FluidSpawnerOptions[] {
  const f = ent.fields ?? {};
  const typeStr = typeof f['Type'] === 'string' ? (f['Type'] as string).toLowerCase() : 'water';
  const type: FluidSpawnerType =
    typeStr === 'oil' || typeStr === 'magma' || typeStr === 'acid' ? (typeStr as FluidSpawnerType) : 'water';
  const intervalMs = typeof f['IntervalMs'] === 'number'
    ? Math.max(8, Math.floor(f['IntervalMs'] as number))
    : 16;
  // grid + (width/16, height/16) — cover every covered cell with its own emitter.
  const gx0 = ent.grid[0];
  const gy0 = ent.grid[1];
  const cellsW = Math.max(1, Math.round(ent.width / 16));
  const cellsH = Math.max(1, Math.round(ent.height / 16));
  const out: FluidSpawnerOptions[] = [];
  for (let dy = 0; dy < cellsH; dy++) {
    for (let dx = 0; dx < cellsW; dx++) {
      out.push({ gx: gx0 + dx, gy: gy0 + dy, type, intervalMs });
    }
  }
  return out;
}

/** Legacy single-cell reader — kept for callers that only need one cell. */
export function readFluidSpawnerEntity(ent: LdtkEntity): FluidSpawnerOptions {
  return readFluidSpawnerEntities(ent)[0];
}

/**
 * Manager that ticks every active spawner once per frame and mutates the
 * scene's collision grid + notifies the fluid system. Debug overlay is
 * gated by the scene (passes `debug` flag in constructor).
 */
export class FluidSpawnerManager {
  private spawners: Array<FluidSpawnerOptions & { accum: number }> = [];
  private dbg: Graphics | null = null;

  constructor(debugLayer: Container | null) {
    if (debugLayer) {
      this.dbg = new Graphics();
      debugLayer.addChild(this.dbg);
    }
  }

  destroy(): void {
    if (this.dbg) {
      if (this.dbg.parent) this.dbg.parent.removeChild(this.dbg);
      this.dbg.destroy();
      this.dbg = null;
    }
    this.spawners.length = 0;
  }

  add(opts: FluidSpawnerOptions): void {
    this.spawners.push({ ...opts, accum: 0 });
    this.repaintDebug();
    // eslint-disable-next-line no-console
    console.log(`[FluidSpawner] add type=${opts.type} cell=(${opts.gx},${opts.gy}) interval=${opts.intervalMs}ms (total now ${this.spawners.length})`);
  }

  /** Clear all spawners (call on room transition). */
  clear(): void {
    this.spawners.length = 0;
    this.repaintDebug();
  }

  /**
   * Run every spawner. Emits at most one cell per spawner per tick
   * (multiple emissions if dt > intervalMs accumulate). Calls
   * `fluidSystem.refreshFromGrid` once at end if any emission occurred.
   */
  update(dtMs: number, grid: number[][], fluidSystem: FluidSystem): void {
    if (this.spawners.length === 0) return;
    let dirty = false;
    for (const s of this.spawners) {
      s.accum += dtMs;
      // Debug-log the very first tick so designers can verify the spawner
      // is actually being read + its target cell is air. Only fires once
      // per spawner to avoid console spam.
      if (!(s as { _logged?: boolean })._logged) {
        const cellV = grid[s.gy]?.[s.gx];
        // eslint-disable-next-line no-console
        console.log(`[FluidSpawner] init type=${s.type} cell=(${s.gx},${s.gy}) value=${cellV} interval=${s.intervalMs}ms gridSize=${grid[0]?.length ?? '?'}x${grid.length}`);
        (s as { _logged?: boolean })._logged = true;
      }
      while (s.accum >= s.intervalMs) {
        s.accum -= s.intervalMs;
        // Try the spawn cell first; if blocked (already filled by previous
        // tick's fluid OR original level cell was non-air), walk UP a few
        // cells to find an empty slot. Without this, an authored spawner
        // placed in a tile that LDtk shipped with an existing fluid (or
        // tile collision misclassification) would never emit anything.
        let placed = false;
        let gy = s.gy;
        for (let step = 0; step < 4 && gy >= 0; step++, gy--) {
          const row = grid[gy];
          if (!row) break;
          if (row[s.gx] === 0) {
            row[s.gx] = FLUID_TYPE_TO_TILE[s.type];
            dirty = true;
            placed = true;
            break;
          }
        }
        if (!placed) break; // No empty cell within reach — stop trying this frame.
      }
    }
    if (dirty) fluidSystem.refreshFromGrid(grid);
  }

  /** Redraw debug rect/dot for each spawner (called when set changes). */
  private repaintDebug(): void {
    if (!this.dbg) return;
    this.dbg.clear();
    for (const s of this.spawners) {
      const col = TYPE_DEBUG_COLOR[s.type];
      // 16×16 outline at the spawn cell + bigger crosshair so designers
      // can spot the source even when the stream covers the cell.
      this.dbg.rect(s.gx * 16, s.gy * 16, 16, 16).stroke({ color: col, width: 1, alpha: 0.9 });
      this.dbg.circle(s.gx * 16 + 8, s.gy * 16 + 8, 3).fill({ color: col, alpha: 0.85 });
    }
  }
}
