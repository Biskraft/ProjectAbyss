/**
 * ContainerSpawner — procedural fill for ThrowableContainer.
 *
 * Spec: Documents/System/System_World_Container.md §12.
 *
 * Reads a LDtk `ContainerSpawner` entity (rect + policy) and emits a list
 * of ThrowableContainer instances inside that rect, biased by `Floor` /
 * `Stack` / `Cluster` placement rules. Pool weights drive the kind choice.
 *
 * Deterministic when seed >= 0 (mulberry32 via @utils/PRNG); seed < 0
 * uses Math.random for per-entry-room variety.
 */

import { PRNG } from '@utils/PRNG';
import { ThrowableContainer, parseContainerKind, type ContainerKind } from '@entities/ThrowableContainer';
import type { LdtkEntity } from '@level/LdtkLoader';

// Solid IntGrid values that act as floor for spawning (must match the
// ThrowableContainer physics' solid set). Keep in sync with
// `isContainerSolidCell` in the scenes.
const SOLID_FOR_FLOOR = new Set<number>([1, 3, 7, 9, 12, 15]);

export type SpawnBias = 'Floor' | 'Stack' | 'Cluster' | 'Drop';

export interface PoolEntry { kind: ContainerKind; weight: number; }

export interface SpawnerOptions {
  /** Rect (pixel coords) within which to spawn. */
  rect: { x: number; y: number; w: number; h: number };
  /** Collision grid for floor detection. */
  collisionGrid: number[][];
  /** Existing containers — used for occupancy + neighbour avoidance. */
  existing: ReadonlyArray<{ x: number; y: number; spec: { width: number; height: number } }>;
  /** Cells (gx, gy) already occupied by other entities to avoid. */
  occupiedCells?: ReadonlySet<string>;
  pool: PoolEntry[];
  minCount: number;
  maxCount: number;
  bias: SpawnBias;
  /** -1 → Math.random; else deterministic mulberry32 seed. */
  seed: number;
  avoidEntity: boolean;
  /** Override drum 4종 fluid volume. -1 = spec default. */
  fluidVolumeOverride: number;
  /**
   * When true, the spawner keeps re-emitting containers in the same rect
   * as long as fewer than `minCount` live containers remain inside the
   * spawn area. Player destroys boxes → spawner refills next check tick.
   * Default false = one-shot spawn at room attach.
   *
   * `runContainerSpawner` itself doesn't act on this flag — it's the
   * scene's responsibility to register the spawner for periodic refill.
   * Marked optional so non-maintained call sites can omit it.
   */
  maintain?: boolean;
}

/** Parse pool strings like `["Crate:6", "OilDrum:2"]` into entries. */
export function parsePool(raw: unknown): PoolEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: PoolEntry[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const idx = item.indexOf(':');
    if (idx < 0) continue;
    const kindStr = item.slice(0, idx).trim();
    const wStr = item.slice(idx + 1).trim();
    const kind = parseContainerKind(kindStr);
    if (!kind) continue;
    const weight = parseInt(wStr, 10);
    if (!isFinite(weight) || weight <= 0) continue;
    out.push({ kind, weight });
  }
  return out;
}

/** Weighted pick from pool. Returns null if pool is empty. */
function weightedPick(pool: PoolEntry[], rand: () => number): ContainerKind | null {
  if (pool.length === 0) return null;
  let total = 0;
  for (const e of pool) total += e.weight;
  if (total <= 0) return null;
  let r = rand() * total;
  for (const e of pool) {
    r -= e.weight;
    if (r <= 0) return e.kind;
  }
  return pool[pool.length - 1].kind;
}

export interface SpawnerEntityData {
  rect: { x: number; y: number; w: number; h: number };
  pool: PoolEntry[];
  minCount: number;
  maxCount: number;
  bias: SpawnBias;
  seed: number;
  avoidEntity: boolean;
  fluidVolumeOverride: number;
  maintain: boolean;
}

/** Read fields with safe defaults from a `ContainerSpawner` LDtk entity. */
export function readSpawnerEntity(ent: LdtkEntity): SpawnerEntityData {
  const f = ent.fields ?? {};
  const pool = parsePool(f['Pool']);
  // Accept either `Min`/`Max` or `MinCount`/`MaxCount` — Victor's LDtk
  // setup uses the shorter names; spec doc shows the longer ones. Either
  // works for the same effect.
  const minRaw = typeof f['MinCount'] === 'number' ? f['MinCount']
              : typeof f['Min'] === 'number'      ? f['Min']
              : 1;
  const maxRaw = typeof f['MaxCount'] === 'number' ? f['MaxCount']
              : typeof f['Max'] === 'number'      ? f['Max']
              : 3;
  const minCount = Math.max(0, Math.floor(minRaw as number));
  const maxCount = Math.max(minCount, Math.floor(maxRaw as number));
  const biasRaw = typeof f['Bias'] === 'string' ? (f['Bias'] as string) : 'Floor';
  const bias: SpawnBias = (biasRaw === 'Stack' || biasRaw === 'Cluster' || biasRaw === 'Drop')
    ? biasRaw : 'Floor';
  const seed = typeof f['Seed'] === 'number' ? Math.floor(f['Seed'] as number) : -1;
  const avoidEntity = typeof f['AvoidEntity'] === 'boolean' ? (f['AvoidEntity'] as boolean) : true;
  const fluidVolumeOverride = typeof f['FluidVolumeOverride'] === 'number' ? (f['FluidVolumeOverride'] as number) : -1;
  const maintain = typeof f['Maintain'] === 'boolean' ? (f['Maintain'] as boolean) : false;
  return {
    rect: { x: ent.px[0], y: ent.px[1], w: ent.width, h: ent.height },
    pool, minCount, maxCount, bias, seed, avoidEntity, fluidVolumeOverride, maintain,
  };
}

/**
 * Run a single spawner. Returns the list of newly created (but unparented)
 * ThrowableContainer instances. The caller is responsible for adding them
 * to `containers` array and the visual layer, plus calling settleAtSpawn.
 */
export function runContainerSpawner(opts: SpawnerOptions): ThrowableContainer[] {
  const out: ThrowableContainer[] = [];
  if (opts.pool.length === 0) return out;
  const grid = opts.collisionGrid;
  if (!grid || grid.length === 0) return out;
  const gridH = grid.length;
  const gridW = grid[0]?.length ?? 0;
  if (!gridW) return out;

  const rand = opts.seed >= 0 ? (() => { const p = new PRNG(opts.seed); return () => p.next(); })() : Math.random;
  const rng = {
    next: rand,
    int: (min: number, max: number) => min + Math.floor(rand() * (max - min + 1)),
  };

  // Rect → grid cell range (clamped to grid).
  const lgx = Math.max(0, Math.floor(opts.rect.x / 16));
  const tgy = Math.max(0, Math.floor(opts.rect.y / 16));
  const rgx = Math.min(gridW - 1, Math.floor((opts.rect.x + opts.rect.w - 1) / 16));
  const bgy = Math.min(gridH - 1, Math.floor((opts.rect.y + opts.rect.h - 1) / 16));

  // Occupancy mask (existing containers + scene-marked cells).
  const occupied = new Set<string>(opts.occupiedCells ?? []);
  for (const c of opts.existing) {
    const gx0 = Math.floor(c.x / 16);
    const gx1 = Math.floor((c.x + c.spec.width - 1) / 16);
    const gy0 = Math.floor(c.y / 16);
    const gy1 = Math.floor((c.y + c.spec.height - 1) / 16);
    for (let gy = gy0; gy <= gy1; gy++) {
      for (let gx = gx0; gx <= gx1; gx++) occupied.add(`${gx},${gy}`);
    }
  }

  // Candidate cells inside the rect.
  //
  //  - Floor / Stack / Cluster: cell empty AND directly-below cell is solid
  //    (boxes need a floor to land on for the placement to make sense).
  //  - Drop: cell empty only (no floor check). Spawned containers retain
  //    their initial Y and are NOT settled — gravity tick takes over and
  //    drops them naturally. Below=air = free fall, below=solid = static
  //    drop start with a tiny gravity pull.
  const floorCandidates: Array<[number, number]> = [];
  const dropMode = opts.bias === 'Drop';
  for (let gy = tgy; gy <= bgy; gy++) {
    for (let gx = lgx; gx <= rgx; gx++) {
      if ((grid[gy]?.[gx] ?? 0) !== 0) continue;
      if (!dropMode) {
        const below = grid[gy + 1]?.[gx];
        if (below === undefined || !SOLID_FOR_FLOOR.has(below)) continue;
      }
      if (opts.avoidEntity && occupied.has(`${gx},${gy}`)) continue;
      floorCandidates.push([gx, gy]);
    }
  }
  if (floorCandidates.length === 0) {
    // Per-cell diagnostic — emit cell-vs-below mapping so designers can see
    // exactly which cell fails and why. Format: "(gx,gy)=cellValue/belowValue".
    const diag: string[] = [];
    for (let gy = tgy; gy <= bgy; gy++) {
      for (let gx = lgx; gx <= rgx; gx++) {
        const v = grid[gy]?.[gx] ?? '?';
        const b = grid[gy + 1]?.[gx] ?? '?';
        const reasonCell = v !== 0 ? `cell≠air(${v})` : '';
        const reasonBelow = (typeof b === 'number' && !SOLID_FOR_FLOOR.has(b)) ? `below=${b}` : '';
        const reason = [reasonCell, reasonBelow].filter(Boolean).join(' ');
        diag.push(`(${gx},${gy})=${v}/${b}${reason ? ` [${reason}]` : ''}`);
      }
    }
    // eslint-disable-next-line no-console
    console.warn(`[ContainerSpawner] no floor candidates in rect px=(${opts.rect.x},${opts.rect.y}) ${opts.rect.w}x${opts.rect.h} (cells ${lgx},${tgy}..${rgx},${bgy}).\n  Need: cell=0(air) AND below∈{1,3,7,9,12,15}.\n  Actual: ${diag.join(' ')}`);
    return out;
  }
  // eslint-disable-next-line no-console
  console.log(`[ContainerSpawner] rect=(${opts.rect.x},${opts.rect.y}) ${opts.rect.w}x${opts.rect.h} bias=${opts.bias} pool=${opts.pool.map(p => `${p.kind}:${p.weight}`).join(',')} minMax=${opts.minCount}..${opts.maxCount} candidates=${floorCandidates.length}`);

  // Fisher-Yates shuffle for unbiased candidate order.
  for (let i = floorCandidates.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [floorCandidates[i], floorCandidates[j]] = [floorCandidates[j], floorCandidates[i]];
  }

  const requested = Math.max(0, rng.int(opts.minCount, opts.maxCount));
  const count = Math.min(requested, floorCandidates.length);

  const placeOne = (gx: number, gy: number): boolean => {
    const key = `${gx},${gy}`;
    if (occupied.has(key)) return false;
    if ((grid[gy]?.[gx] ?? 1) !== 0) return false;
    const kind = weightedPick(opts.pool, rand);
    if (!kind) return false;
    const fv = opts.fluidVolumeOverride >= 0 ? opts.fluidVolumeOverride : undefined;
    const c = new ThrowableContainer(kind, gx * 16, gy * 16, fv);
    if (dropMode) (c as unknown as { skipSettle: boolean }).skipSettle = true;
    out.push(c);
    // Mark every cell the container's sprite frame covers (32×32 = 2×2
    // cells with top-left pivot) so subsequent placements leave room.
    // Without this, adjacent floor candidates would each spawn a box and
    // the two boxes would jam side-by-side at the same Y.
    const cellsW = Math.max(1, Math.ceil(c.spec.width / 16));
    const cellsH = Math.max(1, Math.ceil(c.spec.height / 16));
    for (let dy = 0; dy < cellsH; dy++) {
      for (let dx = 0; dx < cellsW; dx++) {
        occupied.add(`${gx + dx},${gy + dy}`);
      }
    }
    return true;
  };

  if (opts.bias === 'Floor' || opts.bias === 'Drop') {
    // Walk through candidates until we've placed `count` boxes or run out.
    // placeOne can fail when occupancy spills over from a previous placement
    // (32×32 containers reserve 2 cells), so we don't index 1:1 with `count`.
    let placed = 0;
    for (let i = 0; i < floorCandidates.length && placed < count; i++) {
      const [gx, gy] = floorCandidates[i];
      if (placeOne(gx, gy)) placed++;
    }
  } else if (opts.bias === 'Stack') {
    // Pick `count` floor anchors; for each, stack 1..3 boxes up.
    for (let i = 0; i < count; i++) {
      const [gx, gy] = floorCandidates[i];
      if (!placeOne(gx, gy)) continue;
      const stackHeight = rng.int(0, 2); // 0..2 additional boxes
      let curGy = gy - 1;
      for (let s = 0; s < stackHeight; s++) {
        if (curGy < tgy) break;
        if ((grid[curGy]?.[gx] ?? 1) !== 0) break;
        if (!placeOne(gx, curGy)) break;
        curGy--;
      }
    }
  } else if (opts.bias === 'Cluster') {
    // Cluster — anchor 1 box + 1-3 satellites in a tight bunch.
    //
    // Containers occupy 2 cells horizontally (32 px), so satellite candidates
    // sit 2 cells away from the anchor (the cell *right next to* the anchor
    // is already occupied by the anchor's own footprint).
    //
    // Vertical satellites stack on the anchor — those skip the floor check
    // since "below" is the anchor itself.
    const HORIZ_SATS: Array<[number, number]> = [
      [2, 0], [-2, 0],     // side-by-side spacing (2 cells = anchor width)
      [4, 0], [-4, 0],     // outer ring (2 boxes apart)
    ];
    const VERT_SATS: Array<[number, number]> = [
      [0, -1],             // directly on top of the anchor
      [0, -2],             // 2-stack
    ];
    for (let i = 0; i < count; i++) {
      const [gx, gy] = floorCandidates[i];
      if (!placeOne(gx, gy)) continue;
      const satCount = rng.int(1, 3); // raised floor — was 0..2, often 0
      // Mix horizontal + vertical pools so cluster reads as a heap (2D)
      // rather than a single row.
      const offs = [...HORIZ_SATS, ...VERT_SATS];
      for (let k = offs.length - 1; k > 0; k--) {
        const j = Math.floor(rand() * (k + 1));
        [offs[k], offs[j]] = [offs[j], offs[k]];
      }
      let placed = 0;
      for (const [dx, dy] of offs) {
        if (placed >= satCount) break;
        const nx = gx + dx, ny = gy + dy;
        if ((grid[ny]?.[nx] ?? 1) !== 0) continue;
        // Vertical-stack satellites (dy < 0) skip the floor check — their
        // "below" is either the anchor or another stacked satellite, both
        // of which act as floor (occupied set blocks horizontal collisions).
        if (dy >= 0) {
          const blow = grid[ny + 1]?.[nx];
          if (blow === undefined || !SOLID_FOR_FLOOR.has(blow)) continue;
        }
        if (placeOne(nx, ny)) placed++;
      }
    }
  }
  return out;
}
