import { Assets, Texture } from 'pixi.js';
import { assetPath } from '@core/AssetLoader';
import { Debug } from '@core/Debug';
import type { LdtkLevel } from '@level/LdtkLoader';
import { prepareItemWorldTemplates } from '@level/ItemWorldTemplatePool';
import { collectLdtkTilesetPaths } from '@level/LdtkTilesetPaths';
import { loadBundleOnce } from '@data/assetBundles';
import { ensureAreaTilesetsLoaded } from '@data/areaPalettes';
import type { ItemInstance } from '@items/ItemInstance';

export class ItemWorldEntryPreloader {
  private readonly tasks = new Map<string, Promise<void>>();

  constructor(private readonly atlases: Record<string, Texture>) {}

  prestream(item: ItemInstance, reason: string): void {
    const themeSlug = ItemWorldEntryPreloader.getThemeSlug(item);
    const cached = this.tasks.get(themeSlug);
    if (cached) return;

    const startedAt = performance.now();
    const task = this.loadEntryAssets(item, themeSlug, reason, startedAt)
      .catch((err) => {
        this.tasks.delete(themeSlug);
        console.warn(`[ItemWorld] entry prestream failed (${reason}, theme=${themeSlug}):`, err);
      });
    this.tasks.set(themeSlug, task);
  }

  static getThemeSlug(item: ItemInstance): string {
    return (item.def.themeId ?? 'T-HABITAT').toLowerCase().replace('t-', '');
  }

  private async loadEntryAssets(
    item: ItemInstance,
    themeSlug: string,
    reason: string,
    startedAt: number,
  ): Promise<void> {
    const templatesPromise = prepareItemWorldTemplates();
    await Promise.all([
      loadBundleOnce('item_world'),
      ensureAreaTilesetsLoaded([`iw_${themeSlug}_bg`, `iw_${themeSlug}_wall`], this.atlases),
      templatesPromise.then(templates => this.preloadAuthoredTilesets(templates)),
    ]);
    Debug.log(
      `[ItemWorld] entry prestream ready reason=${reason} item=${item.def.id} theme=${themeSlug} ms=${Math.round(performance.now() - startedAt)}`,
    );
  }

  private async preloadAuthoredTilesets(templates: readonly LdtkLevel[]): Promise<void> {
    const extraTilesets = collectLdtkTilesetPaths(templates);
    await Promise.all(
      Array.from(extraTilesets)
        .filter(relPath => !this.atlases[relPath])
        .map(async (relPath) => {
          try {
            this.atlases[relPath] = (await Assets.load(assetPath(`assets/${relPath}`))) as Texture;
          } catch (err) {
            console.warn(`[ItemWorld] failed to prestream authored tileset "${relPath}":`, err);
          }
        }),
    );
  }
}
