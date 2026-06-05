import { Assets, type Texture } from 'pixi.js';
import { assetPath } from '@core/AssetLoader';
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

export interface PreloadMissingLdtkTilesetsOptions {
  levels: readonly LdtkLevel[];
  atlases: Record<string, Texture>;
  onLoadError?: (relPath: string, error: unknown) => void;
}

export async function preloadMissingLdtkTilesets(
  options: PreloadMissingLdtkTilesetsOptions,
): Promise<void> {
  const { levels, atlases, onLoadError } = options;
  const paths = collectLdtkTilesetPaths(levels);
  await Promise.all(
    Array.from(paths)
      .filter(relPath => !atlases[relPath])
      .map(async (relPath) => {
        try {
          atlases[relPath] = await Assets.load(assetPath(`assets/${relPath}`)) as Texture;
        } catch (error) {
          onLoadError?.(relPath, error);
        }
      }),
  );
}
