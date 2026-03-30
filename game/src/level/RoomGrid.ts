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

    stratumEndRooms.push({
      col: grid.endRoom.col,
      absoluteRow: offset.rowOffset + grid.endRoom.row,
      stratumIndex: si,
    });
  }

  // Connect strata: endRoom of N → startRoom of N+1
  for (let si = 0; si < perStratum.length - 1; si++) {
    const endGrid = perStratum[si];
    const startGrid = perStratum[si + 1];
    const endOffset = strataOffsets[si];
    const startOffset = strataOffsets[si + 1];

    const endAbsRow = endOffset.rowOffset + endGrid.endRoom.row;
    const startAbsRow = startOffset.rowOffset + startGrid.startRoom.row;

    const endCell = cells[endAbsRow][endGrid.endRoom.col]!;
    const startCell = cells[startAbsRow][startGrid.startRoom.col]!;

    // Open down exit on end room, up exit on start room
    endCell.exits.down = true;
    endCell.type = determineRoomType(endCell);

    startCell.exits.up = true;
    startCell.type = determineRoomType(startCell);
  }

  const firstGrid = perStratum[0];
  const lastGrid = perStratum[perStratum.length - 1];
  const lastOffset = strataOffsets[strataOffsets.length - 1];

  return {
    totalWidth,
    totalHeight,
    cells,
    strataOffsets,
    stratumEndRooms,
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

  // Assign room types based on exits
  for (let row = 0; row < gridH; row++) {
    for (let col = 0; col < gridW; col++) {
      const cell = cells[row][col];
      if (cell.onCriticalPath) {
        cell.type = determineRoomType(cell);
      } else {
        // Non-path: ALL become branch rooms (Spelunky-style full grid fill)
        cell.type = 1;
        connectBranchRoom(cells, col, row, gridW, gridH);
      }
    }
  }

  const startRoom = path[0];
  const endRoom = path[path.length - 1];

  return { width: gridW, height: gridH, cells, criticalPath: path, startRoom, endRoom };
}

function generateCriticalPath(
  gridW: number,
  gridH: number,
  rng: PRNG,
): { col: number; row: number }[] {
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
): void {
  // Try connecting to adjacent path room
  const dirs = [
    { dc: -1, dr: 0 },
    { dc: 1, dr: 0 },
    { dc: 0, dr: -1 },
    { dc: 0, dr: 1 },
  ];
  for (const { dc, dr } of dirs) {
    const nc = col + dc;
    const nr = row + dr;
    if (nc >= 0 && nc < gridW && nr >= 0 && nr < gridH) {
      if (cells[nr][nc].onCriticalPath) {
        connectCells(cells, col, row, nc, nr);
        return;
      }
    }
  }
}

function determineRoomType(cell: RoomCell): RoomType {
  if (cell.exits.down) return 2;  // LRD
  if (cell.exits.up && !cell.exits.down) return 3; // LRU
  if (cell.exits.left || cell.exits.right) return 1; // LR
  return 0;
}
