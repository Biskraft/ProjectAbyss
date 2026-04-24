/**
 * ParallaxBackground — 4-layer parallax: gradient + far + mid + near.
 *
 * Sits behind all LDtk layers. Each image layer scrolls at an independent
 * factor relative to the camera. Gradient is baked from CSV palette stops.
 */

import { Container, Sprite, TilingSprite, Texture, Assets } from 'pixi.js';
import { assetPath } from '@core/AssetLoader';
import { sampleRow, unpack } from '@effects/PaletteSwapFilter';
import { PaletteSwapFilter } from '@effects/PaletteSwapFilter';
import type { AreaPaletteEntry } from '@data/areaPalettes';

interface ImageLayerState {
  container: Container;
  factor: number;
}

export class ParallaxBackground {
  readonly container: Container;
  /** True after setup() has been called at least once. */
  isReady = false;
  private gradientLayer: Container;
  private gradientSprite: Sprite | null = null;
  private imageLayers: ImageLayerState[] = [];
  /** Last camera position — used to detect room-transition jumps. */
  private lastCamX = 0;
  private lastCamY = 0;
  /** Accumulated offset to keep parallax continuous across room transitions. */
  private offsetX = 0;
  private offsetY = 0;

  constructor() {
    this.container = new Container();
    this.gradientLayer = new Container();
    this.container.addChild(this.gradientLayer);
  }

  /**
   * Build 4-layer parallax from a CSV BG entry.
   *
   * Layer order (back to front):
   *   L0: gradient   (factor=0.0, fixed)
   *   L1: far image  (entry.parallaxFactor, default 0.1)
   *   L2: mid image  (entry.parallaxFactorMid, default 0.25)
   *   L3: near image (entry.parallaxFactorNear, default 0.45)
   */
  async setup(
    entry: AreaPaletteEntry,
    levelW: number,
    levelH: number,
    paletteAtlas?: { texture: Texture; rowCount: number; row: number },
  ): Promise<void> {
    this.clear();

    // L0: Vertical gradient — oversized to survive room transitions.
    // Width covers viewport (repositioned each frame), height covers max world.
    const gradW = 640 + 320 * 2;
    const gradH = Math.max(levelH * 5, 4000);
    const gradTex = this.buildGradientTexture(entry, gradH);
    this.gradientSprite = new Sprite(gradTex);
    this.gradientSprite.width = gradW;
    this.gradientSprite.height = gradH;
    this.gradientSprite.x = -320;
    this.gradientSprite.y = -gradH / 2;
    this.gradientLayer.addChild(this.gradientSprite);

    // L1: Far image
    if (entry.parallaxImage) {
      await this.addImageLayer(
        entry.parallaxImage,
        entry.parallaxFactor || 0.1,
        levelW, levelH, entry, paletteAtlas,
      );
    }

    // L2: Mid image
    if (entry.parallaxImageMid) {
      await this.addImageLayer(
        entry.parallaxImageMid,
        entry.parallaxFactorMid || 0.25,
        levelW, levelH, entry, paletteAtlas,
      );
    }

    // L3: Near image
    if (entry.parallaxImageNear) {
      await this.addImageLayer(
        entry.parallaxImageNear,
        entry.parallaxFactorNear || 0.45,
        levelW, levelH, entry, paletteAtlas,
      );
    }
    this.isReady = true;
  }

  /** Notify that a room transition occurred so the parallax absorbs the camera jump. */
  onRoomTransition(prevCamX: number, prevCamY: number, newCamX: number, newCamY: number): void {
    const dx = newCamX - prevCamX;
    const dy = newCamY - prevCamY;
    this.offsetX -= dx;
    this.offsetY -= dy;
    this.lastCamX = newCamX;
    this.lastCamY = newCamY;
  }

  /** Update scroll position each frame. */
  updateScroll(cameraX: number, cameraY: number): void {
    this.lastCamX = cameraX;
    this.lastCamY = cameraY;

    // Gradient follows camera horizontally, stays vertically centered
    if (this.gradientSprite) {
      this.gradientSprite.x = cameraX - 320;
    }

    for (const layer of this.imageLayers) {
      layer.container.x = (cameraX + this.offsetX) * (1 - layer.factor);
      layer.container.y = (cameraY + this.offsetY) * (1 - layer.factor);
    }
  }

  clear(): void {
    if (this.gradientSprite) {
      this.gradientSprite.destroy();
      this.gradientSprite = null;
    }
    this.gradientLayer.removeChildren();
    for (const layer of this.imageLayers) {
      layer.container.destroy({ children: true });
    }
    this.imageLayers = [];
  }

  destroy(): void {
    this.clear();
    this.container.destroy();
  }

  // ---------------------------------------------------------------------------
  // Image layer builder
  // ---------------------------------------------------------------------------

  private async addImageLayer(
    imageName: string,
    factor: number,
    levelW: number,
    levelH: number,
    entry: AreaPaletteEntry,
    paletteAtlas?: { texture: Texture; rowCount: number; row: number },
  ): Promise<void> {
    try {
      const tex = await Assets.load<Texture>(assetPath(`assets/parallax/${imageName}.png`));
      tex.source.scaleMode = 'nearest';
      tex.source.addressMode = 'repeat';

      const fitScale = (360 / tex.height) * 1.5;
      const tileW = Math.ceil(tex.width * fitScale);
      const tileH = Math.ceil(tex.height * fitScale);

      // TilingSprite handles infinite repeating — large enough to never show edges
      const coverW = Math.max(levelW * 6, 8000);
      const coverH = Math.max(levelH * 6, 8000);

      const ts = new TilingSprite({
        texture: tex,
        width: coverW,
        height: coverH,
      });
      ts.tileScale.set(fitScale, fitScale);
      ts.x = -coverW / 2;
      ts.y = -coverH / 2;

      const layerContainer = new Container();
      layerContainer.addChild(ts);

      if (paletteAtlas) {
        layerContainer.filters = [
          new PaletteSwapFilter({
            paletteTex: paletteAtlas.texture,
            rowCount: paletteAtlas.rowCount,
            row: paletteAtlas.row,
            strength: 1.0,
            depthBias: entry.depthBias ?? 0.35,
            depthCenter: entry.depthCenter ?? 0.5,
            brightness: entry.brightness,
            tint: entry.tint,
          }),
        ];
      }

      this.container.addChild(layerContainer);
      this.imageLayers.push({ container: layerContainer, factor });
    } catch {
      // Image not found — skip this layer
    }
  }

  // ---------------------------------------------------------------------------
  // Gradient texture
  // ---------------------------------------------------------------------------

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
      const screenY = y / (h - 1 || 1);
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
