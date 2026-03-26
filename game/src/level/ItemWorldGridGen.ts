/**
 * ItemWorldGridGen.ts
 * Spelunky-style critical-path grid generator for the Item World template system.
 *
 * Implements: System_ItemWorld_Core.md — Procedural room layout via template selection.
 *
 * The generator builds a gridW × gridH matrix of cells.
 * A single critical path walks from a random cell in row 0 down to row gridH-1,
 * moving left, right, or down at each step (clamped to grid bounds).
 * Each path cell receives a RoomTemplate picked to match its required exits.
 * Non-path cells optionally receive random combat templates (25% chance).
 *
 * Caller (ItemWorldScene) reads `cell.template.grid` as the tile data for
 * each room instead of invoking ChunkAssembler.
 */

import { PRNG } from '@utils/PRNG';
import {
  pickTemplate,
  ALL_TEMPLATES,
  type RoomTemplate,
  type ExitDir,
} from './ItemWorldTemplates';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GridCell {
  row: number;
  col: number;
  template: RoomTemplate | null;
  isPath: boolean;
  isBoss: boolean;
  isStart: boolean;
}

export interface ItemWorldGrid {
  width: number;
  height: number;
  /** cells[row][col] */
  cells: GridCell[][];
  startCell: GridCell;
  bossCell: GridCell;
}

// ─── Generation constants ────────────────────────────────────────────────────

/** Probability of a non-path cell receiving a random combat template. */
const BRANCH_FILL_CHANCE = 0.25;

/**
 * Probability weights for the critical-path walk at each step.
 * The path always reaches the bottom row eventually; DOWN fills the remainder.
 */
const WEIGHT_LEFT  = 0.3;
const WEIGHT_RIGHT = 0.3;
// WEIGHT_DOWN = 1 - WEIGHT_LEFT - WEIGHT_RIGHT = 0.4

// ─── Main entry point ────────────────────────────────────────────────────────

/**
 * Generate a complete Item World room grid.
 *
 * @param gridW  Number of columns (e.g. 3 for a Normal-rarity stratum).
 * @param gridH  Number of rows    (e.g. 3 for the first stratum).
 * @param seed   Deterministic seed (typically itemUid × some constant).
 */
export function generateItemWorldGrid(
  gridW: number,
  gridH: number,
  seed: number,
): ItemWorldGrid {
  const rng = new PRNG(seed);

  // ── 1. Initialise empty grid ───────────────────────────────────────────────
  const cells: GridCell[][] = [];
  for (let r = 0; r < gridH; r++) {
    const rowArr: GridCell[] = [];
    for (let c = 0; c < gridW; c++) {
      rowArr.push({
        row: r,
        col: c,
        template: null,
        isPath: false,
        isBoss: false,
        isStart: false,
      });
    }
    cells.push(rowArr);
  }

  // ── 2. Walk the critical path (top → bottom) ──────────────────────────────
  const path = walkCriticalPath(gridW, gridH, rng);

  // Mark path membership
  for (const { r, c } of path) {
    cells[r][c].isPath = true;
  }

  // Mark start and boss
  const startPos = path[0];
  const bossPos  = path[path.length - 1];
  cells[startPos.r][startPos.c].isStart = true;
  cells[bossPos.r][bossPos.c].isBoss   = true;

  // ── 3. Assign exits for each path cell ────────────────────────────────────
  //
  // For cell i in the path:
  //   - prev cell tells us which direction we came FROM (open that side)
  //   - next cell tells us which direction we leave TO   (open that side)
  for (let i = 0; i < path.length; i++) {
    const { r, c } = path[i];
    const required = computeRequiredExits(path, i);

    const cell = cells[r][c];

    // Boss cell always uses boss_U; start cell always uses start_D
    if (cell.isBoss) {
      cell.template = ALL_TEMPLATES.find(t => t.name === 'boss_U')!;
    } else if (cell.isStart) {
      cell.template = ALL_TEMPLATES.find(t => t.name === 'start_D')!;
    } else {
      cell.template = pickTemplate(required, rng);
    }
  }

  // ── 4. Optionally fill non-path cells ─────────────────────────────────────
  const combatTemplates = ALL_TEMPLATES.filter(
    t => t.type === 'combat' || t.type === 'corridor',
  );

  for (let r = 0; r < gridH; r++) {
    for (let c = 0; c < gridW; c++) {
      const cell = cells[r][c];
      if (cell.isPath) continue;
      if (rng.next() < BRANCH_FILL_CHANCE && combatTemplates.length > 0) {
        cell.template = combatTemplates[rng.nextInt(0, combatTemplates.length - 1)];
        // Non-path filler cells do not participate in navigation;
        // isPath stays false so the scene ignores them for door linking.
      }
    }
  }

  return {
    width: gridW,
    height: gridH,
    cells,
    startCell: cells[startPos.r][startPos.c],
    bossCell:  cells[bossPos.r][bossPos.c],
  };
}

// ─── Critical path walker ────────────────────────────────────────────────────

interface PathStep {
  r: number;
  c: number;
}

/**
 * Walk from a random column in row 0 to any column in row gridH-1.
 * At each step the walker may move left, right, or down.
 * Left/right moves are clamped to [0, gridW-1]; already-visited cells
 * force a downward step to prevent horizontal loops.
 */
function walkCriticalPath(
  gridW: number,
  gridH: number,
  rng: PRNG,
): PathStep[] {
  const path: PathStep[] = [];
  const visited = new Set<string>();

  let c = rng.nextInt(0, gridW - 1);
  let r = 0;
  path.push({ r, c });
  visited.add(key(r, c));

  while (r < gridH - 1) {
    const roll = rng.next();
    let nc = c;
    let nr = r;

    if (roll < WEIGHT_LEFT) {
      nc = c - 1;
    } else if (roll < WEIGHT_LEFT + WEIGHT_RIGHT) {
      nc = c + 1;
    } else {
      nr = r + 1;
    }

    // Clamp horizontal to grid bounds — if hitting a wall, go down instead
    if (nc < 0 || nc >= gridW) {
      nc = c;
      nr = r + 1;
    }

    // If the target cell was already visited, go down to avoid loops
    if (visited.has(key(nr, nc))) {
      nc = c;
      nr = r + 1;
    }

    c = nc;
    r = nr;
    path.push({ r, c });
    visited.add(key(r, c));
  }

  return path;
}

function key(r: number, c: number): string {
  return `${r},${c}`;
}

// ─── Exit computation ─────────────────────────────────────────────────────────

/**
 * Determine which exits a path cell at index `i` must expose.
 *
 * A cell needs an exit toward its predecessor (where the player comes FROM)
 * and an exit toward its successor (where the player goes TO).
 *
 * Direction mapping (grid coordinates):
 *   predecessor is to the LEFT  → this cell needs a L exit
 *   predecessor is to the RIGHT → this cell needs a R exit
 *   predecessor is ABOVE        → this cell needs a U exit (entered from above)
 *   predecessor is BELOW        → this cell needs a D exit  (unusual but safe)
 *   successor   is to the LEFT  → this cell needs a L exit
 *   successor   is to the RIGHT → this cell needs a R exit
 *   successor   is BELOW        → this cell needs a D exit
 *   successor   is ABOVE        → this cell needs a U exit
 */
function computeRequiredExits(path: PathStep[], i: number): ExitDir[] {
  const exits = new Set<ExitDir>();
  const cur = path[i];

  if (i > 0) {
    const prev = path[i - 1];
    const dir = directionFrom(cur, prev);
    if (dir) exits.add(dir);
  }

  if (i < path.length - 1) {
    const next = path[i + 1];
    const dir = directionFrom(cur, next);
    if (dir) exits.add(dir);
  }

  return [...exits];
}

/**
 * Return the ExitDir from `from` toward `to`, or null if not adjacent.
 */
function directionFrom(from: PathStep, to: PathStep): ExitDir | null {
  const dc = to.c - from.c;
  const dr = to.r - from.r;

  if (dc === -1 && dr === 0) return 'L';
  if (dc ===  1 && dr === 0) return 'R';
  if (dc === 0 && dr === -1) return 'U';
  if (dc === 0 && dr ===  1) return 'D';

  // Non-adjacent (diagonal or large jump) — should not occur in a valid path
  return null;
}
