import type { Player } from '@entities/Player';
import type { Enemy } from '@entities/Enemy';
import { initializeEnemySpawnedEntity, type EnemySpawnInitializationDeps } from '@scenes/shared/EnemySpawnHelpers';
import { setEnemyRoomKey } from '@entities/EnemyMetadata';
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
  getCollisionGrid: () => number[][];
  getPlayer: () => Player;
  addEnemy: (enemy: Enemy<string>) => void;
  getRoomEnemyCount: () => Map<string, number>;
  getSpawnController: () => ItemWorldSpawnController;
}

export class ItemWorldEnemySpawnRuntime {
  private readonly spawnInitializationDeps: EnemySpawnInitializationDeps;

  constructor(private readonly deps: ItemWorldEnemySpawnRuntimeDeps) {
    this.spawnInitializationDeps = {
      getCollisionGrid: () => this.deps.getCollisionGrid(),
      getPlayer: () => this.deps.getPlayer(),
    };
  }

  createContext(col: number, absRow: number, isBossRoom: boolean): ItemWorldEnemySpawnContext | null {
    const offX = col * IW_ROOM_W_PX;
    const offY = absRow * IW_ROOM_H_PX;
    const roomTopRow = Math.floor(offY / TILE_SIZE);
    const roomTopCol = Math.floor(offX / TILE_SIZE);
    const spawnPoints = this.deps.getSpawnController()
      .computeSpawnPoints(this.deps.getCollisionGrid(), roomTopCol, roomTopRow);

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

  spawnAt(
    enemy: Enemy<string>,
    roomKey: string,
    position: { x: number; y: number },
  ): void {
    initializeEnemySpawnedEntity(enemy, position.x, position.y, this.spawnInitializationDeps);
    this.deps.addEnemy(enemy);
    this.trackEnemy(enemy, roomKey);
  }

  private trackEnemy(enemy: Enemy<string>, roomKey: string): void {
    setEnemyRoomKey(enemy, roomKey);
    const roomEnemyCount = this.deps.getRoomEnemyCount();
    roomEnemyCount.set(roomKey, (roomEnemyCount.get(roomKey) ?? 0) + 1);
  }
}
