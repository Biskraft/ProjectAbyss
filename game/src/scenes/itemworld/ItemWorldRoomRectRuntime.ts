import type { UnifiedGridData } from '@level/RoomGrid';
import type { ItemWorldCellVisualRecord } from './ItemWorldCellVisualRuntime';

export interface ItemWorldRoomRectTiles {
  tileX: number;
  tileY: number;
  tileW: number;
  tileH: number;
}

export interface ItemWorldRoomRectRuntimeDeps {
  getUnifiedGrid: () => UnifiedGridData;
  getCellVisualRecord: (key: string) => ItemWorldCellVisualRecord | undefined;
}

export interface ItemWorldRoomRectRuntimeOptions {
  tileSize: number;
  fallbackRoomWidthTiles: number;
  fallbackRoomHeightTiles: number;
  fallbackRoomWidthPx: number;
  fallbackRoomHeightPx: number;
}

export class ItemWorldRoomRectRuntime {
  constructor(
    private readonly deps: ItemWorldRoomRectRuntimeDeps,
    private readonly options: ItemWorldRoomRectRuntimeOptions,
  ) {}

  getRoomRectTiles(col: number, absRow: number): ItemWorldRoomRectTiles {
    const record = this.deps.getCellVisualRecord(`${col}:${absRow}`);
    if (record) {
      return {
        tileX: record.tileX,
        tileY: record.tileY,
        tileW: Math.max(1, Math.floor(record.roomW / this.options.tileSize)),
        tileH: Math.max(1, Math.floor(record.roomH / this.options.tileSize)),
      };
    }

    const cell = this.deps.getUnifiedGrid().cells[absRow]?.[col];
    if (cell?.tileRect) {
      return {
        tileX: cell.tileRect.x,
        tileY: cell.tileRect.y,
        tileW: cell.tileRect.w,
        tileH: cell.tileRect.h,
      };
    }

    return {
      tileX: col * this.options.fallbackRoomWidthTiles,
      tileY: absRow * this.options.fallbackRoomHeightTiles,
      tileW: this.options.fallbackRoomWidthTiles,
      tileH: this.options.fallbackRoomHeightTiles,
    };
  }

  findRoomAtPixel(x: number, y: number): { col: number; absRow: number } {
    const tileX = Math.floor(x / this.options.tileSize);
    const tileY = Math.floor(y / this.options.tileSize);
    const unifiedGrid = this.deps.getUnifiedGrid();

    for (let absRow = 0; absRow < unifiedGrid.totalHeight; absRow++) {
      for (let col = 0; col < unifiedGrid.totalWidth; col++) {
        const cell = unifiedGrid.cells[absRow]?.[col];
        if (!cell) continue;
        const rect = cell.tileRect ?? {
          x: col * this.options.fallbackRoomWidthTiles,
          y: absRow * this.options.fallbackRoomHeightTiles,
          w: this.options.fallbackRoomWidthTiles,
          h: this.options.fallbackRoomHeightTiles,
        };
        if (
          tileX >= rect.x &&
          tileX < rect.x + rect.w &&
          tileY >= rect.y &&
          tileY < rect.y + rect.h
        ) {
          return { col, absRow };
        }
      }
    }

    return {
      col: Math.max(0, Math.min(unifiedGrid.totalWidth - 1, Math.floor(x / this.options.fallbackRoomWidthPx))),
      absRow: Math.max(0, Math.min(unifiedGrid.totalHeight - 1, Math.floor(y / this.options.fallbackRoomHeightPx))),
    };
  }
}
