import { isSolid, TILE_AIR } from '@core/Physics';
import type { PRNG } from '@utils/PRNG';
import {
  IW_ROOM_H_PX,
  IW_ROOM_W_PX,
  TILE_SIZE,
} from './ItemWorldMapController';
import type { ItemWorldResidentRuntime } from './ItemWorldResidentRuntime';
import type { ItemWorldSpawnController } from './ItemWorldSpawnController';

interface ItemWorldSafeRoomResidentSpawnRuntimeDeps {
  getItemUid: () => number;
  getCollisionGrid: () => number[][];
  createPrng: (seed: number) => PRNG;
  getSpawnController: () => ItemWorldSpawnController;
  getResidentRuntime: () => ItemWorldResidentRuntime;
}

export class ItemWorldSafeRoomResidentSpawnRuntime {
  constructor(private readonly deps: ItemWorldSafeRoomResidentSpawnRuntimeDeps) {}

  spawnAmbientForRoom(role: string | undefined, col: number, absRow: number): void {
    if (role !== 'hub') return;

    const offX = col * IW_ROOM_W_PX;
    const offY = absRow * IW_ROOM_H_PX;
    const roomTopRow = Math.floor(offY / TILE_SIZE);
    const roomTopCol = Math.floor(offX / TILE_SIZE);
    const fullGrid = this.deps.getCollisionGrid();
    const rawPoints = this.deps.getSpawnController().computeSpawnPoints(fullGrid, roomTopCol, roomTopRow);
    const points = rawPoints.filter(point => {
      const tcBelow = Math.floor(point.x / TILE_SIZE);
      const trBelow = Math.floor(point.y / TILE_SIZE);
      const belowTile = fullGrid[trBelow]?.[tcBelow] ?? TILE_AIR;
      return isSolid(belowTile);
    });
    if (points.length === 0) return;

    const rng = this.deps.createPrng(this.deps.getItemUid() * 31337 + col * 199 + absRow * 73);
    const indexes = points.map((_, index) => index);
    for (let i = indexes.length - 1; i > 0; i--) {
      const j = rng.nextInt(0, i);
      [indexes[i], indexes[j]] = [indexes[j], indexes[i]];
    }

    const ambientCount = 20;
    const poolLen = indexes.length;
    for (let i = 0; i < ambientCount; i++) {
      const k = poolLen > 1 ? 1 + (i % (poolLen - 1)) : 0;
      const point = points[indexes[k]];
      const lap = poolLen > 1 ? Math.floor(i / (poolLen - 1)) : i;
      const jx = lap > 0 ? rng.nextInt(-20, 20) : rng.nextInt(-4, 4);
      const jy = rng.nextInt(-2, 2);
      const variant = rng.nextInt(0, 63);
      this.deps.getResidentRuntime().spawnAmbient(point.x + jx, point.y + jy, variant);
    }
  }
}
