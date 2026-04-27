import { PRNG } from '@utils/PRNG';

/** Room types: 0=dead-end, 1=LR(left-right), 2=LRD(left-right-down), 3=LRU(left-right-up) */
export type RoomType = 0 | 1 | 2 | 3;

export interface RoomCell {
  col: number;
  row: number;
  type: RoomType;
  onCriticalPath: boolean;
  exits: { left: boolean; right: boolean; up: boolean; down: boolean };
  visited: boolean;   // for runtime tracking
  cleared: boolean;   // all enemies defeated
}

export interface RoomGridData {
  width: number;
  height: number;
  cells: RoomCell[][];
  criticalPath: { col: number; row: number }[];
  startRoom: { col: number; row: number };
  endRoom: { col: number; row: number };
}

/* ── Unified Grid: all strata stitched vertically ── */

export interface UnifiedRoomCell extends RoomCell {
  stratumIndex: number;
  absoluteRow: number;
}

export interface StratumBound {
  rowOffset: number;
  width: number;
  height: number;
}

export interface UnifiedGridData {
  totalWidth: number;
  totalHeight: number;
  cells: (UnifiedRoomCell | null)[][];
  strataOffsets: StratumBound[];
  stratumEndRooms: { col: number; absoluteRow: number; stratumIndex: number }[];
  /** Per-stratum start cells, indexed by stratum. Matches each stratum's
   *  critical path origin (path[0]), NOT just the leftmost row-0 critical cell. */
  stratumStartRooms: { col: number; absoluteRow: number; stratumIndex: number }[];
  startRoom: { col: number; absoluteRow: number };
  endRoom: { col: number; absoluteRow: number };
}

export function generateUnifiedGrid(
  strataDefs: { gridWidth: number; gridHeight: number }[],
  itemUid: number,
): UnifiedGridData {
  const totalWidth = Math.max(...strataDefs.map(d => d.gridWidth));

  // Generate each stratum grid independently
  const perStratum: RoomGridData[] = [];
  for (let si = 0; si < strataDefs.length; si++) {
    const def = strataDefs[si];
    const stratumRng = new PRNG(itemUid * 1000 + si * 7919);
    perStratum.push(generateRoomGrid(def.gridWidth, def.gridHeight, stratumRng));
  }

  // Calculate row offsets
  const strataOffsets: StratumBound[] = [];
  let rowOffset = 0;
  for (let si = 0; si < strataDefs.length; si++) {
    strataOffsets.push({ rowOffset, width: strataDefs[si].gridWidth, height: strataDefs[si].gridHeight });
    rowOffset += strataDefs[si].gridHeight;
  }
  const totalHeight = rowOffset;

  // Build unified cells array
  const cells: (UnifiedRoomCell | null)[][] = [];
  for (let absRow = 0; absRow < totalHeight; absRow++) {
    const row: (UnifiedRoomCell | null)[] = [];
    for (let col = 0; col < totalWidth; col++) {
      row.push(null);
    }
    cells.push(row);
  }

  const stratumEndRooms: UnifiedGridData['stratumEndRooms'] = [];
  const stratumStartRooms: UnifiedGridData['stratumStartRooms'] = [];

  for (let si = 0; si < perStratum.length; si++) {
    const grid = perStratum[si];
    const offset = strataOffsets[si];

    for (let localRow = 0; localRow < grid.height; localRow++) {
      for (let col = 0; col < grid.width; col++) {
        const src = grid.cells[localRow][col];
        const absRow = offset.rowOffset + localRow;
        cells[absRow][col] = {
          ...src,
          row: absRow,
          absoluteRow: absRow,
          stratumIndex: si,
        };
      }
    }

    stratumStartRooms.push({
      col: grid.startRoom.col,
      absoluteRow: offset.rowOffset + grid.startRoom.row,
      stratumIndex: si,
    });
    stratumEndRooms.push({
      col: grid.endRoom.col,
      absoluteRow: offset.rowOffset + grid.endRoom.row,
      stratumIndex: si,
    });
  }

  // Stratum boundaries are NOT connected via physical tile holes.
  // The stratum N → N+1 descent is handled by the boss-death portal flow
  // (spawnBossPortal / restorePortalIfStratumCleared). Setting exits.down
  // on the boss cell here would cause the door mask to carve a floor hole,
  // letting players bypass the boss entirely. Keep boss/start rooms sealed.

  const firstGrid = perStratum[0];
  const lastGrid = perStratum[perStratum.length - 1];
  const lastOffset = strataOffsets[strataOffsets.length - 1];

  return {
    totalWidth,
    totalHeight,
    cells,
    strataOffsets,
    stratumEndRooms,
    stratumStartRooms,
    startRoom: {
      col: firstGrid.startRoom.col,
      absoluteRow: firstGrid.startRoom.row, // offset 0
    },
    endRoom: {
      col: lastGrid.endRoom.col,
      absoluteRow: lastOffset.rowOffset + lastGrid.endRoom.row,
    },
  };
}

// Critical Path direction weights
const WEIGHT_LEFT = 0.3;
const WEIGHT_RIGHT = 0.3;
// DOWN = 1 - LEFT - RIGHT = 0.4
const MIN_PATH_RATIO = 0.4;

export function generateRoomGrid(
  gridW: number,
  gridH: number,
  rng: PRNG,
): RoomGridData {
  // Initialize empty grid
  const cells: RoomCell[][] = [];
  for (let row = 0; row < gridH; row++) {
    const r: RoomCell[] = [];
    for (let col = 0; col < gridW; col++) {
      r.push({
        col, row,
        type: 0,
        onCriticalPath: false,
        exits: { left: false, right: false, up: false, down: false },
        visited: false,
        cleared: false,
      });
    }
    cells.push(r);
  }

  // Generate Critical Path (top → bottom)
  const path = generateCriticalPath(gridW, gridH, rng);

  // Mark path cells and assign exits
  for (let i = 0; i < path.length; i++) {
    const { col, row } = path[i];
    const cell = cells[row][col];
    cell.onCriticalPath = true;

    if (i > 0) {
      const prev = path[i - 1];
      connectCells(cells, prev.col, prev.row, col, row);
    }
  }

  const startRoom = path[0];
  const endRoom = path[path.length - 1];

  // Assign room types based on exits. Skip start/end when connecting branches
  // so those terminal cells never receive a side/bottom exit from a branch.
  for (let row = 0; row < gridH; row++) {
    for (let col = 0; col < gridW; col++) {
      const cell = cells[row][col];
      if (cell.onCriticalPath) {
        cell.type = determineRoomType(cell);
      } else {
        // Non-path: ALL become branch rooms (Spelunky-style full grid fill)
        cell.type = 1;
        connectBranchRoom(cells, col, row, gridW, gridH, startRoom, endRoom);
      }
    }
  }

  ensureNoDeadEndRooms(cells, gridW, gridH, startRoom, endRoom);

  for (let row = 0; row < gridH; row++) {
    for (let col = 0; col < gridW; col++) {
      cells[row][col].type = determineRoomType(cells[row][col]);
    }
  }

  return { width: gridW, height: gridH, cells, criticalPath: path, startRoom, endRoom };
}

function generateCriticalPath(
  gridW: number,
  gridH: number,
  rng: PRNG,
): { col: number; row: number }[] {
  if (gridW === 2 && gridH === 2) {
    const reverse = rng.next() < 0.5;
    return reverse
      ? [
          { col: 1, row: 0 },
          { col: 0, row: 0 },
          { col: 0, row: 1 },
          { col: 1, row: 1 },
        ]
      : [
          { col: 0, row: 0 },
          { col: 1, row: 0 },
          { col: 1, row: 1 },
          { col: 0, row: 1 },
        ];
  }

  const minLength = Math.ceil(gridW * gridH * MIN_PATH_RATIO);

  for (let attempt = 0; attempt < 10; attempt++) {
    const path: { col: number; row: number }[] = [];
    const visited = new Set<string>();

    let col = rng.nextInt(0, gridW - 1);
    let row = 0;
    path.push({ col, row });
    visited.add(`${col},${row}`);

    while (row < gridH - 1) {
      const roll = rng.next();
      let nextCol = col;
      let nextRow = row;

      if (roll < WEIGHT_LEFT) {
        nextCol = col - 1;
      } else if (roll < WEIGHT_LEFT + WEIGHT_RIGHT) {
        nextCol = col + 1;
      } else {
        nextRow = row + 1;
      }

      // Boundary check: force down if hitting wall
      if (nextCol < 0 || nextCol >= gridW) {
        nextRow = row + 1;
        nextCol = col;
      }

      // Skip if already visited horizontally (prevent loops)
      const key = `${nextCol},${nextRow}`;
      if (visited.has(key)) {
        // Force down
        nextRow = row + 1;
        nextCol = col;
      }

      col = nextCol;
      row = nextRow;
      path.push({ col, row });
      visited.add(`${col},${row}`);
    }

    if (path.length >= minLength) {
      return path;
    }
  }

  // Fallback: simple zigzag
  const path: { col: number; row: number }[] = [];
  let col = 0;
  for (let row = 0; row < gridH; row++) {
    path.push({ col, row });
    if (row < gridH - 1) {
      const target = row % 2 === 0 ? gridW - 1 : 0;
      const dir = target > col ? 1 : -1;
      while (col !== target) {
        col += dir;
        path.push({ col, row });
      }
    }
  }
  return path;
}

function connectCells(
  cells: RoomCell[][],
  c1: number, r1: number,
  c2: number, r2: number,
): void {
  if (c2 > c1) {
    cells[r1][c1].exits.right = true;
    cells[r2][c2].exits.left = true;
  } else if (c2 < c1) {
    cells[r1][c1].exits.left = true;
    cells[r2][c2].exits.right = true;
  }
  if (r2 > r1) {
    cells[r1][c1].exits.down = true;
    cells[r2][c2].exits.up = true;
  } else if (r2 < r1) {
    cells[r1][c1].exits.up = true;
    cells[r2][c2].exits.down = true;
  }
}

function connectBranchRoom(
  cells: RoomCell[][],
  col: number, row: number,
  gridW: number, gridH: number,
  startRoom: { col: number; row: number },
  endRoom: { col: number; row: number },
): void {
  // Try connecting to adjacent path room, but never to start or end cells —
  // those terminals must only keep their path-derived exits (start: down,
  // end/boss: up). Side exits on terminals break critical path integrity.
  const dirs = [
    { dc: -1, dr: 0 },
    { dc: 1, dr: 0 },
    { dc: 0, dr: -1 },
    { dc: 0, dr: 1 },
  ];
  for (const { dc, dr } of dirs) {
    const nc = col + dc;
    const nr = row + dr;
    if (nc < 0 || nc >= gridW || nr < 0 || nr >= gridH) continue;
    if (!cells[nr][nc].onCriticalPath) continue;
    // Skip start and end cells — they are terminal and must stay sealed on
    // all edges except the one that the walker naturally created.
    if (nc === startRoom.col && nr === startRoom.row) continue;
    if (nc === endRoom.col && nr === endRoom.row) continue;
    connectCells(cells, col, row, nc, nr);
    return;
  }
}

function determineRoomType(cell: RoomCell): RoomType {
  if (cell.exits.down) return 2;  // LRD
  if (cell.exits.up && !cell.exits.down) return 3; // LRU
  if (cell.exits.left || cell.exits.right) return 1; // LR
  return 0;
}

function ensureNoDeadEndRooms(
  cells: RoomCell[][],
  gridW: number,
  gridH: number,
  startRoom: { col: number; row: number },
  endRoom: { col: number; row: number },
): void {
  for (let pass = 0; pass < 2; pass++) {
    for (let row = 0; row < gridH; row++) {
      for (let col = 0; col < gridW; col++) {
        if (col === startRoom.col && row === startRoom.row) continue;
        if (col === endRoom.col && row === endRoom.row) continue;

        const cell = cells[row][col];
        while (countExits(cell) < 2) {
          const target = pickBestDeadEndRepairTarget(cells, col, row, gridW, gridH, startRoom, endRoom);
          if (!target) break;
          connectCells(cells, col, row, target.col, target.row);
        }
      }
    }
  }
}

function pickBestDeadEndRepairTarget(
  cells: RoomCell[][],
  col: number,
  row: number,
  gridW: number,
  gridH: number,
  startRoom: { col: number; row: number },
  endRoom: { col: number; row: number },
): { col: number; row: number } | null {
  const dirs = [
    { dc: -1, dr: 0 },
    { dc: 1, dr: 0 },
    { dc: 0, dr: -1 },
    { dc: 0, dr: 1 },
  ];
  const candidates: Array<{ col: number; row: number; score: number }> = [];
  const cell = cells[row][col];
  for (const { dc, dr } of dirs) {
    const nc = col + dc;
    const nr = row + dr;
    if (nc < 0 || nc >= gridW || nr < 0 || nr >= gridH) continue;
    if (hasExitTo(cell, dc, dr)) continue;

    const neighbor = cells[nr][nc];
    const neighborIsTerminal =
      (nc === startRoom.col && nr === startRoom.row) ||
      (nc === endRoom.col && nr === endRoom.row);
    const score = (neighborIsTerminal ? -20 : 0)
      + (neighbor.onCriticalPath ? 4 : 0)
      - countExits(neighbor);
    candidates.push({ col: nc, row: nr, score });
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0] ?? null;
}

function countExits(cell: RoomCell): number {
  return Number(cell.exits.left)
    + Number(cell.exits.right)
    + Number(cell.exits.up)
    + Number(cell.exits.down);
}

function hasExitTo(cell: RoomCell, dc: number, dr: number): boolean {
  if (dc < 0) return cell.exits.left;
  if (dc > 0) return cell.exits.right;
  if (dr < 0) return cell.exits.up;
  if (dr > 0) return cell.exits.down;
  return false;
}
