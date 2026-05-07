/**
 * Building.ts — LDtk Entity 'Building' 시각 데코.
 *
 * 한 sprite sheet 안의 여러 building 중 사용자가 LDtk Entity Editor 의
 * tile picker 로 선택한 사각형(__tile)을 그대로 표시한다. 충돌 없음.
 *
 * LDtk Entity 정의 (Editor 측):
 *   - Identifier: Building
 *   - Pivot: 0.5, 1 (bottom-center 권장 — 바닥 라인 정렬)
 *   - Tileset: itemstrata_town_01 같은 멀티-건물 시트
 *   - 각 인스턴스에서 tile picker 로 사각형 선택
 */

import { Assets, Container, Rectangle, Sprite, Texture } from 'pixi.js';
import { assetPath } from '@core/AssetLoader';

const textureCache = new Map<string, Texture>();
const loadingPromises = new Map<string, Promise<Texture>>();

function loadBuildingTexture(relPath: string): Promise<Texture> {
  const cached = textureCache.get(relPath);
  if (cached) return Promise.resolve(cached);
  const inFlight = loadingPromises.get(relPath);
  if (inFlight) return inFlight;
  const promise = (async () => {
    const tex = await Assets.load<Texture>(assetPath(`assets/${relPath}`));
    tex.source.scaleMode = 'nearest';
    textureCache.set(relPath, tex);
    return tex;
  })();
  loadingPromises.set(relPath, promise);
  return promise;
}

export class Building {
  readonly container: Container;
  destroyed = false;
  private spriteNode: Sprite | null = null;

  /**
   * @param px LDtk px[0] — pivot X (bottom-center 가정)
   * @param py LDtk px[1] — pivot Y (= 바닥 라인)
   * @param tilesetRelPath LDtk entity tile 의 tilesetPath (예: "sprites/itemstrata_town_01.png")
   * @param srcX  시트 안의 사각형 좌상단 X
   * @param srcY  시트 안의 사각형 좌상단 Y
   * @param srcW  사각형 너비
   * @param srcH  사각형 높이
   */
  constructor(
    px: number,
    py: number,
    tilesetRelPath: string,
    srcX: number,
    srcY: number,
    srcW: number,
    srcH: number,
  ) {
    this.container = new Container();
    this.container.x = px;
    this.container.y = py;
    void this.loadSprite(tilesetRelPath, srcX, srcY, srcW, srcH);
  }

  private async loadSprite(
    relPath: string,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
  ): Promise<void> {
    try {
      const tex = await loadBuildingTexture(relPath);
      if (this.destroyed) return;
      const frame = new Texture({
        source: tex.source,
        frame: new Rectangle(sx, sy, sw, sh),
      });
      const sp = new Sprite(frame);
      sp.anchor.set(0.5, 1);
      this.spriteNode = sp;
      this.container.addChild(sp);
    } catch (e) {
      console.warn(`[Building] failed to load tileset "${relPath}":`, e);
    }
  }

  destroy(): void {
    this.destroyed = true;
    if (this.spriteNode) {
      this.spriteNode.destroy();
      this.spriteNode = null;
    }
    this.container.destroy({ children: true });
  }
}
