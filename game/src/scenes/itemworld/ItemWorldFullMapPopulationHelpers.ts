import type { UnifiedGridData, UnifiedRoomCell } from '@level/RoomGrid';
import type { LdtkLevel } from '@level/LdtkLoader';
import { PRNG } from '@utils/PRNG';
import { IW_ROOM_H_TILES, IW_ROOM_W_TILES, TILE_SIZE } from './ItemWorldMapController';

export interface PopulatedItemWorldFullMapRoom {
  cell: UnifiedRoomCell;
  ldtkLevel: LdtkLevel;
  col: number;
  absRow: number;
  roomTileX: number;
  roomTileY: number;
  roomX: number;
  roomY: number;
  roomW: number;
  roomH: number;
}

interface PopulateFullMapRoomsOptions {
  unifiedGrid: UnifiedGridData;
  itemUid: number;
  pickTemplate: (cell: UnifiedRoomCell, rng: PRNG) => LdtkLevel | null;
  shouldSkipTemplate: (ldtkLevel: LdtkLevel) => boolean;
  onRoom: (options: PopulatedItemWorldFullMapRoom) => void;
}

export function populateItemWorldFullMapRooms(options: PopulateFullMapRoomsOptions): number {
  const { unifiedGrid, itemUid, pickTemplate, shouldSkipTemplate, onRoom } = options;
  let roomCount = 0;

  for (let absRow = 0; absRow < unifiedGrid.totalHeight; absRow++) {
    for (let col = 0; col < unifiedGrid.totalWidth; col++) {
      const cell = unifiedGrid.cells[absRow]?.[col];
      if (!cell) continue;

      const rng = new PRNG(itemUid * 10000 + col * 100 + absRow);
      const ldtkLevel = pickTemplate(cell, rng);
      if (!ldtkLevel || shouldSkipTemplate(ldtkLevel)) continue;

      const roomTileX = cell.tileRect?.x ?? col * IW_ROOM_W_TILES;
      const roomTileY = cell.tileRect?.y ?? absRow * IW_ROOM_H_TILES;
      const roomW = ldtkLevel.pxWid;
      const roomH = ldtkLevel.pxHei;
      const roomX = roomTileX * TILE_SIZE;
      const roomY = roomTileY * TILE_SIZE;
      onRoom({ cell, ldtkLevel, col, absRow, roomTileX, roomTileY, roomX, roomY, roomW, roomH });
      roomCount++;
    }
  }

  return roomCount;
}
