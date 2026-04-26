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
   *
   * Spawns are restricted to flat floor runs of MIN_FLAT_LEN tiles or longer
   * — short ledges and uneven terrain are skipped so enemies always have room
   * to maneuver and don't get stranded on 1-2 tile islands.
   *
   * Returns array of world-space positions.
   */
  computeSpawnPoints(
    fullGrid: number[][],
    roomTopCol: number,
    roomTopRow: number,
  ): Array<{ x: number; y: number }> {
    const MIN_FLAT_LEN = 6;
    const spawnPoints: Array<{ x: number; y: number }> = [];

    // Inset 2 tiles from room edges so enemies don't spawn flush against walls.
    const colStart = roomTopCol + 2;
    const colEnd = roomTopCol + IW_ROOM_W_TILES - 2;       // exclusive
    const rowStart = roomTopRow + 2;
    const rowEnd = roomTopRow + IW_ROOM_H_TILES - 2;       // exclusive

    for (let tr = rowStart; tr < rowEnd; tr++) {
      // Scan the row left-to-right, tracking contiguous flat-floor runs.
      // Detection uses the full row width (not the inset) so a run that
      // starts under the wall still counts as flat — but only spawn points
      // inside the inset are emitted.
      let runStart = -1;
      let runLen = 0;
      const flush = () => {
        if (runLen >= MIN_FLAT_LEN) {
          for (let c = runStart; c < runStart + runLen; c++) {
            if (c >= colStart && c < colEnd) {
              spawnPoints.push({ x: c * TILE_SIZE, y: (tr + 1) * TILE_SIZE });
            }
          }
        }
        runStart = -1;
        runLen = 0;
      };

      for (let tc = roomTopCol; tc < roomTopCol + IW_ROOM_W_TILES; tc++) {
        const here = fullGrid[tr]?.[tc] ?? 1;
        const below = fullGrid[tr + 1]?.[tc] ?? 1;
        const isFloor = here === 0 && below >= 1;
        if (isFloor) {
          if (runStart < 0) runStart = tc;
          runLen++;
        } else {
          flush();
        }
      }
      flush();
    }

    return spawnPoints;
  }
}
