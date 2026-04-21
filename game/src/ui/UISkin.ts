import { Assets, Texture, Rectangle } from 'pixi.js';
import { assetPath } from '@core/AssetLoader';

interface SliceBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface SliceEntry {
  name: string;
  bounds: SliceBounds;
  center?: SliceBounds; // 9-slice center
}

/**
 * Loads an Aseprite-exported spritesheet + JSON and provides
 * sub-textures for each named slice.
 *
 * Usage:
 *   const skin = new UISkin();
 *   await skin.load();
 *   const tex = skin.getTexture('hud_status_frame');
 *   const bounds = skin.getBounds('hud_status_frame');
 */
export class UISkin {
  private textures = new Map<string, Texture>();
  private slices = new Map<string, SliceEntry>();
  private loaded = false;

  /** True after load() resolves. */
  get isLoaded(): boolean { return this.loaded; }

  async load(
    jsonPath = 'assets/ui/ui_hud_01.json',
    sheetPath = 'assets/ui/ui_hud_01_sheet.png',
  ): Promise<void> {
    const [json, sheetTex] = await Promise.all([
      fetch(assetPath(jsonPath)).then(r => r.json()),
      Assets.load<Texture>(assetPath(sheetPath)),
    ]);

    // Pixel-art: nearest-neighbor scaling
    sheetTex.source.scaleMode = 'nearest';

    // Parse slices from Aseprite JSON
    const slicesArr: Array<{
      name: string;
      keys: Array<{ frame: number; bounds: SliceBounds; center?: SliceBounds }>;
    }> = json.meta?.slices ?? [];

    for (const slice of slicesArr) {
      // Use frame 0 key
      const key = slice.keys.find(k => k.frame === 0) ?? slice.keys[0];
      if (!key) continue;

      const { x, y, w, h } = key.bounds;

      // Create sub-texture from the sheet (frame 0 starts at x=0)
      const tex = new Texture({
        source: sheetTex.source,
        frame: new Rectangle(x, y, w, h),
      });

      this.textures.set(slice.name, tex);
      this.slices.set(slice.name, {
        name: slice.name,
        bounds: key.bounds,
        center: key.center,
      });
    }

    this.loaded = true;
  }

  /** Get the sub-texture for a named slice. */
  getTexture(name: string): Texture | undefined {
    return this.textures.get(name);
  }

  /** Get the original bounds (position + size in 640x360 space). */
  getBounds(name: string): SliceBounds | undefined {
    return this.slices.get(name)?.bounds;
  }

  /** Get the 9-slice center rect, if defined. */
  getCenter(name: string): SliceBounds | undefined {
    return this.slices.get(name)?.center;
  }

  /** List all loaded slice names. */
  getSliceNames(): string[] {
    return [...this.slices.keys()];
  }
}
