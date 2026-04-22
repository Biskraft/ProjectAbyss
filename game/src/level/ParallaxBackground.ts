/**
 * ParallaxBackground — CSV-driven gradient + optional image parallax.
 *
 * Sits behind all LDtk layers. Scrolls at `factor` speed relative to the camera.
 * Gradient is baked from the BG entry's palette stops + depth params.
 */

import { Container, Sprite, Texture, Assets } from 'pixi.js';
import { assetPath } from '@core/AssetLoader';
import { sampleRow, unpack, lerp } from '@effects/PaletteSwapFilter';
import { PaletteSwapFilter } from '@effects/PaletteSwapFilter';
import type { AreaPaletteEntry } from '@data/areaPalettes';

export class ParallaxBackground {
  /** Top-level container — add this to the scene. */
  readonly container: Container;
  /** Gradient lives here (not parallax-scrolled, fixed to camera). */
  private gradientLayer: Container;
  /** Parallax images live here (scrolled by factor). */
  private parallaxLayer: Container;
  private gradientSprite: Sprite | null = null;
  private imageLayer: Container | null = null;
  private factor = 0.3;

  constructor() {
    this.container = new Container();
    this.gradientLayer = new Container();
    this.parallaxLayer = new Container();
    this.container.addChild(this.gradientLayer);
    this.container.addChild(this.parallaxLayer);
  }

  /**
   * Build parallax background from a CSV BG entry.
   *
   * @param entry   - Area palette entry (BG row)
   * @param levelW  - Level width in pixels
   * @param levelH  - Level height in pixels
   * @param paletteAtlas - Optional palette atlas for image layer PaletteSwapFilter
   */
  async setup(
    entry: AreaPaletteEntry,
    levelW: number,
    levelH: number,
    paletteAtlas?: { texture: Texture; rowCount: number; row: number },
  ): Promise<void> {
    this.clear();
    this.factor = entry.parallaxFactor || 0.3;

    // 1. Build vertical gradient at actual pixel height — no GPU stretching
    const totalW = levelW + 640;
    const totalH = levelH + 360;
    const gradTex = this.buildGradientTexture(entry, totalH);
    this.gradientSprite = new Sprite(gradTex);
    // Width only needs scaling (1px → totalW), height is 1:1
    this.gradientSprite.width = totalW;
    this.gradientSprite.height = totalH;
    this.gradientSprite.x = -320;
    this.gradientSprite.y = -180;
    this.gradientLayer.addChild(this.gradientSprite);

    // 2. Optional parallax image — no vertical tiling, horizontal repeat via cloned sprites
    if (entry.parallaxImage) {
      try {
        const tex = await Assets.load<Texture>(assetPath(`assets/parallax/${entry.parallaxImage}.png`));
        tex.source.scaleMode = 'nearest';
        tex.source.addressMode = 'clamp-to-edge';

        // Scale to fit viewport height, anchor to room bottom
        const fitScale = 360 / tex.height;
        const scaledW = tex.width * fitScale;
        const scaledH = 360;
        // Repeat horizontally to cover level width
        const totalCoverW = levelW + 640;
        const copies = Math.ceil(totalCoverW / scaledW) + 1;
        // Y: bottom-anchored — image bottom aligns with level bottom
        const imageY = levelH - scaledH;

        this.imageLayer = new Container();
        for (let i = 0; i < copies; i++) {
          const s = new Sprite(tex);
          s.width = scaledW;
          s.height = scaledH;
          s.x = -320 + i * scaledW;
          s.y = imageY;
          this.imageLayer.addChild(s);
        }

        // PaletteSwapFilter on container — depthBias=0 to prevent inversion
        if (paletteAtlas) {
          this.imageLayer.filters = [
            new PaletteSwapFilter({
              paletteTex: paletteAtlas.texture,
              rowCount: paletteAtlas.rowCount,
              row: paletteAtlas.row,
              strength: 1.0,
              depthBias: 0,
              depthCenter: 0.5,
              brightness: entry.brightness,
              tint: entry.tint,
            }),
          ];
        }
        this.parallaxLayer.addChild(this.imageLayer);
      } catch {
        // Image not found — gradient only
      }
    }
  }

  /** Update scroll position each frame. */
  updateScroll(cameraX: number, cameraY: number): void {
    // Gradient: fixed to camera (no parallax)
    // — it's a child of container which is a child of gameContainer,
    //   so we counter the camera offset to stay screen-fixed
    // Parallax image: scroll at reduced speed
    this.parallaxLayer.x = cameraX * (1 - this.factor);
    this.parallaxLayer.y = cameraY * (1 - this.factor);
  }

  /** Remove all children. */
  clear(): void {
    if (this.gradientSprite) {
      this.gradientSprite.destroy();
      this.gradientSprite = null;
    }
    if (this.imageLayer) {
      this.imageLayer.destroy({ children: true });
      this.imageLayer = null;
    }
    this.gradientLayer.removeChildren();
    this.parallaxLayer.removeChildren();
  }

  destroy(): void {
    this.clear();
    this.container.destroy();
  }

  /**
   * Bake a 1 x 256 vertical gradient texture from CSV stops + depth params.
   * Each Y pixel samples the palette at a depth-biased luma.
   */
  /**
   * Build gradient at actual target height — no GPU stretching needed.
   * @param targetH - final pixel height of the gradient sprite
   */
  private buildGradientTexture(entry: AreaPaletteEntry, targetH: number): Texture {
    const h = Math.max(1, Math.ceil(targetH));
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    const imgData = ctx.createImageData(1, h);

    const brightness = entry.brightness ?? 1.0;
    const tintRgb = unpack(entry.tint ?? 0xffffff);
    const tintMul = [tintRgb[0] / 255, tintRgb[1] / 255, tintRgb[2] / 255];

    for (let y = 0; y < h; y++) {
      const screenY = y / (h - 1);
      const luma = 0.5;
      const depthShift = (screenY - (entry.depthCenter ?? 0.5)) * (entry.depthBias ?? 0);
      const biased = Math.max(0, Math.min(1, luma + depthShift));
      const [r, g, b] = sampleRow(entry.stops, biased);
      const idx = y * 4;
      imgData.data[idx + 0] = Math.min(255, r * brightness * tintMul[0]);
      imgData.data[idx + 1] = Math.min(255, g * brightness * tintMul[1]);
      imgData.data[idx + 2] = Math.min(255, b * brightness * tintMul[2]);
      imgData.data[idx + 3] = 255;
    }

    ctx.putImageData(imgData, 0, 0);
    const tex = Texture.from(canvas);
    tex.source.scaleMode = 'linear';
    tex.source.addressMode = 'clamp-to-edge';
    return tex;
  }
}
