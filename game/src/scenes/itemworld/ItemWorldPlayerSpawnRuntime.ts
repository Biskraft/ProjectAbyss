import type { LdtkLevel } from '@level/LdtkLoader';
import type { UnifiedGridData } from '@level/RoomGrid';
import {
  IW_ROOM_H_PX,
  IW_ROOM_H_TILES,
  IW_ROOM_W_PX,
  IW_ROOM_W_TILES,
  TILE_SIZE,
} from './ItemWorldMapController';

interface SpawnPoint {
  x: number;
  y: number;
}

interface PlayerSize {
  width: number;
  height: number;
}

interface ItemWorldPlayerSpawnRuntimeDeps {
  getFullGrid: () => number[][];
  getPlayerSize: () => PlayerSize;
  computeSpawnPoints: (grid: number[][], roomLeftTile: number, roomTopTile: number) => SpawnPoint[];
}

export class ItemWorldPlayerSpawnRuntime {
  private readonly ldtkSpawnByStratum = new Map<number, SpawnPoint>();

  constructor(private readonly deps: ItemWorldPlayerSpawnRuntimeDeps) {}

  clear(): void {
    this.ldtkSpawnByStratum.clear();
  }

  captureFromRoom(
    unifiedGrid: UnifiedGridData,
    ldtkLevel: LdtkLevel,
    col: number,
    absRow: number,
    roomX: number,
    roomY: number,
  ): void {
    const stratumStartMatch = unifiedGrid.stratumStartRooms?.find(
      start => start.col === col && start.absoluteRow === absRow,
    );
    if (!stratumStartMatch) return;

    const playerEnt = ldtkLevel.entities.find(entity => entity.type === 'Player');
    if (!playerEnt) return;

    this.ldtkSpawnByStratum.set(stratumStartMatch.stratumIndex, {
      x: playerEnt.px[0] + roomX,
      y: playerEnt.px[1] + roomY,
    });
  }

  resolveForRoom(stratumIndex: number, col: number, absoluteRow: number): SpawnPoint {
    const playerSize = this.deps.getPlayerSize();
    return this.resolveForStratum(
      stratumIndex,
      playerSize.width,
      playerSize.height,
      () => this.resolveFloorSpawn(col, absoluteRow),
    );
  }

  resolveFloorSpawn(col: number, absoluteRow: number): SpawnPoint {
    const fullGrid = this.deps.getFullGrid();
    const playerSize = this.deps.getPlayerSize();
    const roomLeftTile = col * IW_ROOM_W_TILES;
    const roomTopTile = absoluteRow * IW_ROOM_H_TILES;
    const roomLeftPx = col * IW_ROOM_W_PX;
    const roomRightPx = roomLeftPx + IW_ROOM_W_PX;
    const roomTopPx = absoluteRow * IW_ROOM_H_PX;
    const roomBottomPx = roomTopPx + IW_ROOM_H_PX;
    const targetCenterX = roomLeftPx + IW_ROOM_W_PX / 2;

    const floor = this.findFloor(fullGrid, roomLeftTile, roomTopTile, targetCenterX, roomBottomPx);
    const spawnCenterX = floor?.x ?? targetCenterX;
    const floorY = floor?.y ?? (roomTopPx + IW_ROOM_H_PX / 2);
    const minX = roomLeftPx + TILE_SIZE;
    const maxX = roomRightPx - TILE_SIZE - playerSize.width;

    return {
      x: Math.round(Math.max(minX, Math.min(maxX, spawnCenterX - playerSize.width / 2))),
      y: Math.round(Math.max(roomTopPx + TILE_SIZE, floorY - playerSize.height)),
    };
  }

  private resolveForStratum(
    stratumIndex: number,
    playerWidth: number,
    playerHeight: number,
    fallback: () => SpawnPoint,
  ): SpawnPoint {
    const ldtkSpawn = this.ldtkSpawnByStratum.get(stratumIndex);
    if (!ldtkSpawn) return fallback();
    return {
      x: Math.round(ldtkSpawn.x - playerWidth / 2),
      y: Math.round(ldtkSpawn.y - playerHeight),
    };
  }

  private findFloor(
    fullGrid: number[][],
    roomLeftTile: number,
    roomTopTile: number,
    targetCenterX: number,
    roomBottomPx: number,
  ): SpawnPoint | null {
    let best: { x: number; y: number; score: number } | null = null;
    const chooseBetter = (
      current: { x: number; y: number; score: number } | null,
      centerX: number,
      floorY: number,
    ): { x: number; y: number; score: number } => {
      const horizontal = Math.abs(centerX - targetCenterX);
      const verticalPenalty = Math.max(0, roomBottomPx - floorY) * 0.25;
      const score = horizontal + verticalPenalty;
      if (!current || score < current.score) return { x: centerX, y: floorY, score };
      return current;
    };

    for (const pt of this.deps.computeSpawnPoints(fullGrid, roomLeftTile, roomTopTile)) {
      best = chooseBetter(best, pt.x + TILE_SIZE / 2, pt.y);
    }
    if (best) return { x: best.x, y: best.y };

    const colStart = roomLeftTile + 1;
    const colEnd = roomLeftTile + IW_ROOM_W_TILES - 1;
    const rowStart = roomTopTile + 1;
    const rowEnd = roomTopTile + IW_ROOM_H_TILES - 1;
    for (let tr = rowStart; tr < rowEnd; tr++) {
      for (let tc = colStart; tc < colEnd; tc++) {
        const here = fullGrid[tr]?.[tc] ?? 1;
        const below = fullGrid[tr + 1]?.[tc] ?? 1;
        if (here === 0 && below >= 1) {
          best = chooseBetter(best, tc * TILE_SIZE + TILE_SIZE / 2, (tr + 1) * TILE_SIZE);
        }
      }
    }
    return best ? { x: best.x, y: best.y } : null;
  }
}
