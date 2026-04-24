import { createEnemy } from '@entities/EnemyFactory';
import type { Enemy } from '@entities/Enemy';
import {
  TILE_SIZE,
  IW_ROOM_W_TILES, IW_ROOM_H_TILES,
} from './ItemWorldMapController';

/**
 * Handles enemy/entity factory methods and geometry queries for ItemWorldScene.
 * Pure functions that don't reference scene state directly.
 */
export class ItemWorldSpawnController {
  /** Create an enemy instance by type name and level. */
  createEnemyFromType(type: string, level: number): Enemy<string> {
    return createEnemy(type, level);
  }

  /**
   * Find the longest flat floor span in a room region of the full grid.
   * Returns world-space center of the span, or null if no span >= minLen.
   */
  findFlatFloorCenter(
    fullGrid: number[][],
    roomTopCol: number,
    roomTopRow: number,
    minLen: number,
  ): { x: number; y: number } | null {
    let best: { row: number; startCol: number; length: number } | null = null;

    for (let localRow = IW_ROOM_H_TILES - 1; localRow >= 0; localRow--) {
      const tr = roomTopRow + localRow;
      if (tr < 0 || tr + 1 >= fullGrid.length) continue;

      let runStart = -1;
      let runLen = 0;
      for (let localCol = 0; localCol < IW_ROOM_W_TILES; localCol++) {
        const tc = roomTopCol + localCol;
        const here = fullGrid[tr]?.[tc] ?? 1;
        const below = fullGrid[tr + 1]?.[tc] ?? 1;
        const isFloor = here === 0 && below >= 1;

        if (isFloor) {
          if (runStart < 0) runStart = tc;
          runLen++;
          if (runLen >= minLen) {
            if (!best || runLen > best.length) {
              best = { row: tr, startCol: runStart, length: runLen };
            }
          }
        } else {
          runStart = -1;
          runLen = 0;
        }
      }
    }

    if (!best) return null;
    const centerTile = best.startCol + Math.floor(best.length / 2);
    return {
      x: centerTile * TILE_SIZE + TILE_SIZE / 2,
      y: best.row * TILE_SIZE + TILE_SIZE,
    };
  }

  /**
   * Compute valid spawn positions (air tile with solid below) in a room region.
   * Returns array of world-space positions.
   */
  computeSpawnPoints(
    fullGrid: number[][],
    roomTopCol: number,
    roomTopRow: number,
  ): Array<{ x: number; y: number }> {
    const spawnPoints: Array<{ x: number; y: number }> = [];

    for (let tc = roomTopCol + 2; tc < roomTopCol + IW_ROOM_W_TILES - 2; tc++) {
      for (let tr = roomTopRow + 2; tr < roomTopRow + IW_ROOM_H_TILES - 2; tr++) {
        const here = fullGrid[tr]?.[tc] ?? 1;
        const below = fullGrid[tr + 1]?.[tc] ?? 1;
        if (here === 0 && below >= 1) {
          spawnPoints.push({ x: tc * TILE_SIZE, y: (tr + 1) * TILE_SIZE });
        }
      }
    }

    return spawnPoints;
  }
}
