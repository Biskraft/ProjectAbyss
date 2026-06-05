import { TILE_AIR, TILE_WATER } from '@core/Physics';
import { isLdtkWallSlope2x1Tile, type LdtkTile } from '@level/LdtkLoader';
import { TILE_SIZE } from '@core/Physics';

interface FilterWorldWallTilesOptions {
  wallTiles: readonly LdtkTile[];
  collisionGrid: number[][];
  excludeWaterCells?: boolean;
}

export function filterWorldWallTilesForCollision(options: FilterWorldWallTilesOptions): LdtkTile[] {
  const { wallTiles, collisionGrid, excludeWaterCells = false } = options;
  return wallTiles.filter((tile) => {
    const col = Math.floor(tile.px[0] / TILE_SIZE);
    const row = Math.floor(tile.px[1] / TILE_SIZE);
    const value = collisionGrid[row]?.[col] ?? TILE_AIR;
    if (isLdtkWallSlope2x1Tile(tile)) return true;
    if (excludeWaterCells && value === TILE_WATER) return false;
    return value !== TILE_AIR;
  });
}
