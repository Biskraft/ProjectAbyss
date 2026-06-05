import { applyAreaTilesetToLdtkTiles } from '@data/areaPalettes';
import type { LdtkTile } from './LdtkLoader';

const DEFAULT_WORLD_TILESET = 'atlas/world_01.png';

export interface ApplyDefaultWorldAreaRetagsOptions {
  bgAreaId: string;
  wallAreaId: string;
  bgTiles: readonly LdtkTile[];
  wallTiles: readonly LdtkTile[];
  shadowTiles?: readonly LdtkTile[];
}

export function applyDefaultWorldAreaRetags(options: ApplyDefaultWorldAreaRetagsOptions): void {
  const { bgAreaId, wallAreaId, bgTiles, wallTiles, shadowTiles } = options;
  applyAreaTilesetToLdtkTiles(
    bgAreaId,
    bgTiles.filter(tile => tile.tilesetPath === DEFAULT_WORLD_TILESET),
  );
  applyAreaTilesetToLdtkTiles(
    wallAreaId,
    wallTiles.filter(tile => tile.tilesetPath === DEFAULT_WORLD_TILESET),
  );
  if (shadowTiles) {
    applyAreaTilesetToLdtkTiles(
      wallAreaId,
      shadowTiles.filter(tile => tile.tilesetPath === DEFAULT_WORLD_TILESET),
    );
  }
}
