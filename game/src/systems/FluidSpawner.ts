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
import { getFluidDef } from '@data/FluidTypes';

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

/**
 * Hard cap on the downstream fluid body a spawner is allowed to grow.
 * Once the pool reaches this size the spawner stops emitting until cells
 * drain off (player splashes / fire evaporates) and the count drops back.
 *
 * Without this gate, a shallow pool that lacks wall braces lets cellular
 * gravity push cells sideways forever — spawn cell never fills, every
 * tick the spawner emits another cell, and the body balloons unbounded.
 *
 * 100 cells ≈ 20-wide × 5-deep pool. Generous for authored waterfalls,
 * tight enough to prevent screen-wide runaway.
 */
const POOL_CELL_CAP = 100;
const BASIN_FILL_INTERVAL_MS = 1200;
const AIR = 0;

interface BasinSnapshot {
  minX: number;
  maxX: number;
  topY: number;
  bottomY: number;
}

interface ActiveBasin {
  spawner: FluidSpawnerOptions;
  basin: BasinSnapshot;
}

interface WaterfallSegment {
  type: FluidSpawnerType;
  minGx: number;
  maxGx: number;
  gy: number;
  endY: number;
  flow: number;
}

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
import { resolveGenericFluidType } from '@data/ItemWorldFluidMapping';

export function readFluidSpawnerEntities(
  ent: LdtkEntity,
  temperament?: string | null,
): FluidSpawnerOptions[] {
  const f = ent.fields ?? {};
  const typeStr = typeof f['Type'] === 'string' ? (f['Type'] as string).toLowerCase() : 'water';
  // Generic markers (Generic_A/B/C from LDtk FluidType enum) resolve via the
  // dive weapon's temperament. Explicit markers (water/oil/magma/acid) pass
  // through unchanged. Unknown values fall back to water.
  let type: FluidSpawnerType;
  if (typeStr === 'generic_a' || typeStr === 'generic_b' || typeStr === 'generic_c') {
    type = resolveGenericFluidType(typeStr, temperament);
  } else if (typeStr === 'oil' || typeStr === 'magma' || typeStr === 'acid') {
    type = typeStr as FluidSpawnerType;
  } else {
    type = 'water';
  }
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
  private spawners: Array<FluidSpawnerOptions & { accum: number; flow: number; targetFlow: number }> = [];
  private visualGfx: Graphics | null = null;
  private dbg: Graphics | null = null;

  constructor(visualLayer: Container | null, debugLayer: Container | null = null) {
    if (visualLayer) {
      this.visualGfx = new Graphics();
      visualLayer.addChild(this.visualGfx);
    }
    if (debugLayer) {
      this.dbg = new Graphics();
      debugLayer.addChild(this.dbg);
    }
  }

  destroy(): void {
    if (this.visualGfx) {
      if (this.visualGfx.parent) this.visualGfx.parent.removeChild(this.visualGfx);
      this.visualGfx.destroy();
      this.visualGfx = null;
    }
    if (this.dbg) {
      if (this.dbg.parent) this.dbg.parent.removeChild(this.dbg);
      this.dbg.destroy();
      this.dbg = null;
    }
    this.spawners.length = 0;
  }

  add(opts: FluidSpawnerOptions): void {
    this.spawners.push({ ...opts, accum: 0, flow: 1, targetFlow: 1 });
    this.repaintDebug();
    // eslint-disable-next-line no-console
    console.log(`[FluidSpawner] add type=${opts.type} cell=(${opts.gx},${opts.gy}) interval=${opts.intervalMs}ms (total now ${this.spawners.length})`);
  }

  /** Clear all spawners (call on room transition). */
  clear(): void {
    this.spawners.length = 0;
    if (this.visualGfx) this.visualGfx.clear();
    this.repaintDebug();
  }

  setEnabled(enabled: boolean): void {
    const target = enabled ? 1 : 0;
    for (const s of this.spawners) s.targetFlow = target;
  }

  queryFluidAtAabb(x: number, y: number, width: number, height: number, grid: number[][]): FluidSpawnerType | null {
    for (const seg of this.buildWaterfallSegments(grid)) {
      const sx = seg.minGx * 16;
      const sy = seg.gy * 16;
      const sw = (seg.maxGx - seg.minGx + 1) * 16;
      const sh = (seg.endY - seg.gy) * 16;
      if (sh <= 0) continue;
      if (x < sx + sw && x + width > sx && y < sy + sh && y + height > sy) return seg.type;
    }
    return null;
  }

  queryTileAtAabb(x: number, y: number, width: number, height: number, grid: number[][]): number | null {
    const type = this.queryFluidAtAabb(x, y, width, height, grid);
    return type ? FLUID_TYPE_TO_TILE[type] : null;
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
      this.updateFlow(s, dtMs);
      if (s.flow <= 0.001) continue;
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
      while (true) {
        // Spawn cell occupied (pool filled up to source) — natural throttle.
        const basin = this.findBasinSnapshot(s, grid);
        const emitInterval = basin ? Math.max(s.intervalMs, BASIN_FILL_INTERVAL_MS) : s.intervalMs;
        if (s.accum < emitInterval) break;
        s.accum -= emitInterval;
        if (basin && this.isBasinFull(s, basin, grid)) {
          s.accum = 0;
          break;
        }
        // Downstream pool cap — search down to find the first fluid cell
        // and check its body cell count. If the pool has ballooned past
        // POOL_CELL_CAP, the spawner stops emitting. Prevents the case
        // where cellular gravity keeps spreading a shallow pool sideways
        // forever (spawn cell never fills, every tick emits a new cell).
        if (!basin) {
          let downstreamCells = 0;
          for (let gyDown = s.gy + 1; gyDown < grid.length; gyDown++) {
            const v = grid[gyDown]?.[s.gx];
            if (v === undefined) break;
            if (v === FLUID_TYPE_TO_TILE[s.type]) {
              downstreamCells = fluidSystem.fluidBodyCellCountAtCell(s.gx, gyDown);
              break;
            }
            if (v !== AIR) break; // hit solid before finding pool.
          }
          if (downstreamCells >= POOL_CELL_CAP) break;
        }
        if (basin) {
          if (this.injectIntoBasin(s, basin, grid)) dirty = true;
        } else {
          const row = grid[s.gy];
          if (!row || row[s.gx] !== AIR) break;
          row[s.gx] = FLUID_TYPE_TO_TILE[s.type];
          dirty = true;
        }
      }
    }
    this.repaintVisual(grid);
    if (dirty) fluidSystem.refreshFromGrid(grid);
  }

  private updateFlow(s: FluidSpawnerOptions & { flow: number; targetFlow: number }, dtMs: number): void {
    const openMs = 180;
    const closeMs = 520;
    if (s.targetFlow > s.flow) {
      s.flow = Math.min(s.targetFlow, s.flow + dtMs / openMs);
    } else if (s.targetFlow < s.flow) {
      s.flow = Math.max(s.targetFlow, s.flow - dtMs / closeMs);
    }
  }

  private injectIntoBasin(s: FluidSpawnerOptions, basin: BasinSnapshot, grid: number[][]): boolean {
    const tile = FLUID_TYPE_TO_TILE[s.type];
    const centerX = Math.max(basin.minX, Math.min(basin.maxX, s.gx));
    const maxRadius = Math.max(centerX - basin.minX, basin.maxX - centerX);
    for (let y = basin.bottomY; y >= basin.topY; y--) {
      const row = grid[y];
      if (!row) continue;
      for (let r = 0; r <= maxRadius; r++) {
        const left = centerX - r;
        const right = centerX + r;
        if (left >= basin.minX && row[left] === AIR) {
          row[left] = tile;
          return true;
        }
        if (right <= basin.maxX && row[right] === AIR) {
          row[right] = tile;
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Keep a filled receiver basin from spilling forever while preserving the
   * visual source column. Call after FluidSystem.gravityTick so newly-spread
   * overflow is drained in the same frame.
   */
  pressureDrain(grid: number[][], fluidSystem: FluidSystem): void {
    if (this.spawners.length === 0) return;
    let dirty = false;
    const activeBasins: ActiveBasin[] = [];

    for (const s of this.spawners) {
      const basin = this.findBasinSnapshot(s, grid);
      if (!basin) continue;
      activeBasins.push({ spawner: s, basin });
    }

    for (const active of activeBasins) {
      if (!this.isBasinFull(active.spawner, active.basin, grid)) continue;
      if (this.drainSpawnerOverflow(active, activeBasins, grid)) dirty = true;
    }
    if (dirty) fluidSystem.refreshFromGrid(grid);
  }

  private findBasinSnapshot(s: FluidSpawnerOptions, grid: number[][]): BasinSnapshot | null {
    const floorY = this.findFloorY(s.gx, s.gy, grid);
    if (floorY === null) return null;

    const bottomY = floorY - 1;
    if (bottomY < s.gy) return null;

    const extent = this.findSupportedBasinExtent(s.gx, bottomY, grid);
    if (!extent) return null;

    let topY = bottomY;
    for (let y = bottomY - 1; y >= s.gy; y--) {
      if (!this.isBasinRowOpen(extent.minX, extent.maxX, y, grid)) break;
      topY = y;
    }

    return { ...extent, topY, bottomY };
  }

  private isBasinFull(s: FluidSpawnerOptions, basin: BasinSnapshot, grid: number[][]): boolean {
    const tile = FLUID_TYPE_TO_TILE[s.type];
    for (let y = basin.topY; y <= basin.bottomY; y++) {
      for (let x = basin.minX; x <= basin.maxX; x++) {
        if (grid[y]?.[x] !== tile) return false;
      }
    }
    return true;
  }

  private drainSpawnerOverflow(active: ActiveBasin, activeBasins: ActiveBasin[], grid: number[][]): boolean {
    const { spawner: s, basin } = active;
    const tile = FLUID_TYPE_TO_TILE[s.type];
    const connected = this.collectConnectedFluid(s, basin, grid);
    let dirty = false;

    for (const key of connected) {
      const x = key % (grid[0]?.length ?? 1);
      const y = Math.floor(key / (grid[0]?.length ?? 1));
      if (this.isAllowedPressureCell(tile, activeBasins, x, y)) continue;
      if (grid[y]?.[x] === tile) {
        grid[y][x] = AIR;
        dirty = true;
      }
    }

    return dirty;
  }

  private collectConnectedFluid(
    s: FluidSpawnerOptions,
    basin: BasinSnapshot,
    grid: number[][],
  ): Set<number> {
    const tile = FLUID_TYPE_TO_TILE[s.type];
    const gridH = grid.length;
    const gridW = grid[0]?.length ?? 0;
    const out = new Set<number>();
    if (gridW === 0) return out;

    const stack: Array<[number, number]> = [];
    const pushSeed = (x: number, y: number): void => {
      if (grid[y]?.[x] === tile) stack.push([x, y]);
    };

    for (let y = s.gy; y <= basin.bottomY; y++) pushSeed(s.gx, y);
    for (let y = basin.topY; y <= basin.bottomY; y++) {
      for (let x = basin.minX; x <= basin.maxX; x++) pushSeed(x, y);
    }

    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      if (x < 0 || y < 0 || x >= gridW || y >= gridH) continue;
      const key = y * gridW + x;
      if (out.has(key)) continue;
      if (grid[y]?.[x] !== tile) continue;
      out.add(key);
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }

    return out;
  }

  private isAllowedPressureCell(tile: number, activeBasins: ActiveBasin[], x: number, y: number): boolean {
    for (const { spawner, basin } of activeBasins) {
      if (FLUID_TYPE_TO_TILE[spawner.type] !== tile) continue;
      if (x === spawner.gx && y >= spawner.gy && y <= basin.bottomY) return true;
      if (x >= basin.minX && x <= basin.maxX && y >= basin.topY && y <= basin.bottomY) return true;
    }
    return false;
  }

  private findFloorY(gx: number, gy: number, grid: number[][]): number | null {
    for (let y = gy + 1; y < grid.length; y++) {
      const v = grid[y]?.[gx];
      if (v === undefined) return null;
      if (this.isSolidCell(v)) return y;
    }
    return null;
  }

  private isBasinRowOpen(minX: number, maxX: number, y: number, grid: number[][]): boolean {
    for (let x = minX; x <= maxX; x++) {
      if (this.isSolidCell(grid[y]?.[x])) return false;
    }
    const leftWall = minX === 0 || this.isSolidCell(grid[y]?.[minX - 1]);
    const rightWall = maxX === (grid[0]?.length ?? 0) - 1 || this.isSolidCell(grid[y]?.[maxX + 1]);
    return leftWall && rightWall;
  }

  private findSupportedBasinExtent(
    gx: number,
    basinY: number,
    grid: number[][],
  ): { minX: number; maxX: number } | null {
    const gridW = grid[0]?.length ?? 0;
    if (gridW === 0) return null;
    if (this.isSolidCell(grid[basinY]?.[gx])) return null;

    let minX = gx;
    while (minX - 1 >= 0) {
      const x = minX - 1;
      if (this.isSolidCell(grid[basinY]?.[x])) break;
      if (!this.isSolidCell(grid[basinY + 1]?.[x])) break;
      minX = x;
    }

    let maxX = gx;
    while (maxX + 1 < gridW) {
      const x = maxX + 1;
      if (this.isSolidCell(grid[basinY]?.[x])) break;
      if (!this.isSolidCell(grid[basinY + 1]?.[x])) break;
      maxX = x;
    }

    return minX <= maxX ? { minX, maxX } : null;
  }

  private isSolidCell(v: number | undefined): boolean {
    return v !== undefined && v !== AIR && !this.isFluidCell(v);
  }

  private isFluidCell(v: number | undefined): boolean {
    return v !== undefined && Object.values(FLUID_TYPE_TO_TILE).includes(v);
  }

  private repaintVisual(grid: number[][]): void {
    if (!this.visualGfx) return;
    const g = this.visualGfx;
    g.clear();
    for (const seg of this.buildWaterfallSegments(grid)) {
      const def = getFluidDef(seg.type);
      const x = seg.minGx * 16;
      const y = seg.gy * 16;
      const w = (seg.maxGx - seg.minGx + 1) * 16;
      const h = (seg.endY - seg.gy) * 16;
      if (h < 2) continue;
      const inset = 3.5 * (1 - seg.flow);
      const bodyAlpha = 0.44 + 0.2 * seg.flow;
      const edgeAlpha = 0.18 * seg.flow;
      const glowColor = def.glowColor ?? def.bodyColor;

      g.rect(x - 5, y, w + 10, h).fill({ color: glowColor, alpha: 0.09 * seg.flow });
      g.rect(x - 1, y, 3, h).fill({ color: def.surfaceColor, alpha: edgeAlpha });
      g.rect(x + w - 2, y, 3, h).fill({ color: def.surfaceColor, alpha: edgeAlpha * 0.75 });
      g.rect(x + inset, y, w - inset * 2, h).fill({ color: def.bodyColor, alpha: bodyAlpha });
      g.circle(x + w / 2, y + h, Math.max(8, w * 0.35) * seg.flow).fill({ color: def.bodyColor, alpha: bodyAlpha * 0.45 });
    }
  }

  private buildWaterfallSegments(grid: number[][]): WaterfallSegment[] {
    const cells: WaterfallSegment[] = [];
    for (const s of this.spawners) {
      if (s.flow <= 0.001) continue;
      const basin = this.findBasinSnapshot(s, grid);
      const endY = this.findWaterfallVisualEndY(s, basin, grid);
      if (endY === null || endY <= s.gy) continue;
      cells.push({ type: s.type, minGx: s.gx, maxGx: s.gx, gy: s.gy, endY, flow: s.flow });
    }
    cells.sort((a, b) =>
      a.type.localeCompare(b.type) || a.gy - b.gy || a.endY - b.endY || a.minGx - b.minGx,
    );
    const out: WaterfallSegment[] = [];
    for (const seg of cells) {
      const last = out[out.length - 1];
      if (
        last &&
        last.type === seg.type &&
        last.gy === seg.gy &&
        last.endY === seg.endY &&
        last.maxGx + 1 === seg.minGx
      ) {
        last.maxGx = seg.maxGx;
        last.flow = Math.max(last.flow, seg.flow);
      } else {
        out.push({ ...seg });
      }
    }
    return out;
  }

  private findWaterfallVisualEndY(
    s: FluidSpawnerOptions,
    basin: BasinSnapshot | null,
    grid: number[][],
  ): number | null {
    if (!basin) return this.findFloorY(s.gx, s.gy, grid);

    const tile = FLUID_TYPE_TO_TILE[s.type];
    for (let y = s.gy + 1; y <= basin.bottomY; y++) {
      if (grid[y]?.[s.gx] === tile) return y;
    }
    for (let y = basin.topY; y <= basin.bottomY; y++) {
      for (let x = basin.minX; x <= basin.maxX; x++) {
        if (grid[y]?.[x] === tile) return y;
      }
    }
    return basin.bottomY + 1;
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
