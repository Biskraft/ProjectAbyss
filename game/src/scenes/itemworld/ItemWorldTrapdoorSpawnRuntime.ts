import { TILE_SIZE, TILE_WALL } from '@core/Physics';
import {
  IW_ROOM_H_PX,
  IW_ROOM_H_TILES,
  IW_ROOM_W_PX,
} from './ItemWorldMapController';

export interface TrapdoorSpawnSnapshot {
  x: number;
  y: number;
  descentToWorld: boolean;
  bossCellCol: number;
  bossCellRow: number;
}

interface ItemWorldTrapdoorSpawnRuntimeDeps {
  getCollisionGrid: () => number[][];
  hasExistingTrapdoor: () => boolean;
  isFinalEndRoom: (bossCellCol: number, bossCellRow: number) => boolean;
}

interface BossDeathProbe {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class ItemWorldTrapdoorSpawnRuntime {
  constructor(private readonly deps: ItemWorldTrapdoorSpawnRuntimeDeps) {}

  resolveForBossDeath(enemy: BossDeathProbe): TrapdoorSpawnSnapshot | null {
    if (this.deps.hasExistingTrapdoor()) {
      return null;
    }

    const fullGrid = this.deps.getCollisionGrid();
    if (!fullGrid.length) return null;

    const enemyCx = enemy.x + enemy.width / 2;
    const enemyFootY = enemy.y + enemy.height;
    const bossCellCol = Math.max(0, Math.floor(enemyCx / IW_ROOM_W_PX));
    const bossCellRow = Math.max(0, Math.floor(enemyFootY / IW_ROOM_H_PX));

    const cellTopRow = bossCellRow * IW_ROOM_H_TILES;
    const cellBottomRow = cellTopRow + IW_ROOM_H_TILES;
    const probeCol = Math.floor(enemyCx / TILE_SIZE);
    const maxProbeRow = Math.min(cellBottomRow, fullGrid.length);

    let probeRow = Math.max(cellTopRow, Math.floor(enemyFootY / TILE_SIZE));
    let floorTileRow = cellBottomRow - 1;
    while (probeRow < maxProbeRow) {
      if (fullGrid[probeRow]?.[probeCol] === TILE_WALL) {
        floorTileRow = probeRow;
        break;
      }
      probeRow++;
    }

    const cellLeftPx = bossCellCol * IW_ROOM_W_PX;
    const cellRightPx = cellLeftPx + IW_ROOM_W_PX;

    return {
      x: Math.min(cellRightPx - 16, Math.max(cellLeftPx + 16, enemyCx)),
      y: floorTileRow * TILE_SIZE,
      descentToWorld: this.deps.isFinalEndRoom(bossCellCol, bossCellRow),
      bossCellCol,
      bossCellRow,
    };
  }
}
