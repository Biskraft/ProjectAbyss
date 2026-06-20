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

const SPAWN_CAMERA_MARGIN_PX = 160;
const SPAWN_PLAYER_MIN_DISTANCE_PX = 320;

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
  getCameraViewport: () => { x: number; y: number; width: number; height: number };
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

  pickSafeSpawn(
    context: ItemWorldEnemySpawnContext,
    rng: PRNG,
    entityWidth: number,
    entityHeight: number,
  ): { x: number; y: number } | null {
    if (context.spawnPoints.length === 0) return null;

    const camera = this.expandRect(this.deps.getCameraViewport(), SPAWN_CAMERA_MARGIN_PX);
    const player = this.deps.getPlayer();
    const playerCenter = {
      x: player.x + player.width / 2,
      y: player.y + player.height / 2,
    };
    const safe: Array<{ x: number; y: number }> = [];
    const start = rng.nextInt(0, context.spawnPoints.length - 1);

    for (let i = 0; i < context.spawnPoints.length; i++) {
      const point = context.spawnPoints[(start + i) % context.spawnPoints.length];
      const candidate = { x: point.x, y: point.y - entityHeight };
      if (this.isVisibleInCamera(candidate.x, candidate.y, entityWidth, entityHeight, camera)) continue;
      if (this.distanceSq(candidate.x + entityWidth / 2, candidate.y + entityHeight / 2, playerCenter.x, playerCenter.y) <
          SPAWN_PLAYER_MIN_DISTANCE_PX * SPAWN_PLAYER_MIN_DISTANCE_PX) {
        continue;
      }
      safe.push(candidate);
    }

    return safe.length > 0 ? safe[0] : null;
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

  private expandRect(
    rect: { x: number; y: number; width: number; height: number },
    margin: number,
  ): { x: number; y: number; width: number; height: number } {
    return {
      x: rect.x - margin,
      y: rect.y - margin,
      width: rect.width + margin * 2,
      height: rect.height + margin * 2,
    };
  }

  private isVisibleInCamera(
    x: number,
    y: number,
    width: number,
    height: number,
    camera: { x: number; y: number; width: number; height: number },
  ): boolean {
    return x < camera.x + camera.width &&
      x + width > camera.x &&
      y < camera.y + camera.height &&
      y + height > camera.y;
  }

  private distanceSq(ax: number, ay: number, bx: number, by: number): number {
    const dx = ax - bx;
    const dy = ay - by;
    return dx * dx + dy * dy;
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
