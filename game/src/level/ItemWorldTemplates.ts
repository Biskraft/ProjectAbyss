/**
 * ItemWorldTemplates.ts
 * Pre-authored room templates for the Item World (Memory Strata).
 *
 * Implements: System_ItemWorld_Core.md — Template-based room layout system.
 * Spelunky-inspired probabilistic tiles and template mirroring.
 *
 * Template size: 32×16 tiles (512×256 px at 16px/tile).
 * Navigation: room-by-room with fade (existing ItemWorldScene pattern).
 * Templates replace ChunkAssembler output per-room.
 * Floor is baked into each template — no runtime floor injection needed.
 *
 * Tile legend (deterministic):
 *   0 = empty (air)
 *   1 = solid wall / block
 *   2 = water
 *   3 = one-way platform (stand on top, pass through from below)
 *
 * Tile legend (probabilistic — resolved at build time by resolveTiles()):
 *   5 = 50% solid, 50% empty    (Spelunky-style variation)
 *   6 = 50% one-way platform, 50% empty
 *   7 = 25% solid, 75% empty    (sparse obstacles)
 *
 * Door openings (always 0, never 1):
 *   Left  exit: col  0, rows 6-9  (4 tiles tall, vertically centred)
 *   Right exit: col 31, rows 6-9  (4 tiles tall, vertically centred)
 *   Top   exit: row  0, cols 14-17 (4 tiles wide, horizontally centred)
 *   Bottom exit: row 15, cols 14-17 (4 tiles wide, horizontally centred)
 *
 * Outer border is solid (1) everywhere EXCEPT the door openings above.
 */

import { PRNG } from '@utils/PRNG';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ExitDir = 'L' | 'R' | 'U' | 'D';

export interface RoomTemplate {
  /** Unique identifier string */
  name: string;
  /** Which exits this room has */
  exits: ExitDir[];
  /** Semantic room category */
  type: 'start' | 'combat' | 'treasure' | 'boss' | 'corridor';
  /**
   * Tile grid: grid[row][col], row 0 = top, col 0 = left.
   * Exactly TEMPLATE_H rows, each exactly TEMPLATE_W values.
   */
  grid: number[][];
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const TEMPLATE_W = 32;
export const TEMPLATE_H = 16;
export const TEMPLATE_PX_W = TEMPLATE_W * 16; // 512
export const TEMPLATE_PX_H = TEMPLATE_H * 16; // 256

// Door opening tile ranges (inclusive)
export const DOOR_LEFT_COL    = 0;
export const DOOR_RIGHT_COL   = 31;
export const DOOR_ROW_MIN     = 6;
export const DOOR_ROW_MAX     = 9;
export const DOOR_TOP_ROW     = 0;
export const DOOR_BOTTOM_ROW  = 15;
export const DOOR_COL_MIN     = 14;
export const DOOR_COL_MAX     = 17;

// ─── Template helpers ────────────────────────────────────────────────────────

/**
 * Build a full 16×32 border of 1s.
 * Door openings are punched afterward by individual template definitions.
 */
function solidBorder(): number[][] {
  const grid: number[][] = [];
  for (let r = 0; r < TEMPLATE_H; r++) {
    const row: number[] = [];
    for (let c = 0; c < TEMPLATE_W; c++) {
      const isTopOrBottom = (r === 0 || r === TEMPLATE_H - 1);
      const isLeftOrRight = (c === 0 || c === TEMPLATE_W - 1);
      row.push(isTopOrBottom || isLeftOrRight ? 1 : 0);
    }
    grid.push(row);
  }
  return grid;
}

/** Punch a left-wall door opening (rows 6-9, col 0 → 0). */
function punchLeft(grid: number[][]): void {
  for (let r = DOOR_ROW_MIN; r <= DOOR_ROW_MAX; r++) {
    grid[r][0] = 0;
  }
}

/** Punch a right-wall door opening (rows 6-9, col 31 → 0). */
function punchRight(grid: number[][]): void {
  for (let r = DOOR_ROW_MIN; r <= DOOR_ROW_MAX; r++) {
    grid[r][31] = 0;
  }
}

/** Punch a top-wall door opening (row 0, cols 14-17 → 0). */
function punchTop(grid: number[][]): void {
  for (let c = DOOR_COL_MIN; c <= DOOR_COL_MAX; c++) {
    grid[0][c] = 0;
  }
}

/** Punch a bottom-wall door opening (row 15, cols 14-17 → 0). */
function punchBottom(grid: number[][]): void {
  for (let c = DOOR_COL_MIN; c <= DOOR_COL_MAX; c++) {
    grid[15][c] = 0;
  }
}

/** Draw a horizontal row of tiles between col c1 and c2 (inclusive) at given row. */
function hLine(grid: number[][], row: number, c1: number, c2: number, tile: number): void {
  for (let c = c1; c <= c2; c++) {
    grid[row][c] = tile;
  }
}

/** Draw a vertical column of tiles between row r1 and r2 (inclusive) at given col. */
function vLine(grid: number[][], col: number, r1: number, r2: number, tile: number): void {
  for (let r = r1; r <= r2; r++) {
    grid[r][col] = tile;
  }
}

// ─── Template 1: start_D ─────────────────────────────────────────────────────
//
// Exits: ['D']  — Player spawns here descending from above.
// Bottom door only (row 15, cols 14-17).
// Interior: solid floor at rows 12-13, open space above.
// A single wide platform at row 8 acts as a landing pad.

function makeStartD(): RoomTemplate {
  const grid = solidBorder();
  punchBottom(grid);

  // Main floor: rows 12-13, cols 1-30
  hLine(grid, 12, 1, 30, 1);
  hLine(grid, 13, 1, 30, 1);

  // Centre platform (one-way) at row 8, cols 10-21
  hLine(grid, 8, 10, 21, 3);

  // Gap in main floor aligned with bottom door so player can fall through
  // cols 14-17 at rows 12-13 must be open (leads to bottom door)
  for (let c = DOOR_COL_MIN; c <= DOOR_COL_MAX; c++) {
    grid[12][c] = 0;
    grid[13][c] = 0;
  }
  // row 14 interior also clear (leading to door at row 15)
  for (let c = DOOR_COL_MIN; c <= DOOR_COL_MAX; c++) {
    grid[14][c] = 0;
  }

  return {
    name: 'start_D',
    exits: ['D'],
    type: 'start',
    grid,
  };
}

// ─── Template 2: combat_LR_01 ────────────────────────────────────────────────
//
// Exits: ['L', 'R']  — Horizontal corridor with staggered combat platforms.
// Left door: col 0, rows 6-9.  Right door: col 31, rows 6-9.
// Solid floor at row 14.  One-way platforms at rows 8 (left half) and 10 (right half).
// A raised block cluster in the centre creates cover.

function makeCombatLR01(): RoomTemplate {
  const grid = solidBorder();
  punchLeft(grid);
  punchRight(grid);

  // Solid floor: row 14, cols 1-30
  hLine(grid, 14, 1, 30, 1);

  // Platform left side (one-way): row 8, cols 2-12
  hLine(grid, 8, 2, 12, 3);

  // Platform right side (one-way): row 10, cols 19-29
  hLine(grid, 10, 19, 29, 3);

  // Centre block cover: rows 10-13, cols 14-17
  for (let r = 10; r <= 13; r++) {
    hLine(grid, r, 14, 17, 1);
  }

  // Row 14 gap under door openings so they connect to floor level
  // (doors are at rows 6-9 so no floor gap needed here — exits are mid-height)

  return {
    name: 'combat_LR_01',
    exits: ['L', 'R'],
    type: 'combat',
    grid,
  };
}

// ─── Template 3: combat_LR_02 ────────────────────────────────────────────────
//
// Exits: ['L', 'R']  — Tight corridors with narrow passages and more walls.
// Floor at row 14.  Tall pillars at cols 8 and 23 (rows 8-13).
// Two short platforms at rows 6 (cols 2-5) and 6 (cols 26-29) align with door height
// to give the player a landing spot near each door.

function makeCombatLR02(): RoomTemplate {
  const grid = solidBorder();
  punchLeft(grid);
  punchRight(grid);

  // Solid floor: row 14, cols 1-30
  hLine(grid, 14, 1, 30, 1);

  // Left-side landing platform (one-way) at row 10, cols 2-7
  hLine(grid, 10, 2, 7, 3);

  // Right-side landing platform (one-way) at row 10, cols 24-29
  hLine(grid, 10, 24, 29, 3);

  // Left pillar: rows 8-13, cols 8-9
  for (let r = 8; r <= 13; r++) {
    hLine(grid, r, 8, 9, 1);
  }

  // Right pillar: rows 8-13, cols 22-23
  for (let r = 8; r <= 13; r++) {
    hLine(grid, r, 22, 23, 1);
  }

  // Centre raised platform (one-way): row 7, cols 13-18
  hLine(grid, 7, 13, 18, 3);

  // Low wall under centre platform: rows 11-13, cols 13-18
  for (let r = 11; r <= 13; r++) {
    hLine(grid, r, 13, 18, 1);
  }

  return {
    name: 'combat_LR_02',
    exits: ['L', 'R'],
    type: 'combat',
    grid,
  };
}

// ─── Template 4: combat_LRUD ─────────────────────────────────────────────────
//
// Exits: ['L', 'R', 'U', 'D']  — Open crossroads connecting all four directions.
// Top door: row 0, cols 14-17.  Bottom door: row 15, cols 14-17.
// Left door: col 0, rows 6-9.   Right door: col 31, rows 6-9.
// Main floor at row 13.  Shaft through centre (cols 14-17) kept clear vertically.
// Platforms at rows 5 (left), 8, and 10 guide player between exits.

function makeCombatLRUD(): RoomTemplate {
  const grid = solidBorder();
  punchLeft(grid);
  punchRight(grid);
  punchTop(grid);
  punchBottom(grid);

  // Main floor: row 13, cols 1-30  (gap at cols 14-17 for vertical shaft)
  hLine(grid, 13, 1, 13, 1);
  hLine(grid, 13, 18, 30, 1);

  // Vertical shaft walls: col 13 and col 18 as borders, rows 1-14
  // (shaft interior cols 14-17 stays clear)
  // We add solid wall strips beside the shaft to keep horizontal traversal bounded
  vLine(grid, 13, 1, 12, 1);
  vLine(grid, 18, 1, 12, 1);

  // Left landing platform (one-way) at row 8, cols 1-12
  hLine(grid, 8, 1, 12, 3);

  // Right landing platform (one-way) at row 8, cols 19-30
  hLine(grid, 8, 19, 30, 3);

  // Mid platform inside shaft: row 5 (one-way), cols 14-17
  hLine(grid, 5, 14, 17, 3);

  // Row 14 shaft clear (door at row 15)
  for (let c = DOOR_COL_MIN; c <= DOOR_COL_MAX; c++) {
    grid[14][c] = 0;
  }

  return {
    name: 'combat_LRUD',
    exits: ['L', 'R', 'U', 'D'],
    type: 'combat',
    grid,
  };
}

// ─── Template 5: combat_LRD ──────────────────────────────────────────────────
//
// Exits: ['L', 'R', 'D']  — T-junction open at left, right, and bottom.
// Floor at row 13 with a hole in the centre leading to the bottom door.
// Platforms at rows 8 and 10 flank the central shaft.

function makeCombatLRD(): RoomTemplate {
  const grid = solidBorder();
  punchLeft(grid);
  punchRight(grid);
  punchBottom(grid);

  // Main floor: row 13, cols 1-30  (gap at cols 14-17 for downward shaft)
  hLine(grid, 13, 1, 13, 1);
  hLine(grid, 13, 18, 30, 1);

  // Shaft side walls
  vLine(grid, 13, 1, 12, 1);
  vLine(grid, 18, 1, 12, 1);

  // Left platform (one-way): row 8, cols 2-12
  hLine(grid, 8, 2, 12, 3);

  // Right platform (one-way): row 8, cols 19-29
  hLine(grid, 8, 19, 29, 3);

  // Row 14 shaft clear
  for (let c = DOOR_COL_MIN; c <= DOOR_COL_MAX; c++) {
    grid[14][c] = 0;
  }

  return {
    name: 'combat_LRD',
    exits: ['L', 'R', 'D'],
    type: 'combat',
    grid,
  };
}

// ─── Template 6: combat_UD ───────────────────────────────────────────────────
//
// Exits: ['U', 'D']  — Vertical shaft, good for wall-jump traversal.
// Alternating one-way platforms on the left and right sides of the shaft.
// Centre column kept clear for unobstructed vertical travel.

function makeCombatUD(): RoomTemplate {
  const grid = solidBorder();
  punchTop(grid);
  punchBottom(grid);

  // Shaft is the full interior width; add inner walls to narrow passage
  // Inner left wall: col 4, rows 1-14 (except rows 6-9 = door height zone)
  vLine(grid, 4, 1, 14, 1);
  // Inner right wall: col 27, rows 1-14
  vLine(grid, 27, 1, 14, 1);

  // Alternating platforms inside shaft (cols 5-26):
  // Left-side platforms (one-way): anchored to col 4+1 = 5, extend right to col 14
  hLine(grid, 3,  5, 14, 3);
  hLine(grid, 7,  13, 22, 3); // right-side
  hLine(grid, 11, 5, 14, 3); // left-side again

  // Small ledge at rows 6-9 near top to align with left/right blocked walls
  // (no left/right exits, so left/right wall stays solid — already handled)

  // Bottom landing: rows 12-13 solid floor inside shaft, clear above door
  hLine(grid, 12, 5, 26, 1);
  hLine(grid, 13, 5, 26, 1);

  // Hole in bottom floor aligned with bottom door
  for (let c = DOOR_COL_MIN; c <= DOOR_COL_MAX; c++) {
    grid[12][c] = 0;
    grid[13][c] = 0;
  }
  // Row 14 clear for door
  for (let c = DOOR_COL_MIN; c <= DOOR_COL_MAX; c++) {
    grid[14][c] = 0;
  }

  return {
    name: 'combat_UD',
    exits: ['U', 'D'],
    type: 'corridor',
    grid,
  };
}

// ─── Template 7: treasure_LR ─────────────────────────────────────────────────
//
// Exits: ['L', 'R']  — Treasure room. Reward platform at row 4 centre,
// requiring the player to climb a series of stepping platforms to reach it.
// No enemies by design (combat=false handled in scene spawning logic).

function makeTreasureLR(): RoomTemplate {
  const grid = solidBorder();
  punchLeft(grid);
  punchRight(grid);

  // Solid floor: row 14, cols 1-30
  hLine(grid, 14, 1, 30, 1);

  // Step ladder (one-way platforms) ascending to centre treasure dais:
  // Step 1: row 12, cols 4-9
  hLine(grid, 12, 4, 9, 3);
  // Step 2: row 10, cols 8-13
  hLine(grid, 10, 8, 13, 3);
  // Step 3: row 8, cols 12-19
  hLine(grid, 8, 12, 19, 3);
  // Step 4: row 6 (door height zone left side), cols 2-6 — landing near left door
  hLine(grid, 6, 2, 6, 3);
  // Step 4 (right mirror): row 6, cols 25-29 — landing near right door
  hLine(grid, 6, 25, 29, 3);

  // Treasure dais (solid base + one-way top): row 4-5, cols 13-18
  hLine(grid, 5, 13, 18, 1);
  hLine(grid, 4, 13, 18, 3); // player can land on top

  // Mirror step on right side for symmetrical approach
  hLine(grid, 12, 22, 27, 3);
  hLine(grid, 10, 18, 23, 3);

  return {
    name: 'treasure_LR',
    exits: ['L', 'R'],
    type: 'treasure',
    grid,
  };
}

// ─── Template 8: boss_U ──────────────────────────────────────────────────────
//
// Exits: ['U']  — Boss arena. Player enters from the top door.
// Flat arena floor at row 13.  Raised walls on left and right create a pit feel.
// Open fighting space in the centre.  No bottom exit.

function makeBossU(): RoomTemplate {
  const grid = solidBorder();
  punchTop(grid);

  // Wide arena floor: rows 13-14, cols 1-30
  hLine(grid, 13, 1, 30, 1);
  hLine(grid, 14, 1, 30, 1);

  // Left raised wall: rows 6-12, cols 1-3  (narrows left side, gives the boss
  // a clear arena while player descends from top)
  for (let r = 6; r <= 12; r++) {
    hLine(grid, r, 1, 3, 1);
  }
  // Right raised wall: rows 6-12, cols 28-30
  for (let r = 6; r <= 12; r++) {
    hLine(grid, r, 28, 30, 1);
  }

  // Centre low platform (one-way) for tactical cover: row 9, cols 12-19
  hLine(grid, 9, 12, 19, 3);

  // Descent shaft from top door widens to arena — walls taper:
  // col 13 and col 18 act as shaft sides rows 1-7, then open up
  vLine(grid, 13, 1, 7, 1);
  vLine(grid, 18, 1, 7, 1);
  // Top door cols 14-17 kept clear (already punched)

  return {
    name: 'boss_U',
    exits: ['U'],
    type: 'boss',
    grid,
  };
}

// ─── Template 9: combat_LR_03 ────────────────────────────────────────────────
// Arena with scattered cover blocks using probabilistic tiles.
function makeCombatLR03(): RoomTemplate {
  const grid = solidBorder();
  punchLeft(grid); punchRight(grid);
  hLine(grid, 14, 1, 30, 1); // floor

  // Probabilistic cover blocks (50% solid)
  for (const [r, c] of [[11,6],[11,7],[11,24],[11,25],[9,14],[9,15],[9,16],[9,17]]) {
    grid[r][c] = 5;
  }
  // Scattered platforms (50% one-way)
  hLine(grid, 7, 4, 8, 6);
  hLine(grid, 7, 23, 27, 6);
  hLine(grid, 10, 12, 19, 6);
  // Sparse wall chunks (25% solid)
  grid[12][10] = 7; grid[12][11] = 7;
  grid[12][20] = 7; grid[12][21] = 7;

  return { name: 'combat_LR_03', exits: ['L', 'R'], type: 'combat', grid };
}

// ─── Template 10: combat_LR_04 ──────────────────────────────────────────────
// Pit room — floor gap in centre forces jumping.
function makeCombatLR04(): RoomTemplate {
  const grid = solidBorder();
  punchLeft(grid); punchRight(grid);
  hLine(grid, 14, 1, 11, 1); // left floor
  hLine(grid, 14, 20, 30, 1); // right floor
  // Pit centre — no floor cols 12-19
  hLine(grid, 8, 2, 10, 3); // left platform
  hLine(grid, 8, 21, 29, 3); // right platform
  hLine(grid, 5, 12, 19, 6); // probabilistic bridge
  // Probabilistic pillars
  for (let r = 10; r <= 13; r++) { grid[r][12] = 5; grid[r][19] = 5; }

  return { name: 'combat_LR_04', exits: ['L', 'R'], type: 'combat', grid };
}

// ─── Template 11: combat_LR_05 ──────────────────────────────────────────────
// Multi-tier combat room with 3 floor levels.
function makeCombatLR05(): RoomTemplate {
  const grid = solidBorder();
  punchLeft(grid); punchRight(grid);
  hLine(grid, 14, 1, 30, 1); // ground floor
  hLine(grid, 10, 1, 13, 1); // left mid floor
  hLine(grid, 10, 18, 30, 1); // right mid floor
  hLine(grid, 6, 8, 23, 3); // top platform (one-way)
  // Probabilistic walls between levels
  for (let r = 11; r <= 13; r++) { grid[r][14] = 5; grid[r][17] = 5; }

  return { name: 'combat_LR_05', exits: ['L', 'R'], type: 'combat', grid };
}

// ─── Template 12: combat_LRU_01 ─────────────────────────────────────────────
// T-junction open at left, right, and top.
function makeCombatLRU01(): RoomTemplate {
  const grid = solidBorder();
  punchLeft(grid); punchRight(grid); punchTop(grid);
  hLine(grid, 14, 1, 30, 1); // floor
  // Shaft walls beside top door
  vLine(grid, 13, 1, 12, 1);
  vLine(grid, 18, 1, 12, 1);
  // Platforms in shaft for climbing
  hLine(grid, 10, 14, 17, 3);
  hLine(grid, 6, 14, 17, 3);
  // Side platforms
  hLine(grid, 8, 2, 12, 3);
  hLine(grid, 8, 19, 29, 3);

  return { name: 'combat_LRU_01', exits: ['L', 'R', 'U'], type: 'combat', grid };
}

// ─── Template 13: combat_LRU_02 ─────────────────────────────────────────────
// Open upward room with wall-jump friendly walls.
function makeCombatLRU02(): RoomTemplate {
  const grid = solidBorder();
  punchLeft(grid); punchRight(grid); punchTop(grid);
  hLine(grid, 14, 1, 30, 1); // floor
  // Narrow walls flanking the top exit
  vLine(grid, 12, 1, 10, 1);
  vLine(grid, 19, 1, 10, 1);
  // Staggered platforms inside
  hLine(grid, 11, 13, 18, 3);
  hLine(grid, 7, 13, 18, 3);
  hLine(grid, 3, 14, 17, 3);
  // Side ledges
  hLine(grid, 9, 2, 11, 6);
  hLine(grid, 9, 20, 29, 6);

  return { name: 'combat_LRU_02', exits: ['L', 'R', 'U'], type: 'combat', grid };
}

// ─── Template 14: combat_LRD_02 ─────────────────────────────────────────────
// Wide drop with probabilistic platforms.
function makeCombatLRD02(): RoomTemplate {
  const grid = solidBorder();
  punchLeft(grid); punchRight(grid); punchBottom(grid);
  hLine(grid, 13, 1, 12, 1); // left floor
  hLine(grid, 13, 19, 30, 1); // right floor
  // Wide central shaft (cols 13-18)
  vLine(grid, 12, 1, 12, 1);
  vLine(grid, 19, 1, 12, 1);
  // Probabilistic platforms inside shaft
  hLine(grid, 5, 13, 18, 6);
  hLine(grid, 9, 13, 18, 6);
  // Row 14 clear for bottom door
  for (let c = DOOR_COL_MIN; c <= DOOR_COL_MAX; c++) grid[14][c] = 0;
  // Side platforms
  hLine(grid, 8, 2, 11, 3);
  hLine(grid, 8, 20, 29, 3);

  return { name: 'combat_LRD_02', exits: ['L', 'R', 'D'], type: 'combat', grid };
}

// ─── Template 15: combat_UD_02 ──────────────────────────────────────────────
// Vertical shaft with probabilistic stepping stones.
function makeCombatUD02(): RoomTemplate {
  const grid = solidBorder();
  punchTop(grid); punchBottom(grid);
  vLine(grid, 6, 1, 14, 1);
  vLine(grid, 25, 1, 14, 1);
  // Alternating probabilistic platforms
  hLine(grid, 3, 7, 15, 6);
  hLine(grid, 6, 16, 24, 6);
  hLine(grid, 9, 7, 15, 6);
  hLine(grid, 12, 16, 24, 3);
  // Bottom landing
  hLine(grid, 13, 7, 24, 1);
  for (let c = DOOR_COL_MIN; c <= DOOR_COL_MAX; c++) { grid[13][c] = 0; grid[14][c] = 0; }

  return { name: 'combat_UD_02', exits: ['U', 'D'], type: 'corridor', grid };
}

// ─── Template 16: dead_end_L ────────────────────────────────────────────────
// Dead-end room with only left exit. Treasure alcove.
function makeDeadEndL(): RoomTemplate {
  const grid = solidBorder();
  punchLeft(grid);
  hLine(grid, 14, 1, 30, 1); // floor
  hLine(grid, 10, 15, 28, 1); // raised alcove floor
  hLine(grid, 9, 15, 28, 3); // one-way top
  // Small platforms leading up
  hLine(grid, 12, 4, 9, 3);
  hLine(grid, 8, 2, 7, 6);
  // Sparse cover
  grid[13][20] = 7; grid[13][21] = 7;

  return { name: 'dead_end_L', exits: ['L'], type: 'treasure', grid };
}

// ─── Template 17: dead_end_R ────────────────────────────────────────────────
// Dead-end room with only right exit. Mirror of dead_end_L.
function makeDeadEndR(): RoomTemplate {
  const grid = solidBorder();
  punchRight(grid);
  hLine(grid, 14, 1, 30, 1);
  hLine(grid, 10, 2, 16, 1);
  hLine(grid, 9, 2, 16, 3);
  hLine(grid, 12, 22, 27, 3);
  hLine(grid, 8, 24, 29, 6);
  grid[13][10] = 7; grid[13][11] = 7;

  return { name: 'dead_end_R', exits: ['R'], type: 'treasure', grid };
}

// ─── Template 18: dead_end_U ────────────────────────────────────────────────
// Dead-end room with only top exit. Vertical escape.
function makeDeadEndU(): RoomTemplate {
  const grid = solidBorder();
  punchTop(grid);
  hLine(grid, 14, 1, 30, 1);
  // Climbing platforms toward top exit
  vLine(grid, 13, 1, 13, 1);
  vLine(grid, 18, 1, 13, 1);
  hLine(grid, 11, 14, 17, 3);
  hLine(grid, 7, 14, 17, 3);
  hLine(grid, 3, 14, 17, 3);
  // Side platforms
  hLine(grid, 9, 2, 12, 6);
  hLine(grid, 9, 19, 29, 6);
  hLine(grid, 5, 2, 12, 6);
  hLine(grid, 5, 19, 29, 6);

  return { name: 'dead_end_U', exits: ['U'], type: 'combat', grid };
}

// ─── Template 19: combat_LRUD_02 ────────────────────────────────────────────
// Open crossroads with probabilistic cover.
function makeCombatLRUD02(): RoomTemplate {
  const grid = solidBorder();
  punchLeft(grid); punchRight(grid); punchTop(grid); punchBottom(grid);
  // Main floor with centre gap
  hLine(grid, 13, 1, 13, 1);
  hLine(grid, 13, 18, 30, 1);
  // Shaft walls
  vLine(grid, 13, 1, 12, 1);
  vLine(grid, 18, 1, 12, 1);
  // Inside shaft: probabilistic platforms
  hLine(grid, 4, 14, 17, 6);
  hLine(grid, 8, 14, 17, 6);
  // Row 14 clear
  for (let c = DOOR_COL_MIN; c <= DOOR_COL_MAX; c++) grid[14][c] = 0;
  // Side combat zones with probabilistic cover
  grid[11][4] = 5; grid[11][5] = 5; grid[11][26] = 5; grid[11][27] = 5;
  hLine(grid, 7, 2, 12, 6);
  hLine(grid, 7, 19, 29, 6);
  hLine(grid, 10, 3, 8, 3);
  hLine(grid, 10, 23, 28, 3);

  return { name: 'combat_LRUD_02', exits: ['L', 'R', 'U', 'D'], type: 'combat', grid };
}

// ─── Template 20: start_D_02 ────────────────────────────────────────────────
// Alternate start room — wider opening, sparse platforms.
function makeStartD02(): RoomTemplate {
  const grid = solidBorder();
  punchBottom(grid);
  hLine(grid, 12, 1, 30, 1);
  hLine(grid, 13, 1, 30, 1);
  // Wider bottom gap
  for (let c = 12; c <= 19; c++) { grid[12][c] = 0; grid[13][c] = 0; grid[14][c] = 0; }
  // Probabilistic landing platforms
  hLine(grid, 6, 6, 12, 6);
  hLine(grid, 6, 19, 25, 6);
  hLine(grid, 9, 10, 21, 6);

  return { name: 'start_D_02', exits: ['D'], type: 'start', grid };
}

// ─── Template 21: boss_U_02 ─────────────────────────────────────────────────
// Alternate boss arena — wider with side platforms.
function makeBossU02(): RoomTemplate {
  const grid = solidBorder();
  punchTop(grid);
  hLine(grid, 13, 1, 30, 1);
  hLine(grid, 14, 1, 30, 1);
  // Descent shaft
  vLine(grid, 12, 1, 7, 1);
  vLine(grid, 19, 1, 7, 1);
  // Side elevated platforms
  hLine(grid, 9, 2, 11, 3);
  hLine(grid, 9, 20, 29, 3);
  // Centre probabilistic cover
  grid[11][14] = 5; grid[11][15] = 5; grid[11][16] = 5; grid[11][17] = 5;

  return { name: 'boss_U_02', exits: ['U'], type: 'boss', grid };
}

// ─── Assemble ALL_TEMPLATES ──────────────────────────────────────────────────

export const ALL_TEMPLATES: RoomTemplate[] = [
  makeStartD(),
  makeStartD02(),
  makeCombatLR01(),
  makeCombatLR02(),
  makeCombatLR03(),
  makeCombatLR04(),
  makeCombatLR05(),
  makeCombatLRUD(),
  makeCombatLRUD02(),
  makeCombatLRD(),
  makeCombatLRD02(),
  makeCombatLRU01(),
  makeCombatLRU02(),
  makeCombatUD(),
  makeCombatUD02(),
  makeTreasureLR(),
  makeDeadEndL(),
  makeDeadEndR(),
  makeDeadEndU(),
  makeBossU(),
  makeBossU02(),
];

// ─── Probabilistic tile resolver ────────────────────────────────────────────

/**
 * Resolve probabilistic tiles in a grid copy (Spelunky-style).
 *   5 → 50% solid (1), 50% empty (0)
 *   6 → 50% one-way platform (3), 50% empty (0)
 *   7 → 25% solid (1), 75% empty (0)
 * Returns a new grid — does NOT mutate the input.
 */
export function resolveTiles(grid: number[][], rng: PRNG): number[][] {
  return grid.map(row => row.map(tile => {
    if (tile === 5) return rng.next() < 0.5 ? 1 : 0;
    if (tile === 6) return rng.next() < 0.5 ? 3 : 0;
    if (tile === 7) return rng.next() < 0.25 ? 1 : 0;
    return tile;
  }));
}

// ─── Template mirroring ─────────────────────────────────────────────────────

/**
 * Create a horizontally mirrored copy of a template.
 * Flips the grid left↔right and swaps L/R exits.
 */
export function mirrorTemplate(t: RoomTemplate): RoomTemplate {
  const mirroredGrid = t.grid.map(row => [...row].reverse());
  const mirroredExits = t.exits.map(e => {
    if (e === 'L') return 'R' as ExitDir;
    if (e === 'R') return 'L' as ExitDir;
    return e;
  });
  return {
    name: t.name + '_mir',
    exits: mirroredExits,
    type: t.type,
    grid: mirroredGrid,
  };
}

// ─── Template query helpers ───────────────────────────────────────────────────

/**
 * Return all templates whose exit list contains every direction in `required`.
 * A template with exits ['L','R','U','D'] matches required=['L','R'] because
 * it has at least those exits (superset match).
 */
export function getMatchingTemplates(required: ExitDir[]): RoomTemplate[] {
  return ALL_TEMPLATES.filter(t =>
    required.every(d => t.exits.includes(d)),
  );
}

/**
 * Pick a random template that contains all required exits.
 * 50% chance to mirror the result (Spelunky-style variation doubling).
 * Falls back to combat_LRUD if no exact match is found.
 */
export function pickTemplate(required: ExitDir[], rng: PRNG): RoomTemplate {
  const matches = getMatchingTemplates(required);
  let template: RoomTemplate;
  if (matches.length === 0) {
    template = ALL_TEMPLATES.find(t => t.name === 'combat_LRUD')!;
  } else {
    template = matches[rng.nextInt(0, matches.length - 1)];
  }

  // 50% mirror — only if the mirrored exits still satisfy requirements
  if (rng.next() < 0.5) {
    const mirrored = mirrorTemplate(template);
    if (required.every(d => mirrored.exits.includes(d))) {
      return mirrored;
    }
  }

  return template;
}
