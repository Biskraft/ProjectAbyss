/**
 * Breakable.ts — *수동 배치* 가능한 파괴 가능 오브젝트.
 *
 * BreakableProp 와 파괴 동작은 동일 (1-hit, shatter, gold/flask drop) 하지만:
 *   - 절차 생성 X — LDtk Editor 에서 Entity 'Breakable' 직접 배치
 *   - 사용자가 `Sprite` String 필드에 스프라이트 파일명(.png 제외)을 입력
 *   - Pivot 은 *바닥 중앙* — 도로 표지·이정표·검 꽂힘 등 "땅에 박힌" 오브젝트 톤
 *
 * LDtk Entity 정의 (Editor 측 설정 필요):
 *   - Identifier: Breakable
 *   - Pivot: 0.5, 1 (bottom-center)
 *   - Field: Sprite (String) — assets/sprites/ 의 파일명(.png 제외). 예: signboard_save_01
 *
 * 신규 sprite 추가 절차:
 *   1) public/assets/sprites/{name}.png 추가
 *   2) LDtk Editor 의 Breakable.Sprite 에 같은 {name} 입력
 */

import { Assets, Container, Sprite, Texture } from 'pixi.js';
import type { AABB } from '@core/Physics';
import { assetPath } from '@core/AssetLoader';
import { destroyDisplayObject } from '../scenes/shared/DisplayObjectLifecycleHelpers';
import type { PropDrop } from './BreakableProp';

// PropShatter fleck 기본 색 (카탈로그 제거 후 공용 기본값).
const DEFAULT_BASE_COLOR = 0x8a6a4a;
const DEFAULT_ACCENT_COLOR = 0xddccaa;

// 텍스처 캐시 — 스프라이트 파일명(.png 제외)으로 assets/sprites/ 에서 직접 로드.
// 동일 스프라이트의 여러 인스턴스가 한 번만 로드된다.
const textureCache = new Map<string, Texture>();
const loadingPromises = new Map<string, Promise<Texture>>();

function loadBreakableTexture(spriteName: string): Promise<Texture> {
  const cached = textureCache.get(spriteName);
  if (cached) return Promise.resolve(cached);
  const inFlight = loadingPromises.get(spriteName);
  if (inFlight) return inFlight;
  const promise = (async () => {
    const tex = await Assets.load<Texture>(assetPath(`assets/sprites/${spriteName}.png`));
    tex.source.scaleMode = 'nearest';
    textureCache.set(spriteName, tex);
    return tex;
  })();
  loadingPromises.set(spriteName, promise);
  return promise;
}

export class Breakable {
  readonly container: Container;
  /** Sprite file name (without `.png`), loaded from assets/sprites/. */
  readonly spriteName: string;
  /** AABB 좌상단 — container.x 는 bottom-center 기준이라 별도 추적. */
  x: number;
  y: number;
  width = 0;
  height = 0;
  destroyed = false;

  private spriteNode: Sprite | null = null;

  /**
   * @param px LDtk px[0] — pivot (bottom-center) 의 X
   * @param py LDtk px[1] — pivot (bottom-center) 의 Y (= 바닥 라인)
   */
  constructor(px: number, py: number, spriteName: string) {
    this.spriteName = spriteName;
    this.x = px;
    this.y = py;

    this.container = new Container();
    // pivot 은 bottom-center — sprite 의 anchor 가 (0.5, 1) 이라
    // container.x = px, container.y = py 만 맞추면 정확히 위치.
    this.container.x = px;
    this.container.y = py;

    void this.loadSprite();
  }

  private async loadSprite(): Promise<void> {
    try {
      const tex = await loadBreakableTexture(this.spriteName);
      if (this.destroyed) return;
      const sp = new Sprite(tex);
      sp.anchor.set(0.5, 1);
      this.container.addChild(sp);
      this.spriteNode = sp;
      this.width = tex.frame.width;
      this.height = tex.frame.height;
      // AABB 좌상단 갱신 — bottom-center 에서 width/2 만큼 좌측, height 만큼 위쪽.
      this.x = this.container.x - this.width / 2;
      this.y = this.container.y - this.height;
    } catch {
      // 로드 실패 — 보이지 않는 placeholder. AABB 도 0 이라 충돌 없음.
    }
  }

  getAABB(): AABB {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }

  break(): PropDrop {
    if (this.destroyed) return { type: 'none', amount: 0 };
    this.destroyed = true;
    this.container.visible = false;
    return this.rollDrop();
  }

  /** PropShatter 의 fleck 색 (공용 기본 톤). */
  getParticleColor(): number {
    return DEFAULT_BASE_COLOR;
  }

  getAccentColor(): number {
    return DEFAULT_ACCENT_COLOR;
  }

  /** PropShatter 의 sprite-chunk 분할용 — 로드된 texture 또는 null. */
  getArtifactTexture(): Texture | null {
    return this.spriteNode?.texture ?? null;
  }

  update(_dt: number): void {
    // 정적 — 향후 sway / flicker 가 필요하면 여기에 추가.
  }

  destroy(): void {
    this.destroyed = true;
    destroyDisplayObject(this.container, { children: true });
  }

  /** Sprite 카탈로그 + drop 테이블 — 단순 gold weight. BreakableProp 와 동일 분포. */
  private rollDrop(): PropDrop {
    const roll = Math.floor(Math.random() * 100);
    if (roll < 50) return { type: 'none', amount: 0 };
    if (roll < 85) return { type: 'gold', amount: Math.max(1, Math.floor((1 + Math.floor(Math.random() * 3)) * 0.1)) };
    if (roll < 95) return { type: 'flask', amount: 1 };
    return { type: 'gold', amount: Math.max(1, Math.floor((3 + Math.floor(Math.random() * 5)) * 0.1)) };
  }
}
