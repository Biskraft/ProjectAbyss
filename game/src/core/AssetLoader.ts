import { Assets, Texture, Graphics, RenderTexture, type Renderer } from 'pixi.js';

/**
 * Resolve an asset path using Vite's base URL so paths work on both
 * localhost (base="/") and GitHub Pages (base="/echoris/").
 */
export function assetPath(relativePath: string): string {
  const base = import.meta.env.BASE_URL ?? '/';
  // Avoid double slashes
  const trimmed = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
  return base.endsWith('/') ? `${base}${trimmed}` : `${base}/${trimmed}`;
}

export class AssetLoader {
  private textures = new Map<string, Texture>();

  async loadBundle(
    bundleName: string,
    assets: Record<string, string>,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    Assets.addBundle(bundleName, assets);
    const loaded = await Assets.loadBundle(bundleName, onProgress);
    for (const [key, tex] of Object.entries(loaded)) {
      if (tex instanceof Texture) {
        this.textures.set(key, tex);
      }
    }
  }

  getTexture(key: string): Texture {
    const tex = this.textures.get(key);
    if (!tex) throw new Error(`Texture not found: ${key}`);
    return tex;
  }

  hasTexture(key: string): boolean {
    return this.textures.has(key);
  }

  createPlaceholderTexture(
    renderer: Renderer,
    color: number,
    width: number,
    height: number,
    key?: string
  ): Texture {
    const gfx = new Graphics();
    gfx.rect(0, 0, width, height).fill(color);
    const texture = renderer.generateTexture(gfx);
    gfx.destroy();
    if (key) {
      this.textures.set(key, texture);
    }
    return texture;
  }
}
