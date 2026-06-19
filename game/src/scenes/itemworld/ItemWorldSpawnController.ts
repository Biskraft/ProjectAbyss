import { createEnemy } from '@entities/EnemyFactory';
import type { Enemy } from '@entities/Enemy';
import {
  TILE_SIZE,
  IW_ROOM_W_TILES, IW_ROOM_H_TILES,
} from './ItemWorldMapController';
import { isOneWay, isSolid } from '@core/Physics';

const MIN_ENEMY_SPAWN_FLOOR_LEN = 8;

function isEnemySpawnFloor(tile: number): boolean {
  return isSolid(tile) || isOneWay(tile);
}

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
    roomWidthTiles: number = IW_ROOM_W_TILES,
    roomHeightTiles: number = IW_ROOM_H_TILES,
  ): { x: number; y: number } | null {
    let best: { row: number; startCol: number; length: number } | null = null;

    for (let localRow = roomHeightTiles - 1; localRow >= 0; localRow--) {
      const tr = roomTopRow + localRow;
      if (tr < 0 || tr + 1 >= fullGrid.length) continue;

      let runStart = -1;
      let runLen = 0;
      for (let localCol = 0; localCol < roomWidthTiles; localCol++) {
        const tc = roomTopCol + localCol;
        const here = fullGrid[tr]?.[tc] ?? 1;
        const below = fullGrid[tr + 1]?.[tc] ?? 1;
        const isFloor = here === 0 && isEnemySpawnFloor(below);

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
   * Compute valid spawn positions (air tile with solid/platform below) in a room region.
   *
   * Spawns are restricted to flat floor/platform runs of 8 IntGrid cells or longer.
   * Short ledges, fluids, hazards, and uneven terrain are skipped so enemies
   * always have room to maneuver and don't get stranded.
   *
   * Returns array of world-space positions.
   */
  computeSpawnPoints(
    fullGrid: number[][],
    roomTopCol: number,
    roomTopRow: number,
    roomWidthTiles: number = IW_ROOM_W_TILES,
    roomHeightTiles: number = IW_ROOM_H_TILES,
  ): Array<{ x: number; y: number }> {
    const spawnPoints: Array<{ x: number; y: number }> = [];

    // Inset 2 tiles from room edges so enemies don't spawn flush against walls.
    const colStart = roomTopCol + 2;
    const colEnd = roomTopCol + roomWidthTiles - 2;       // exclusive
    const rowStart = roomTopRow + 2;
    const rowEnd = roomTopRow + roomHeightTiles - 2;       // exclusive

    for (let tr = rowStart; tr < rowEnd; tr++) {
      // Scan the row left-to-right, tracking contiguous flat-floor runs.
      // Detection uses the full row width (not the inset) so a run that
      // starts under the wall still counts as flat — but only spawn points
      // inside the inset are emitted.
      let runStart = -1;
      let runLen = 0;
      const flush = () => {
        if (runLen >= MIN_ENEMY_SPAWN_FLOOR_LEN) {
          for (let c = runStart; c < runStart + runLen; c++) {
            if (c >= colStart && c < colEnd) {
              spawnPoints.push({ x: c * TILE_SIZE, y: (tr + 1) * TILE_SIZE });
            }
          }
        }
        runStart = -1;
        runLen = 0;
      };

      for (let tc = roomTopCol; tc < roomTopCol + roomWidthTiles; tc++) {
        const here = fullGrid[tr]?.[tc] ?? 1;
        const below = fullGrid[tr + 1]?.[tc] ?? 1;
        const isFloor = here === 0 && isEnemySpawnFloor(below);
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
