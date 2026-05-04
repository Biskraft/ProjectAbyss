/**
 * Breakable.ts — *수동 배치* 가능한 파괴 가능 오브젝트.
 *
 * BreakableProp 와 파괴 동작은 동일 (1-hit, shatter, gold/flask drop) 하지만:
 *   - 절차 생성 X — LDtk Editor 에서 Entity 'Breakable' 직접 배치
 *   - 사용자가 `Sprite` enum 필드로 카탈로그에서 스프라이트 선택
 *   - Pivot 은 *바닥 중앙* — 도로 표지·이정표·검 꽂힘 등 "땅에 박힌" 오브젝트 톤
 *
 * LDtk Entity 정의 (Editor 측 설정 필요):
 *   - Identifier: Breakable
 *   - Pivot: 0.5, 1 (bottom-center)
 *   - Field: Sprite (enum, 카탈로그 ID 중 하나) — 기본 SignBoard_Save
 *
 * 신규 sprite 추가 절차:
 *   1) public/assets/sprites/{name}.png 추가
 *   2) BREAKABLE_CATALOG 에 ID → path 매핑 추가
 *   3) LDtk Editor 의 Sprite enum 에 같은 ID 추가
 */

import { Assets, Container, Sprite, Texture } from 'pixi.js';
import type { AABB } from '@core/Physics';
import { assetPath } from '@core/AssetLoader';
import type { PropDrop } from './BreakableProp';

/**
 * 카탈로그 — 사용자가 LDtk Editor 에서 선택할 수 있는 스프라이트 목록.
 * ID 는 LDtk Sprite enum 의 값과 일치해야 함.
 */
export const BREAKABLE_CATALOG = {
  /** 1번 — 세이브 표지판 (Pole + 메모지). */
  SignBoard_Save: {
    path: 'assets/sprites/signboard_save_01.png',
    /** 기본 색 (shatter color flecks 용 — 텍스처 평균에 가까운 톤). */
    baseColor: 0x8a6a4a,
    accentColor: 0xddccaa,
  },
} as const;

export type BreakableSpriteId = keyof typeof BREAKABLE_CATALOG;

/** 카탈로그 ID 검증 — LDtk 에서 잘못된 enum 값이 들어와도 fallback. */
export function isBreakableSpriteId(s: string): s is BreakableSpriteId {
  return s in BREAKABLE_CATALOG;
}

// 텍스처 캐시 — 동일 스프라이트의 여러 인스턴스가 한 번만 로드.
const textureCache = new Map<BreakableSpriteId, Texture>();
const loadingPromises = new Map<BreakableSpriteId, Promise<Texture>>();

function loadBreakableTexture(id: BreakableSpriteId): Promise<Texture> {
  const cached = textureCache.get(id);
  if (cached) return Promise.resolve(cached);
  const inFlight = loadingPromises.get(id);
  if (inFlight) return inFlight;
  const promise = (async () => {
    const tex = await Assets.load<Texture>(assetPath(BREAKABLE_CATALOG[id].path));
    tex.source.scaleMode = 'nearest';
    textureCache.set(id, tex);
    return tex;
  })();
  loadingPromises.set(id, promise);
  return promise;
}

export class Breakable {
  readonly container: Container;
  readonly spriteId: BreakableSpriteId;
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
  constructor(px: number, py: number, spriteId: BreakableSpriteId) {
    this.spriteId = spriteId;
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
      const tex = await loadBreakableTexture(this.spriteId);
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

  /** PropShatter 의 fleck 색 (texture 평균과 비슷한 톤). */
  getParticleColor(): number {
    return BREAKABLE_CATALOG[this.spriteId].baseColor;
  }

  getAccentColor(): number {
    return BREAKABLE_CATALOG[this.spriteId].accentColor;
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
    if (this.container.parent) this.container.parent.removeChild(this.container);
    this.container.destroy({ children: true });
  }

  /** Sprite 카탈로그 + drop 테이블 — 단순 gold weight. BreakableProp 와 동일 분포. */
  private rollDrop(): PropDrop {
    const roll = Math.floor(Math.random() * 100);
    if (roll < 50) return { type: 'none', amount: 0 };
    if (roll < 85) return { type: 'gold', amount: 1 + Math.floor(Math.random() * 3) };
    if (roll < 95) return { type: 'flask', amount: 1 };
    return { type: 'gold', amount: 3 + Math.floor(Math.random() * 5) };
  }
}
