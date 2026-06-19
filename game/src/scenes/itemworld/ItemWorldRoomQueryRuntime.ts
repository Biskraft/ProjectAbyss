import { isSolid, TILE_WALL } from '@core/Physics';
import { isBossEnemy } from '@entities/EnemyMetadata';
import type { UnifiedGridData } from '@level/RoomGrid';
import type { ItemWorldEnemyRegistry } from './ItemWorldEnemyRegistry';
import { TILE_SIZE } from './ItemWorldMapController';

interface ItemWorldRoomQueryRuntimeDeps {
  getUnifiedGrid: () => UnifiedGridData;
  getCurrentRoom: () => { col: number; row: number };
  getEnemyRegistry: () => ItemWorldEnemyRegistry;
}

export class ItemWorldRoomQueryRuntime {
  constructor(private readonly deps: ItemWorldRoomQueryRuntimeDeps) {}

  isAabbClearInGrid(grid: number[][], x: number, y: number, w: number, h: number): boolean {
    const left = Math.floor(x / TILE_SIZE);
    const right = Math.floor((x + w - 1) / TILE_SIZE);
    const top = Math.floor(y / TILE_SIZE);
    const bottom = Math.floor((y + h - 1) / TILE_SIZE);
    for (let row = top; row <= bottom; row++) {
      for (let col = left; col <= right; col++) {
        if (isSolid(grid[row]?.[col] ?? TILE_WALL)) return false;
      }
    }
    return true;
  }

  isStratumEndRoom(col: number, row: number): boolean {
    return this.deps.getUnifiedGrid().stratumEndRooms.some(
      e => e.col === col && e.absoluteRow === row,
    );
  }

  isCurrentRoomBossRoom(): boolean {
    const current = this.deps.getCurrentRoom();
    return this.isStratumEndRoom(current.col, current.row);
  }

  hasAliveBossEnemy(): boolean {
    return this.deps.getEnemyRegistry().enemies.some((enemy) => isBossEnemy(enemy) && enemy.alive);
  }

  isFinalEndRoom(col: number, row: number): boolean {
    const endRoom = this.deps.getUnifiedGrid().endRoom;
    return col === endRoom.col && row === endRoom.absoluteRow;
  }
}
