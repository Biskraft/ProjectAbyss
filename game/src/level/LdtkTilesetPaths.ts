import type { LdtkLevel, LdtkTile } from './LdtkLoader';

export function collectLdtkTilesetPaths(levels: readonly LdtkLevel[]): Set<string> {
  const paths = new Set<string>();

  const addTiles = (tiles: readonly Pick<LdtkTile, 'tilesetPath'>[]) => {
    for (const tile of tiles) {
      if (tile.tilesetPath) paths.add(tile.tilesetPath);
    }
  };

  for (const level of levels) {
    addTiles(level.backgroundTiles);
    addTiles(level.wallTiles);
    addTiles(level.interiorTiles);
    addTiles(level.shadowTiles);
    for (const tiles of Object.values(level.extraTileLayers)) addTiles(tiles);
  }

  return paths;
}
