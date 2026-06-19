import type { Player } from '@entities/Player';
import type { Enemy } from '@entities/Enemy';
import { initializeEnemySpawnedEntity, type EnemySpawnInitializationDeps } from '@scenes/shared/EnemySpawnHelpers';
import { setEnemyRoomKey } from '@entities/EnemyMetadata';
import type { LdtkLevel } from '@level/LdtkLoader';
import {
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
  roomWidthTiles: number;
  roomHeightTiles: number;
  roomWidthPx: number;
  roomHeightPx: number;
  spawnPoints: Array<{ x: number; y: number }>;
}

export interface ItemWorldRoomRectTiles {
  tileX: number;
  tileY: number;
  tileW: number;
  tileH: number;
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

  createContext(
    col: number,
    absRow: number,
    isBossRoom: boolean,
    rect: ItemWorldRoomRectTiles,
  ): ItemWorldEnemySpawnContext | null {
    const offX = rect.tileX * TILE_SIZE;
    const offY = rect.tileY * TILE_SIZE;
    const roomTopRow = rect.tileY;
    const roomTopCol = rect.tileX;
    const spawnPoints = this.deps.getSpawnController()
      .computeSpawnPoints(this.deps.getCollisionGrid(), roomTopCol, roomTopRow, rect.tileW, rect.tileH);

    if (spawnPoints.length === 0 && !isBossRoom) return null;

    return {
      roomKey: `${col},${absRow}`,
      offX,
      offY,
      roomTopCol,
      roomTopRow,
      roomWidthTiles: rect.tileW,
      roomHeightTiles: rect.tileH,
      roomWidthPx: rect.tileW * TILE_SIZE,
      roomHeightPx: rect.tileH * TILE_SIZE,
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

  spawnAuthoredPrologueMonsters(
    level: LdtkLevel,
    col: number,
    absRow: number,
    roomX: number,
    roomY: number,
  ): number {
    if (!level.identifier.startsWith('ItemStratum_Prologue_')) return 0;

    const roomKey = `${col},${absRow}`;
    let spawned = 0;

    for (const entity of level.entities) {
      const entityType = entity.type.toLowerCase();
      if (entityType !== 'monsterspawn' && entityType !== 'enemy_spawn') continue;

      const enemyType = this.stringField(entity.fields, ['MonsterType', 'monsterType', 'EnemyType', 'enemyType', 'type', 'Type']) ?? 'Skeleton';
      const enemyLevel = this.numberField(entity.fields, ['Level', 'level']) ?? 1;
      const enemy = this.deps.getSpawnController().createEnemyFromType(enemyType, enemyLevel);
      this.spawnAt(enemy, roomKey, {
        x: roomX + entity.px[0],
        y: roomY + entity.px[1] - enemy.height,
      });
      spawned++;
    }

    return spawned;
  }

  private trackEnemy(enemy: Enemy<string>, roomKey: string): void {
    setEnemyRoomKey(enemy, roomKey);
    const roomEnemyCount = this.deps.getRoomEnemyCount();
    roomEnemyCount.set(roomKey, (roomEnemyCount.get(roomKey) ?? 0) + 1);
  }

  private stringField(fields: Record<string, unknown>, names: string[]): string | null {
    for (const name of names) {
      const value = fields[name];
      if (typeof value === 'string' && value.trim().length > 0) return value.trim();
    }
    return null;
  }

  private numberField(fields: Record<string, unknown>, names: string[]): number | null {
    for (const name of names) {
      const value = fields[name];
      if (typeof value === 'number' && Number.isFinite(value)) return value;
      if (typeof value === 'string' && value.trim().length > 0) {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
      }
    }
    return null;
  }
}
