/**
 * ParallaxBackground — 4-layer parallax: gradient + far + mid + near.
 *
 * Sits behind all LDtk layers. Each image layer scrolls at an independent
 * factor relative to the camera. Gradient is baked from CSV palette stops.
 */

import { Container, Sprite, Texture, Assets, Rectangle } from 'pixi.js';
import { assetPath } from '@core/AssetLoader';
import { sampleRow, unpack } from '@effects/PaletteSwapFilter';
import { PaletteSwapFilter } from '@effects/PaletteSwapFilter';
import type { AreaPaletteEntry } from '@data/areaPalettes';
import { GAME_WIDTH, GAME_HEIGHT } from '../Game';
import { ParallaxConst } from '@data/constData';
import { destroyDisplayObject } from '../scenes/shared/DisplayObjectLifecycleHelpers';

interface ImageLayerState {
  container: Container;
  sprites: Sprite[];
  factor: number;
  baseScale: number;
  tileW: number;
  tileH: number;
  cols: number;
  rows: number;
}

// Margin around viewport so the parallax fully covers all subpixel positions.
const VIEW_MARGIN = 64;
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
    opts?: { nearNativeScale?: boolean },
  ): Promise<void> {
    this.clear();

    // L0: Vertical gradient — oversized to survive room transitions.
    // Width covers viewport (repositioned each frame), height covers max world.
    const gradW = GAME_WIDTH;
    const gradH = GAME_HEIGHT;
    const gradTex = this.buildGradientTexture(entry, gradH);
    this.gradientSprite = new Sprite(gradTex);
    this.gradientSprite.width = gradW;
    this.gradientSprite.height = gradH;
    this.gradientSprite.x = 0;
    this.gradientSprite.y = 0;
    this.gradientLayer.addChild(this.gradientSprite);

    // L1: Far image
    if (entry.parallaxImage) {
      await this.addImageLayer(
        entry.parallaxImage,
        entry.parallaxFactor || ParallaxConst.FactorFar,
        levelW, levelH, entry, paletteAtlas,
      );
    }

    // L2: Mid image
    if (entry.parallaxImageMid) {
      await this.addImageLayer(
        entry.parallaxImageMid,
        entry.parallaxFactorMid || ParallaxConst.FactorMid,
        levelW, levelH, entry, paletteAtlas,
      );
    }

    // L3: Near image. nearNativeScale renders it 1:1 (scale 1.0) so a
    // full-screen-sized backdrop (e.g. prologue 640x360) maps pixel-for-pixel
    // instead of the default 1.5x fit zoom.
    if (entry.parallaxImageNear) {
      await this.addImageLayer(
        entry.parallaxImageNear,
        entry.parallaxFactorNear || ParallaxConst.FactorNear,
        levelW, levelH, entry, paletteAtlas,
        opts?.nearNativeScale ? 1.0 : undefined,
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

    // Gradient is fixed in screen space.
    if (this.gradientSprite) {
      this.gradientSprite.x = 0;
      this.gradientSprite.y = 0;
    }

    // Layers live in a fixed screen-space background render target. We move a
    // small grid of normal Sprites instead of using TilingSprite/repeat sampler:
    // that path can expose opaque square artifacts in shipping browser builds.
    for (const layer of this.imageLayers) {
      const px = cameraX + this.offsetX;
      const py = cameraY + this.offsetY;
      const tx = -px * layer.factor;
      const ty = -py * layer.factor;
      const startX = -VIEW_MARGIN - layer.tileW + this.wrapOffset(tx, layer.tileW);
      const startY = -VIEW_MARGIN - layer.tileH + this.wrapOffset(ty, layer.tileH);

      let i = 0;
      for (let row = 0; row < layer.rows; row++) {
        for (let col = 0; col < layer.cols; col++) {
          const sprite = layer.sprites[i++];
          if (sprite.scale.x !== layer.baseScale || sprite.scale.y !== layer.baseScale) {
            sprite.scale.set(layer.baseScale, layer.baseScale);
          }
          sprite.x = startX + col * layer.tileW;
          sprite.y = startY + row * layer.tileH;
        }
      }
    }
  }

  clear(): void {
    if (this.gradientSprite) {
      this.gradientSprite.destroy();
      this.gradientSprite = null;
    }
    this.gradientLayer.removeChildren();
    for (const layer of this.imageLayers) {
      destroyDisplayObject(layer.container, { children: true });
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
    scaleOverride?: number,
  ): Promise<void> {
    try {
      const tex = await Assets.load<Texture>(assetPath(`assets/parallax/${imageName}.png`));
      tex.source.scaleMode = 'nearest';
      tex.source.addressMode = 'clamp-to-edge';
      tex.source.style.update();

      const fitScale = scaleOverride ?? (360 / tex.height) * 1.5;
      const tileW = Math.max(1, tex.width * fitScale);
      const tileH = Math.max(1, tex.height * fitScale);

      const spriteW = GAME_WIDTH + VIEW_MARGIN * 2;
      const spriteH = GAME_HEIGHT + VIEW_MARGIN * 2;
      const cols = Math.ceil(spriteW / tileW) + 2;
      const rows = Math.ceil(spriteH / tileH) + 2;

      const sprites: Sprite[] = [];
      const layerContainer = new Container();
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const sprite = new Sprite(tex);
          sprite.scale.set(fitScale, fitScale);
          sprite.x = -VIEW_MARGIN - tileW + col * tileW;
          sprite.y = -VIEW_MARGIN - tileH + row * tileH;
          sprites.push(sprite);
          layerContainer.addChild(sprite);
        }
      }

      if (paletteAtlas) {
        layerContainer.filterArea = new Rectangle(-VIEW_MARGIN, -VIEW_MARGIN, spriteW, spriteH);
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
      this.imageLayers.push({
        container: layerContainer,
        sprites,
        factor,
        baseScale: fitScale,
        tileW,
        tileH,
        cols,
        rows,
      });
    } catch {
      // Image not found — skip this layer
    }
  }

  private wrapOffset(value: number, period: number): number {
    return ((value % period) + period) % period;
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
