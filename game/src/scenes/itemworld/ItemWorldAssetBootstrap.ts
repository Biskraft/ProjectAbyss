import { Assets, type Texture } from 'pixi.js';
import { assetPath } from '@core/AssetLoader';
import { loadBundleOnce } from '@data/assetBundles';
import {
  ensureAreaTilesetsLoaded,
  resolveItemWorldThemeSlug,
} from '@data/areaPalettes';
import { LdtkRenderer } from '@level/LdtkRenderer';
import type { LdtkLevel, LdtkTile } from '@level/LdtkLoader';
import { collectLdtkTilesetPaths } from '@level/LdtkTilesetPaths';
import {
  getItemWorldTemplatesIfReady,
  prepareItemWorldTemplates,
} from '@level/ItemWorldTemplatePool';
import { UISkin } from '@ui/UISkin';

export interface ItemWorldAssetBootstrapResult {
  themeSlug: string;
  hudSkin: UISkin;
  hudSkinLoad: Promise<void>;
  atlas: Texture | null;
  ldtkTemplates: LdtkLevel[];
  ldtkRenderer: LdtkRenderer | null;
}

function cloneLdtkTile(tile: LdtkTile): LdtkTile {
  return {
    ...tile,
    px: [tile.px[0], tile.px[1]],
    src: [tile.src[0], tile.src[1]],
  };
}

function cloneLdtkLevel(level: LdtkLevel): LdtkLevel {
  return {
    ...level,
    collisionGrid: level.collisionGrid.map(row => [...row]),
    backgroundTiles: level.backgroundTiles.map(cloneLdtkTile),
    wallTiles: level.wallTiles.map(cloneLdtkTile),
    interiorTiles: level.interiorTiles.map(cloneLdtkTile),
    extraTileLayers: Object.fromEntries(
      Object.entries(level.extraTileLayers).map(([key, tiles]) => [key, tiles.map(cloneLdtkTile)]),
    ),
    shadowTiles: level.shadowTiles.map(cloneLdtkTile),
    entities: level.entities.map(entity => ({
      ...entity,
      px: [entity.px[0], entity.px[1]],
      grid: [entity.grid[0], entity.grid[1]],
      fields: { ...entity.fields },
    })),
    neighbors: [...level.neighbors],
    dirNeighbors: Object.fromEntries(
      Object.entries(level.dirNeighbors).map(([key, ids]) => [key, [...ids]]),
    ),
    doorAnchors: { ...level.doorAnchors },
    exits: [...level.exits],
  };
}

function cloneLdtkLevels(levels: LdtkLevel[]): LdtkLevel[] {
  return levels.map(cloneLdtkLevel);
}

export async function bootstrapItemWorldAssets(
  themeId: string | undefined,
  atlases: Record<string, Texture>,
): Promise<ItemWorldAssetBootstrapResult> {
  const themeSlug = resolveItemWorldThemeSlug((themeId ?? 'T-FOUNDRY').toLowerCase().replace('t-', ''));

  await loadBundleOnce('item_world');

  const hudSkin = new UISkin();
  const hudSkinLoad = hudSkin.load().catch((e) => {
    // eslint-disable-next-line no-console
    console.warn('[UISkin] load failed - falling back to Graphics HUD:', e);
  });

  await ensureAreaTilesetsLoaded([`iw_${themeSlug}_bg`, `iw_${themeSlug}_wall`], atlases);

  const atlas =
    atlases['atlas/world_01.png'] ??
    Object.values(atlases)[0] ??
    null;

  try {
    const cachedTemplates = getItemWorldTemplatesIfReady() ?? await prepareItemWorldTemplates();
    // ItemWorldScene retags LDtk tile paths per item theme, so keep the
    // shared template pool immutable across entries.
    const ldtkTemplates = cloneLdtkLevels(cachedTemplates);
    const ldtkRenderer = new LdtkRenderer();

    // Load authored LDtk tilesets that are not covered by area palettes.
    // ItemStratum can intentionally use atlas/itemstratum_01.png on normal
    // wall/background layers, so this must include more than extra layers.
    const authoredTilesetPaths = collectLdtkTilesetPaths(ldtkTemplates);
    await Promise.all(
      Array.from(authoredTilesetPaths).map(async (relPath) => {
        if (atlases[relPath]) return;
        try {
          atlases[relPath] = (await Assets.load(assetPath(`assets/${relPath}`))) as Texture;
        } catch (err) {
          console.warn(`[ItemWorld] failed to load extra tileset "${relPath}":`, err);
        }
      }),
    );

    return {
      themeSlug,
      hudSkin,
      hudSkinLoad,
      atlas,
      ldtkTemplates,
      ldtkRenderer,
    };
  } catch (e) {
    console.warn('[ItemWorld] LDtk templates not found, using code templates');
    return {
      themeSlug,
      hudSkin,
      hudSkinLoad,
      atlas,
      ldtkTemplates: [],
      ldtkRenderer: null,
    };
  }
}
