/**
 * ItemImage.ts
 *
 * Sacred Pickup 공용 아이템 포트레이트.
 *   - LorePopup과 DivePreview에서 동일 이미지를 재사용하여 플레이어가
 *     획득 직후 본 실루엣을 다이브 직전에도 확인할 수 있도록 한다.
 *   - 규칙: assets/items/{defId}.png 가 존재하면 Sprite로 로드, 아니면
 *     레어리티 색상 기반 placeholder(테두리+내부 사각+대각 스트라이프)로 대체.
 *
 * 레이아웃은 LoreDisplay.ts의 portrait 규칙(정사각 + 1px 외곽선)을 따른다.
 */

import { Container, Graphics, Sprite, Texture, Assets } from 'pixi.js';
import { assetPath } from '@core/AssetLoader';
import { RARITY_COLOR, type ItemInstance } from '@items/ItemInstance';

const itemTextureCache = new Map<string, Texture>();

/**
 * 아이템 포트레이트 컨테이너. Sprite 로드 성공 시 자동 교체되며,
 * 실패 시 placeholder가 남는다.
 */
export class ItemImage {
  readonly container: Container;
  private border: Graphics;
  private placeholder: Graphics;
  private sprite: Sprite | null = null;
  private size: number;
  private rarityColor: number;
  private defId: string;

  constructor(item: ItemInstance, size = 48) {
    this.size = size;
    this.rarityColor = RARITY_COLOR[item.rarity];
    this.defId = item.def.id;

    this.container = new Container();

    // 1px 외곽선 — LoreDisplay portrait와 동일한 규칙.
    this.border = new Graphics();
    this.border.rect(-1, -1, size + 2, size + 2)
      .stroke({ color: 0x556677, width: 1 });
    this.container.addChild(this.border);

    // Placeholder: 레어리티 색 바탕 + 내부 사각 + 대각 stripe 2줄.
    this.placeholder = new Graphics();
    this.drawPlaceholder();
    this.container.addChild(this.placeholder);

    this.tryLoadSprite();
  }

  private drawPlaceholder(): void {
    const g = this.placeholder;
    g.clear();
    const s = this.size;
    const r = this.rarityColor;
    // 바탕.
    g.rect(0, 0, s, s).fill({ color: r, alpha: 0.35 });
    // 내부 사각.
    const inset = Math.floor(s * 0.18);
    g.rect(inset, inset, s - inset * 2, s - inset * 2).fill(r);
    // 하이라이트.
    const hi = Math.floor(s * 0.28);
    g.rect(hi, hi, s - hi * 2, s - hi * 2).fill({ color: 0xffffff, alpha: 0.25 });
    // 대각 stripe 2줄 (칼날 느낌의 암시).
    const bladeW = Math.max(1, Math.floor(s * 0.04));
    g.moveTo(inset, s - inset)
      .lineTo(s - inset, inset)
      .stroke({ color: 0xffffff, width: bladeW, alpha: 0.45 });
    g.moveTo(inset + 2, s - inset)
      .lineTo(s - inset, inset + 2)
      .stroke({ color: 0x000000, width: 1, alpha: 0.35 });
  }

  private tryLoadSprite(): void {
    const cached = itemTextureCache.get(this.defId);
    if (cached) {
      this.applyTexture(cached);
      return;
    }
    const path = assetPath(`assets/items/${this.defId}.png`);
    Assets.load(path)
      .then((tex: Texture) => {
        itemTextureCache.set(this.defId, tex);
        // 컨테이너가 이미 destroy된 경우 무시.
        if (!this.container.destroyed) this.applyTexture(tex);
      })
      .catch(() => {
        // placeholder 유지.
      });
  }

  private applyTexture(tex: Texture): void {
    this.placeholder.visible = false;
    const sprite = new Sprite(tex);
    sprite.width = this.size;
    sprite.height = this.size;
    this.sprite = sprite;
    this.container.addChild(sprite);
  }

  destroy(): void {
    if (this.container.parent) this.container.parent.removeChild(this.container);
    this.container.destroy({ children: true });
  }
}
