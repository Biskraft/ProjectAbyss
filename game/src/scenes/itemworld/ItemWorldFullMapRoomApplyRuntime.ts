import type { UnifiedGridData } from '@level/RoomGrid';
import type { LdtkLevel } from '@level/LdtkLoader';
import type { PopulatedItemWorldFullMapRoom } from './ItemWorldFullMapPopulationHelpers';
import type { ItemWorldCellVisualRecord } from './ItemWorldCellVisualRuntime';

export interface ItemWorldFullMapRoomApplyRuntimeDeps {
  getUnifiedGrid: () => UnifiedGridData;
  getFullGrid: () => number[][];
  getCurrentCell: () => { col: number; absRow: number };
  assignRoomType: (room: PopulatedItemWorldFullMapRoom) => void;
  applyRoomCollision: (room: PopulatedItemWorldFullMapRoom, fullGrid: number[][]) => void;
  captureRewardSpawners: (room: PopulatedItemWorldFullMapRoom) => void;
  setCellVisualRecord: (record: ItemWorldCellVisualRecord) => void;
  capturePlayerSpawn: (
    unifiedGrid: UnifiedGridData,
    ldtkLevel: LdtkLevel,
    col: number,
    absRow: number,
    roomX: number,
    roomY: number,
  ) => void;
}

export class ItemWorldFullMapRoomApplyRuntime {
  constructor(private readonly deps: ItemWorldFullMapRoomApplyRuntimeDeps) {}

  apply(room: PopulatedItemWorldFullMapRoom): void {
    const { cell, ldtkLevel, col, absRow, roomTileX, roomTileY, roomX, roomY, roomW, roomH } = room;
    this.deps.assignRoomType(room);
    this.deps.applyRoomCollision(room, this.deps.getFullGrid());
    if (!cell.isFiller) {
      this.deps.captureRewardSpawners(room);
    }
    this.deps.setCellVisualRecord({
      col,
      row: absRow,
      ldtkLevel,
      roomX,
      roomY,
      roomW,
      roomH,
      tileX: roomTileX,
      tileY: roomTileY,
    });

    if (!cell.isFiller) {
      this.deps.capturePlayerSpawn(this.deps.getUnifiedGrid(), ldtkLevel, col, absRow, roomX, roomY);
    }

    const current = this.deps.getCurrentCell();
    if (col === current.col && absRow === current.absRow) {
      cell.visited = true;
    }
  }
}
