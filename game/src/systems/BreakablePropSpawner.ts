/**
 * BreakablePropSpawner — Procedural placement of destructible props.
 *
 * Props are 2x2 tiles (32x32 px), anchored bottom-left.
 * Needs 2 empty tiles vertically above a solid floor.
 *
 * Rules:
 *   - Floor tiles only (solid below, 2 empty above)
 *   - Right neighbor also empty (2x2 footprint)
 *   - Not on hazard/void/spike tiles
 *   - Max 3~6 per room/level section
 *   - Min 4 tile distance between props
 *   - Deterministic (seed-based)
 */

import { BreakableProp, pickVariant } from '@entities/BreakableProp';

const TILE = 16;
const MAX_PROPS = 6;
const MIN_PROPS = 3;
const MIN_DIST = 4; // minimum tile distance between props

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function isEmpty(val: number): boolean {
  return val === 0;
}

function isFloor(val: number): boolean {
  return val === 1 || val === 3 || val === 7 || val === 9;
}

interface Candidate {
  col: number;
  row: number;
}

export function spawnBreakableProps(
  grid: number[][],
  seed: number,
  isItemWorld: boolean,
  excludeSet?: Set<string>,
): BreakableProp[] {
  const rng = mulberry32(seed);
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  if (rows < 4 || cols < 4) return [];

  const g = (r: number, c: number) => grid[r]?.[c] ?? 1;

  // Candidates: 2x2 empty area sitting on solid floor
  const candidates: Candidate[] = [];
  for (let row = 2; row < rows - 1; row++) {
    for (let col = 1; col < cols - 2; col++) {
      // Bottom row of prop: (row, col) and (row, col+1) must be empty
      // Floor below: (row+1, col) and (row+1, col+1) must be solid
      // Top row of prop: (row-1, col) and (row-1, col+1) must be empty
      if (!isEmpty(g(row, col)) || !isEmpty(g(row, col + 1))) continue;
      if (!isFloor(g(row + 1, col)) || !isFloor(g(row + 1, col + 1))) continue;
      if (!isEmpty(g(row - 1, col)) || !isEmpty(g(row - 1, col + 1))) continue;

      // No hazards nearby
      if (g(row, col) === 5 || g(row, col) === 10) continue;
      if (g(row - 1, col) === 5 || g(row - 1, col) === 10) continue;

      if (excludeSet?.has(`${col},${row}`) || excludeSet?.has(`${col + 1},${row}`)) continue;

      candidates.push({ col, row });
    }
  }

  if (candidates.length === 0) return [];

  // Shuffle
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  const target = MIN_PROPS + Math.floor(rng() * (MAX_PROPS - MIN_PROPS + 1));
  const props: BreakableProp[] = [];

  for (const cand of candidates) {
    if (props.length >= target) break;

    // Distance check against existing props (in tile space)
    let tooClose = false;
    for (const p of props) {
      const dx = Math.abs(p.x / TILE - cand.col);
      const dy = Math.abs((p.y + 32) / TILE - cand.row); // p.y is top of prop, +32 = bottom row
      if (dx + dy < MIN_DIST) { tooClose = true; break; }
    }
    if (tooClose) continue;

    const variant = pickVariant(isItemWorld, rng);
    const propSeed = Math.floor(rng() * 0x7fffffff);
    // BreakableProp constructor takes floor position; it subtracts S internally
    const prop = new BreakableProp(
      cand.col * TILE,
      (cand.row + 1) * TILE, // floor Y (constructor subtracts 32 for bottom-left anchor)
      variant,
      propSeed,
    );
    props.push(prop);
  }

  return props;
}
