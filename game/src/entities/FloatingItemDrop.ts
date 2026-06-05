/**
 * FloatingItemDrop.ts — 아이템계 최종 보스 처치 시 spawn 되는 *아이템* drop.
 *
 * Trapdoor (빛기둥) 의 대체. 사용자 시나리오 2026-05-25:
 *   "기둥이 아니라 아이템이 2배 확대되어 생성된다. 아이템은 둥실둥실 하고 있다."
 *
 * 인터랙션 인터페이스는 Trapdoor 와 동일 (isPlayerNear / activate / update / destroy)
 * 래퍼런스는 ItemWorldScene의 아이템월드 트랩도어 하강 런타임(TrapdoorFlow) 흐름에 맞춰
 * 동일 인터페이스만 보장하면 호환됩니다.
 *
 * 시각:
 *   - ItemImage (item.def.id 기반 sprite) 2× scale = 32px → 64px display
 *   - bottom-center 기준 anchor (Trapdoor 와 동일)
 *   - sin wave Y bobbing (±4px / 1.6s period)
 *   - 부드러운 오렌지 halo (rarity 색 무관, brand key #ffa41b 톤)
 */

import { Container, Graphics } from 'pixi.js';
import { ItemImage } from '@ui/ItemImage';
import type { ItemInstance } from '@items/ItemInstance';
import { destroyDisplayObject } from '../scenes/shared/DisplayObjectLifecycleHelpers';

const HALO_COLOR = 0xffa41b;
const BOB_AMPLITUDE_PX = 4;
const BOB_PERIOD_MS = 1600;
// 사용자 결정 2026-05-25: 아이콘 1:1 scale.
const ITEM_SIZE = 32;
const DISPLAY_SCALE = 1;
const PROXIMITY = 120;           // px (Trapdoor 와 동일)

export class FloatingItemDrop {
  container: Container;
  x: number;
  y: number;
  /** Trapdoor 와 width/height 인터페이스 — 디버그/AABB 호환. */
  width = ITEM_SIZE * DISPLAY_SCALE;
  height = ITEM_SIZE * DISPLAY_SCALE;

  active = true;
  consumed = false;

  private halo: Graphics;
  private inner: Container;     // ItemImage 마운트 + sin wave bobbing 대상
  private itemImage: ItemImage;
  private timer = 0;

  /**
   * @param x bottom-center 픽셀 좌표 X
   * @param y bottom-center 픽셀 좌표 Y (보스 룸 floor 라인)
   */
  constructor(x: number, y: number, item: ItemInstance) {
    this.x = x;
    this.y = y;
    this.container = new Container();
    this.container.x = x;
    this.container.y = y;

    // Halo — 아이템 뒤 부드러운 오렌지 광채. floating prop 강조.
    this.halo = new Graphics();
    this.container.addChild(this.halo);

    // Inner — bobbing 대상. ItemImage 마운트.
    this.inner = new Container();
    this.inner.scale.set(DISPLAY_SCALE);
    // ItemImage 좌상단 기준 (0,0) → display size 가 64×64 라 중앙 정렬을 위해
    // inner 의 x = -size, y = -size (bottom-center anchor).
    this.inner.x = -ITEM_SIZE;
    this.inner.y = -ITEM_SIZE * DISPLAY_SCALE;
    this.container.addChild(this.inner);

    this.itemImage = new ItemImage(item, ITEM_SIZE, false);
    this.inner.addChild(this.itemImage.container);

    this.drawHalo(0);
  }

  private drawHalo(tSec: number): void {
    const pulse = 0.75 + Math.sin(tSec * Math.PI * 2 * 0.6) * 0.25;
    const h = this.height;
    const w = this.width;
    this.halo.clear();
    // outer 부드러운 광채
    this.halo.circle(0, -h / 2, w * 0.9)
      .fill({ color: HALO_COLOR, alpha: 0.10 * pulse });
    this.halo.circle(0, -h / 2, w * 0.6)
      .fill({ color: HALO_COLOR, alpha: 0.16 * pulse });
  }

  update(dt: number): void {
    if (!this.active) return;
    this.timer += dt;
    const tSec = this.timer / 1000;

    // bobbing — sin wave Y offset 적용.
    const bob = Math.sin(this.timer / BOB_PERIOD_MS * Math.PI * 2) * BOB_AMPLITUDE_PX;
    this.inner.y = -ITEM_SIZE * DISPLAY_SCALE + bob;

    this.drawHalo(tSec);
  }

  isPlayerNear(px: number, py: number): boolean {
    if (!this.active || this.consumed) return false;
    const cx = this.x;
    const cy = this.y - this.height / 2;
    const dx = px - cx;
    const dy = py - cy;
    return dx * dx + dy * dy <= PROXIMITY * PROXIMITY;
  }

  activate(): void {
    if (this.consumed) return;
    this.consumed = true;
  }

  getAABB(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.x - this.width / 2,
      y: this.y - this.height,
      width: this.width,
      height: this.height,
    };
  }

  destroy(): void {
    this.itemImage.destroy();
    destroyDisplayObject(this.container, { children: true });
  }
}
