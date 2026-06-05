import { Graphics } from 'pixi.js';
import type { LdtkLevel } from '@level/LdtkLoader';
import type { UnifiedGridData } from '@level/RoomGrid';
import { getItemWorldTemplatesIfReady } from '@level/ItemWorldTemplatePool';
import { pickTemplate, type ExitDir } from '@level/ItemWorldTemplates';
import { PRNG } from '@utils/PRNG';
import { findInventoryLdtkTemplate } from './InventoryLdtkTemplatePicker';

export interface InventoryStratumRoomCell {
  col: number;
  absoluteRow: number;
  exits: {
    left?: boolean;
    right?: boolean;
    up?: boolean;
    down?: boolean;
  };
  role?: string;
  kind?: string;
}

export interface InventoryStratumRoomViewport {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface InventoryStratumRoomPlacement {
  roomOffX: number;
  roomOffY: number;
}

export function inventoryStratumViewport(cardY: number, cardW: number, cardH: number): InventoryStratumRoomViewport {
  return {
    x0: 0,
    y0: cardY,
    x1: cardW,
    y1: cardY + cardH,
  };
}

export function inventoryStratumHubScreenPosition(
  viewport: InventoryStratumRoomViewport,
  roomMiniW: number,
): { x: number; y: number } {
  return {
    x: viewport.x0 + roomMiniW,
    y: viewport.y0,
  };
}

export function inventoryStratumRoomPlacement(
  cell: InventoryStratumRoomCell,
  hubCol: number,
  hubAbsRow: number,
  hubScreenX: number,
  hubScreenY: number,
  roomMiniW: number,
  roomMiniH: number,
): InventoryStratumRoomPlacement {
  return {
    roomOffX: hubScreenX + (cell.col - hubCol) * roomMiniW,
    roomOffY: hubScreenY + (cell.absoluteRow - hubAbsRow) * roomMiniH,
  };
}

export function isInventoryStratumRoomInViewport(
  placement: InventoryStratumRoomPlacement,
  roomMiniW: number,
  roomMiniH: number,
  viewport: InventoryStratumRoomViewport,
): boolean {
  if (placement.roomOffX + roomMiniW < viewport.x0 || placement.roomOffX > viewport.x1) return false;
  if (placement.roomOffY + roomMiniH < viewport.y0 || placement.roomOffY > viewport.y1) return false;
  return true;
}

export function createInventoryStratumRoomRng(
  itemUid: number,
  stratumIndex: number,
  cell: InventoryStratumRoomCell,
): PRNG {
  return new PRNG(itemUid * 1000 + stratumIndex * 7919 + cell.col * 31 + cell.absoluteRow * 17);
}

export function inventoryCellExits(cell: InventoryStratumRoomCell): ExitDir[] {
  const exits: ExitDir[] = [];
  if (cell.exits.left) exits.push('L');
  if (cell.exits.right) exits.push('R');
  if (cell.exits.up) exits.push('U');
  if (cell.exits.down) exits.push('D');
  if (exits.length === 0) exits.push('D');
  return exits;
}

export function pickInventoryStratumRoomGrid(
  cell: InventoryStratumRoomCell,
  exits: ExitDir[],
  rng: PRNG,
  ldtkPool: LdtkLevel[] | null | undefined,
  hubCol: number,
  hubAbsRow: number,
): number[][] | null {
  if (ldtkPool && ldtkPool.length > 0) {
    const isStartCell = cell.col === hubCol && cell.absoluteRow === hubAbsRow;
    const desiredType = cell.role === 'boss' ? 'Boss'
      : (cell.role === 'hub' || isStartCell) ? 'Start'
      : cell.role === 'shrine' ? 'Rest'
      : cell.kind === 'corridor' ? 'Corridor'
      : 'Combat';
    const ldtkMatch = findInventoryLdtkTemplate(ldtkPool, exits, desiredType, rng);
    if (ldtkMatch) return ldtkMatch.collisionGrid;
  }

  try {
    return pickTemplate(exits, rng, false).grid;
  } catch {
    return null;
  }
}

export function drawInventoryStratumRoomPixels(
  card: Graphics,
  grid: number[][],
  roomOffX: number,
  roomOffY: number,
  roomMiniW: number,
  roomMiniH: number,
  viewport: InventoryStratumRoomViewport,
  airColor: number,
  wallColor: number,
  alpha: number,
): void {
  const gridH = grid.length;
  const gridW = grid[0]?.length ?? 0;
  if (gridW <= 0 || gridH <= 0) return;

  const bgX = Math.max(roomOffX, viewport.x0);
  const bgY = Math.max(roomOffY, viewport.y0);
  const bgW = Math.min(roomOffX + roomMiniW, viewport.x1 + 1) - bgX;
  const bgH = Math.min(roomOffY + roomMiniH, viewport.y1 + 1) - bgY;
  if (bgW > 0 && bgH > 0) {
    card.rect(bgX, bgY, bgW, bgH).fill({ color: airColor, alpha });
  }

  const srcTilesPerPxX = gridW / roomMiniW;
  const srcTilesPerPxY = gridH / roomMiniH;
  for (let r = 0; r < roomMiniH; r++) {
    const py = roomOffY + r;
    if (py < viewport.y0 || py > viewport.y1) continue;
    for (let c = 0; c < roomMiniW; c++) {
      const px = roomOffX + c;
      if (px < viewport.x0 || px > viewport.x1) continue;
      const r0 = Math.floor(r * srcTilesPerPxY);
      const r1 = Math.min(gridH, Math.floor((r + 1) * srcTilesPerPxY));
      const c0 = Math.floor(c * srcTilesPerPxX);
      const c1 = Math.min(gridW, Math.floor((c + 1) * srcTilesPerPxX));
      let hasWall = false;
      outer: for (let sr = r0; sr < r1; sr++) {
        for (let sc = c0; sc < c1; sc++) {
          if (grid[sr][sc] === 1) { hasWall = true; break outer; }
        }
      }
      if (hasWall) {
        card.rect(px, py, 1, 1).fill({ color: wallColor, alpha });
      }
    }
  }
}

export function drawInventoryStratumPixelMap(
  card: Graphics,
  unified: UnifiedGridData,
  itemUid: number,
  stratumIndex: number,
  cardY: number,
  cardH: number,
  cardW: number,
): void {
  const roomMiniW = 36;
  const roomMiniH = 24;

  const startRoom = unified.stratumStartRooms[stratumIndex] ?? unified.stratumStartRooms[0];
  if (!startRoom) return;
  const hubCol = startRoom.col;
  const hubAbsRow = startRoom.absoluteRow;

  const stratumBound = unified.strataOffsets[stratumIndex];
  const stratumRowMin = stratumBound?.rowOffset ?? 0;
  const stratumRowMax = stratumBound ? stratumBound.rowOffset + stratumBound.height : unified.totalHeight;
  const viewport = inventoryStratumViewport(cardY, cardW, cardH);
  const hubScreen = inventoryStratumHubScreenPosition(viewport, roomMiniW);

  const baseAlpha = 1;
  const wallColor = 0x161515;
  const airColor = 0x595959;
  const ldtkPool = getItemWorldTemplatesIfReady();

  for (let rowIndex = stratumRowMin; rowIndex < stratumRowMax && rowIndex < unified.cells.length; rowIndex++) {
    const row = unified.cells[rowIndex];
    for (let colIndex = 0; colIndex < row.length; colIndex++) {
      const cell = row[colIndex];
      if (!cell) continue;

      const placement = inventoryStratumRoomPlacement(cell, hubCol, hubAbsRow, hubScreen.x, hubScreen.y, roomMiniW, roomMiniH);
      if (!isInventoryStratumRoomInViewport(placement, roomMiniW, roomMiniH, viewport)) continue;

      const exits = inventoryCellExits(cell);
      const rng = createInventoryStratumRoomRng(itemUid, stratumIndex, cell);
      const grid = pickInventoryStratumRoomGrid(cell, exits, rng, ldtkPool, hubCol, hubAbsRow);
      if (!grid) continue;
      drawInventoryStratumRoomPixels(
        card,
        grid,
        placement.roomOffX,
        placement.roomOffY,
        roomMiniW,
        roomMiniH,
        viewport,
        airColor,
        wallColor,
        baseAlpha,
      );
    }
  }
}
