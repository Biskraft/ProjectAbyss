import { PRNG } from '@utils/PRNG';
import { WorldGridConst } from '@data/constData';

/** Room types: 0=dead-end, 1=LR, 2=LRD(down hole), 3=LRU(up ladder), 4=LRUD(all-door arena, e.g. boss room or up+down passage) */
export type RoomType = 0 | 1 | 2 | 3 | 4;

export interface RoomCell {
  col: number;
  row: number;
  type: RoomType;
  onCriticalPath: boolean;
  exits: { left: boolean; right: boolean; up: boolean; down: boolean };
  visited: boolean;   // for runtime tracking
  cleared: boolean;   // all enemies defeated
  /** Chain-length variable pattern hint (DEC-037): 'corridor' = 통로형 LDtk,
   *  'room' = 전투/보물형 LDtk. RoomGraphAdapter 가 노드 태그에서 채운다.
   *  hub/boss/shrine 등 spoke 가 아닌 셀은 undefined. */
  kind?: 'corridor' | 'room';
  /** Graph node role (DEC-038): hub/spoke/boss/shrine. RoomGraphAdapter 가 전파.
   *  ItemWorldScene 의 LDtk 룸 타입 매핑과 적 스폰 차단에 사용. */
  role?: 'hub' | 'spoke' | 'boss' | 'shrine';
  /** Boss death pixel position — recorded when a boss dies in this cell so
   *  the exit portal re-appears at the same spot on re-entry. */
  bossPortalX?: number;
  bossPortalY?: number;
}

export interface RoomGridData {
  width: number;
  height: number;
  cells: RoomCell[][];
  criticalPath: { col: number; row: number }[];
  startRoom: { col: number; row: number };
  endRoom: { col: number; row: number };
}

/* ── Unified Grid types: all strata stitched vertically ──
 * 생성은 RoomGraphAdapter.generateUnifiedGridFromGraph 가 담당 (DEC-037).
 * 타입만 여기 정의 — 어댑터/씬/컨트롤러가 공유.
 */

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

// Critical Path direction weights
const WEIGHT_LEFT = WorldGridConst.WeightLeft;
const WEIGHT_RIGHT = WorldGridConst.WeightRight;
// DOWN = 1 - LEFT - RIGHT
const MIN_PATH_RATIO = WorldGridConst.MinPathRatio;

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

  for (let attempt = 0; attempt < WorldGridConst.PathfindingAttempts; attempt++) {
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
  if (cell.exits.up && cell.exits.down) return 4; // LRUD (both vertical exits)
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
