import type { UnifiedGridData, UnifiedRoomCell } from '@level/RoomGrid';
import type { LdtkLevel } from '@level/LdtkLoader';
import { PRNG } from '@utils/PRNG';
import { IW_ROOM_H_PX, IW_ROOM_W_PX } from './ItemWorldMapController';

interface PopulateFullMapRoomsOptions {
  unifiedGrid: UnifiedGridData;
  itemUid: number;
  pickTemplate: (cell: UnifiedRoomCell, rng: PRNG) => LdtkLevel | null;
  shouldSkipTemplate: (ldtkLevel: LdtkLevel) => boolean;
  onRoom: (options: {
    cell: UnifiedRoomCell;
    ldtkLevel: LdtkLevel;
    col: number;
    absRow: number;
    roomX: number;
    roomY: number;
  }) => void;
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

      const roomX = col * IW_ROOM_W_PX;
      const roomY = absRow * IW_ROOM_H_PX;
      onRoom({ cell, ldtkLevel, col, absRow, roomX, roomY });
      roomCount++;
    }
  }

  return roomCount;
}
