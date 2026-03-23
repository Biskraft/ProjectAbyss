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
        // Non-path: 20-30% become type 1 (branch rooms)
        if (rng.next() < 0.25) {
          cell.type = 1;
          // Connect to adjacent path room if possible
          connectBranchRoom(cells, col, row, gridW, gridH);
        } else {
          cell.type = 0;
        }
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
