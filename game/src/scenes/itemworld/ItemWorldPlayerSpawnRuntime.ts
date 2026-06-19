import type { LdtkLevel } from '@level/LdtkLoader';
import type { UnifiedGridData } from '@level/RoomGrid';
import { playerTopLeftFromBottomCenter } from '@scenes/shared/PlayerPlacementHelpers';
import {
  IW_ROOM_H_TILES,
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

interface PlaceablePlayer extends PlayerSize {
  x: number;
  y: number;
  vx: number;
  vy: number;
  savePrevPosition(): void;
}

interface RoomRectTiles {
  tileX: number;
  tileY: number;
  tileW: number;
  tileH: number;
}

interface ItemWorldPlayerSpawnRuntimeDeps {
  getCollisionGrid: () => number[][];
  getPlayer: () => PlaceablePlayer;
  getPlayerSize: () => PlayerSize;
  snapCamera: (x: number, y: number) => void;
  computeSpawnPoints: (
    grid: number[][],
    roomLeftTile: number,
    roomTopTile: number,
    roomWidthTiles?: number,
    roomHeightTiles?: number,
  ) => SpawnPoint[];
}

export class ItemWorldPlayerSpawnRuntime {
  private readonly ldtkSpawnByStratum = new Map<number, SpawnPoint>();
  private readonly roomRects = new Map<string, RoomRectTiles>();

  constructor(private readonly deps: ItemWorldPlayerSpawnRuntimeDeps) {}

  clear(): void {
    this.ldtkSpawnByStratum.clear();
    this.roomRects.clear();
  }

  captureFromRoom(
    unifiedGrid: UnifiedGridData,
    ldtkLevel: LdtkLevel,
    col: number,
    absRow: number,
    roomX: number,
    roomY: number,
  ): void {
    this.roomRects.set(this.roomKey(col, absRow), {
      tileX: Math.floor(roomX / TILE_SIZE),
      tileY: Math.floor(roomY / TILE_SIZE),
      tileW: Math.max(1, Math.floor(ldtkLevel.pxWid / TILE_SIZE)),
      tileH: Math.max(1, Math.floor(ldtkLevel.pxHei / TILE_SIZE)),
    });

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

  placeAtRoom(
    stratumIndex: number,
    col: number,
    absoluteRow: number,
    options: { snapCamera?: boolean } = {},
  ): void {
    this.placeAt(this.resolveForRoom(stratumIndex, col, absoluteRow), options);
  }

  placeAtFloor(
    col: number,
    absoluteRow: number,
    options: { snapCamera?: boolean } = {},
  ): void {
    this.placeAt(this.resolveFloorSpawn(col, absoluteRow), options);
  }

  resolveFloorSpawn(col: number, absoluteRow: number): SpawnPoint {
    const fullGrid = this.deps.getCollisionGrid();
    const playerSize = this.deps.getPlayerSize();
    const rect = this.roomRects.get(this.roomKey(col, absoluteRow)) ?? {
      tileX: col * IW_ROOM_W_TILES,
      tileY: absoluteRow * IW_ROOM_H_TILES,
      tileW: IW_ROOM_W_TILES,
      tileH: IW_ROOM_H_TILES,
    };
    const roomLeftTile = rect.tileX;
    const roomTopTile = rect.tileY;
    const roomWidthTiles = rect.tileW;
    const roomHeightTiles = rect.tileH;
    const roomLeftPx = roomLeftTile * TILE_SIZE;
    const roomRightPx = (roomLeftTile + roomWidthTiles) * TILE_SIZE;
    const roomTopPx = roomTopTile * TILE_SIZE;
    const roomBottomPx = (roomTopTile + roomHeightTiles) * TILE_SIZE;
    const targetCenterX = roomLeftPx + (roomWidthTiles * TILE_SIZE) / 2;

    const floor = this.findFloor(
      fullGrid,
      roomLeftTile,
      roomTopTile,
      roomWidthTiles,
      roomHeightTiles,
      targetCenterX,
      roomBottomPx,
    );
    const spawnCenterX = floor?.x ?? targetCenterX;
    const floorY = floor?.y ?? (roomTopPx + (roomHeightTiles * TILE_SIZE) / 2);
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
    return playerTopLeftFromBottomCenter(ldtkSpawn, {
      width: playerWidth,
      height: playerHeight,
    });
  }

  private findFloor(
    fullGrid: number[][],
    roomLeftTile: number,
    roomTopTile: number,
    roomWidthTiles: number,
    roomHeightTiles: number,
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

    for (const pt of this.deps.computeSpawnPoints(
      fullGrid,
      roomLeftTile,
      roomTopTile,
      roomWidthTiles,
      roomHeightTiles,
    )) {
      best = chooseBetter(best, pt.x + TILE_SIZE / 2, pt.y);
    }
    if (best) return { x: best.x, y: best.y };

    const colStart = roomLeftTile + 1;
    const colEnd = roomLeftTile + roomWidthTiles - 1;
    const rowStart = roomTopTile + 1;
    const rowEnd = roomTopTile + roomHeightTiles - 1;
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

  private placeAt(spawn: SpawnPoint, options: { snapCamera?: boolean }): void {
    const player = this.deps.getPlayer();
    player.x = spawn.x;
    player.y = spawn.y;
    player.vx = 0;
    player.vy = 0;
    player.savePrevPosition();
    if (options.snapCamera) {
      this.deps.snapCamera(player.x + player.width / 2, player.y + player.height / 2);
    }
  }

  private roomKey(col: number, absRow: number): string {
    return `${col}:${absRow}`;
  }
}
