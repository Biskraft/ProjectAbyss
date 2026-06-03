import type { Container } from 'pixi.js';
import type { Player } from '@entities/Player';
import type { Enemy } from '@entities/Enemy';
import { setEnemyRoomKey } from '@systems/EntityRuntimeMeta';
import {
  IW_ROOM_H_PX,
  IW_ROOM_W_PX,
  TILE_SIZE,
} from './ItemWorldMapController';
import type { ItemWorldSpawnController } from './ItemWorldSpawnController';
import type { PRNG } from '@utils/PRNG';

export interface ItemWorldEnemySpawnContext {
  roomKey: string;
  offX: number;
  offY: number;
  roomTopCol: number;
  roomTopRow: number;
  spawnPoints: Array<{ x: number; y: number }>;
}

interface ItemWorldEnemySpawnRuntimeDeps {
  getFullGrid: () => number[][];
  getPlayer: () => Player;
  getEnemies: () => Enemy<string>[];
  getEntityLayer: () => Container;
  getRoomEnemyCount: () => Map<string, number>;
  getSpawnController: () => ItemWorldSpawnController;
}

export class ItemWorldEnemySpawnRuntime {
  constructor(private readonly deps: ItemWorldEnemySpawnRuntimeDeps) {}

  createContext(col: number, absRow: number, isBossRoom: boolean): ItemWorldEnemySpawnContext | null {
    const offX = col * IW_ROOM_W_PX;
    const offY = absRow * IW_ROOM_H_PX;
    const roomTopRow = Math.floor(offY / TILE_SIZE);
    const roomTopCol = Math.floor(offX / TILE_SIZE);
    const spawnPoints = this.deps.getSpawnController()
      .computeSpawnPoints(this.deps.getFullGrid(), roomTopCol, roomTopRow);

    if (spawnPoints.length === 0 && !isBossRoom) return null;

    return {
      roomKey: `${col},${absRow}`,
      offX,
      offY,
      roomTopCol,
      roomTopRow,
      spawnPoints,
    };
  }

  pickSpawn(
    context: ItemWorldEnemySpawnContext,
    rng: PRNG,
    entityHeight: number,
  ): { x: number; y: number } {
    const point = context.spawnPoints[rng.nextInt(0, context.spawnPoints.length - 1)];
    return { x: point.x, y: point.y - entityHeight };
  }

  findFlatFloorCenter(
    context: ItemWorldEnemySpawnContext,
    minLen: number,
  ): { x: number; y: number } | null {
    return this.deps.getSpawnController().findFlatFloorCenter(
      this.deps.getFullGrid(),
      context.roomTopCol,
      context.roomTopRow,
      minLen,
    );
  }

  spawnAt(
    enemy: Enemy<string>,
    roomKey: string,
    position: { x: number; y: number },
  ): void {
    enemy.x = position.x;
    enemy.y = position.y;
    enemy.roomData = this.deps.getFullGrid();
    enemy.target = this.deps.getPlayer();
    this.deps.getEnemies().push(enemy);
    this.deps.getEntityLayer().addChild(enemy.container);
    this.trackEnemy(enemy, roomKey);
  }

  private trackEnemy(enemy: Enemy<string>, roomKey: string): void {
    setEnemyRoomKey(enemy, roomKey);
    const roomEnemyCount = this.deps.getRoomEnemyCount();
    roomEnemyCount.set(roomKey, (roomEnemyCount.get(roomKey) ?? 0) + 1);
  }
}
