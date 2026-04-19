/**
 * LorePopup.ts
 *
 * Sacred Pickup S3 — 아이템 획득 직후 한 번만 노출되는 lore 모달.
 *
 * 트리거 규칙:
 *   - `!save.hasSeenItem(defId)` 이거나 settings.alwaysShowLore === true
 *   - 닫기는 [X] 키만 (ESC 비활성). 닫으면 markItemSeen() + 저장.
 *
 * 레이아웃:
 *   - 중앙 모달, 오버레이 #000000 alpha 0.6
 *   - 무기 스프라이트 48×48 / 이름 12px / Lore 2줄 8px #ccccdd / 스탯 / "Memory Strata: N" / "[X] CLOSE"
 *
 * 통합:
 *   - WorldScene 쪽에서 pickup 시 `LorePopup.showIfNew(item, ...)` 호출
 *   - popup.visible 시 플레이어 입력을 막는 쪽에서 isBlocking() 사용
 */

import { Container, Graphics, BitmapText } from 'pixi.js';
import { PIXEL_FONT } from './fonts';
import { KeyPrompt } from './KeyPrompt';
import { ItemImage } from './ItemImage';
import { RARITY_COLOR, type ItemInstance } from '@items/ItemInstance';
import { RARITY_DISPLAY_NAME } from '@data/weapons';
import { GAME_WIDTH, GAME_HEIGHT } from '../Game';
import { sacredSave, getWeaponLore } from '@save/PlayerSave';

/** 레어리티별 기억의 지층 개수 — GDD §레어리티 체계 기준. */
const STRATA_BY_RARITY: Record<string, number> = {
  normal: 2,
  magic: 3,
  rare: 3,
  legendary: 4,
  ancient: 4,
};

/**
 * 팝업이 표시된 직후 X 연타로 즉시 스킵되지 않도록 입력을 잠그는 시간(ms).
 * "아이템 획득은 중요한 튜토리얼 순간" 원칙 — 플레이어가 팝업을 인지할 여유를
 * 강제로 확보한다.
 *
 *  - FIRST: 처음 보는 아이템 → 1초 (lore 인지 강제).
 *  - REPEAT: 이미 본 아이템(= alwaysShowLore 옵션으로 재표시) → 0.3초 만
 *            — 반복 확인 시 연타 방지만 하고 흐름을 끊지 않는다.
 */
const INPUT_LOCK_FIRST_MS = 1000;
const INPUT_LOCK_REPEAT_MS = 300;

/** 잠금 중 [X] CLOSE 프롬프트의 dim 알파. */
const PROMPT_DIM_ALPHA = 0.3;
/** 잠금 해제 시 프롬프트 기본 알파. */
const PROMPT_NORMAL_ALPHA = 1.0;

export class LorePopup {
  readonly container: Container;
  private overlay: Graphics;
  private panel: Container;
  private visible_ = false;
  private onClose: (() => void) | null = null;
  /** 남은 입력 잠금 시간(ms). 0 이하면 X 입력 허용. */
  private inputLockMs = 0;
  /** 이번 show() 에서 설정한 총 잠금 길이(ms). 프로그레스 아크 비율 계산용. */
  private totalLockMs = INPUT_LOCK_FIRST_MS;

  // [X] CLOSE 프롬프트 — dim/arc 갱신을 위해 참조를 저장.
  private closePrompt: Container | null = null;
  private closeLabel: BitmapText | null = null;
  /** 프롬프트 주변에 그려지는 잠금 프로그레스 아크 (wipe ring). */
  private closeRing: Graphics | null = null;
  /** closePrompt 아이콘 크기 — 링 반경 산출에 사용. */
  private closePromptSize = 10;

  constructor() {
    this.container = new Container();
    this.container.visible = false;

    this.overlay = new Graphics();
    this.overlay.rect(0, 0, GAME_WIDTH, GAME_HEIGHT).fill({ color: 0x000000, alpha: 0.6 });
    this.container.addChild(this.overlay);

    this.panel = new Container();
    this.container.addChild(this.panel);
  }

  /** 현재 입력을 가로채는 상태인지. */
  isBlocking(): boolean {
    return this.visible_;
  }

  /** X 키 연타로 즉시 닫히지 않도록 초반 입력 잠금이 남아있는지. */
  canConfirm(): boolean {
    return this.visible_ && this.inputLockMs <= 0;
  }

  /** Scene update 루프에서 매 프레임 호출해 잠금 타이머 + 프롬프트 시각 갱신. */
  update(dt: number): void {
    if (!this.visible_) return;
    if (this.inputLockMs > 0) {
      this.inputLockMs -= dt;
      if (this.inputLockMs < 0) this.inputLockMs = 0;
    }
    this.refreshPromptVisuals();
  }

  /**
   * 잠금 상태에 따라 [X] CLOSE 프롬프트 dim + wipe-ring 갱신.
   * 잠금 중: alpha 0.3 + 시계 방향으로 차오르는 원형 링.
   * 해제 시: alpha 1.0 + 링 clear.
   */
  private refreshPromptVisuals(): void {
    const locked = this.inputLockMs > 0;
    const alpha = locked ? PROMPT_DIM_ALPHA : PROMPT_NORMAL_ALPHA;
    if (this.closePrompt) this.closePrompt.alpha = alpha;
    if (this.closeLabel) this.closeLabel.alpha = alpha;

    const ring = this.closeRing;
    if (!ring) return;
    ring.clear();
    if (!locked || this.totalLockMs <= 0) return;

    // 아이콘 중심에 외접 링. 반경은 아이콘 크기의 0.85배 (약간 여유).
    const size = this.closePromptSize;
    const cx = size / 2;
    const cy = size / 2;
    const radius = size * 0.85;
    // progress 0 → 1 로 증가 (시간이 지날수록 링이 차오름).
    const progress = 1 - this.inputLockMs / this.totalLockMs;
    const start = -Math.PI / 2;
    const end = start + progress * Math.PI * 2;
    ring.arc(cx, cy, radius, start, end)
      .stroke({ color: 0xffcc44, width: 1, alpha: 0.8 });
  }

  /**
   * 아이템이 새로 보이는 것이거나 옵션이 켜져 있으면 표시.
   * 이미 본 아이템이고 옵션도 꺼져있으면 no-op하여 false 반환.
   *
   * @returns true = 팝업을 띄움, false = 스킵
   */
  showIfNew(item: ItemInstance, onClose?: () => void): boolean {
    const mustShow = !sacredSave.hasSeenItem(item.def.id) || sacredSave.getSettings().alwaysShowLore;
    if (!mustShow) return false;
    this.show(item, onClose);
    return true;
  }

  /** 강제 표시 (lore 확인용 UI 등). */
  show(item: ItemInstance, onClose?: () => void): void {
    this.onClose = onClose ?? null;
    this.drawPanel(item);
    this.visible_ = true;
    this.container.visible = true;
    // 처음 보는 아이템은 1초, 이미 본 아이템(알림 반복 모드)은 0.3초만 잠금.
    const isFirstView = !sacredSave.hasSeenItem(item.def.id);
    const duration = isFirstView ? INPUT_LOCK_FIRST_MS : INPUT_LOCK_REPEAT_MS;
    this.inputLockMs = duration;
    this.totalLockMs = duration;
    this.refreshPromptVisuals();
  }

  close(): void {
    if (!this.visible_) return;
    this.visible_ = false;
    this.container.visible = false;
    const cb = this.onClose;
    this.onClose = null;
    if (cb) cb();
  }

  /** Confirm(X) 키 처리. 호출 측에서 입력 체크 후 호출. */
  confirm(item: ItemInstance): void {
    sacredSave.markItemSeen(item.def.id);
    this.close();
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private drawPanel(item: ItemInstance): void {
    // 기존 패널 내용 초기화.
    for (const child of [...this.panel.children]) {
      this.panel.removeChild(child);
      child.destroy?.({ children: true });
    }

    const W = 260;
    const H = 150;
    const px = Math.floor((GAME_WIDTH - W) / 2);
    const py = Math.floor((GAME_HEIGHT - H) / 2);

    const bg = new Graphics();
    bg.rect(0, 0, W, H).fill({ color: 0x1a1a2e, alpha: 0.96 });
    bg.rect(0, 0, W, H).stroke({ color: RARITY_COLOR[item.rarity], width: 1 });
    bg.x = px;
    bg.y = py;
    this.panel.addChild(bg);

    // 아이템 포트레이트 48x48 — LoreDisplay portrait 규칙 준수.
    const rColor = RARITY_COLOR[item.rarity];
    const image = new ItemImage(item, 48);
    image.container.x = px + 12;
    image.container.y = py + 14;
    this.panel.addChild(image.container);

    // 이름 (12px)
    const nameText = new BitmapText({
      text: item.def.name,
      style: { fontFamily: PIXEL_FONT, fontSize: 12, fill: rColor },
    });
    nameText.x = px + 72;
    nameText.y = py + 14;
    this.panel.addChild(nameText);

    // 레어리티 뱃지
    const rarityText = new BitmapText({
      text: RARITY_DISPLAY_NAME[item.rarity].toUpperCase(),
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: rColor },
    });
    rarityText.x = px + 72;
    rarityText.y = py + 28;
    this.panel.addChild(rarityText);

    // Lore 2줄 (8px)
    const lore = getWeaponLore(item.def.id, item.def.name, item.rarity);
    let ly = py + 44;
    for (const line of lore) {
      const t = new BitmapText({
        text: line,
        style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xccccdd },
      });
      t.x = px + 72;
      t.y = ly;
      this.panel.addChild(t);
      ly += 10;
    }

    // 구분선
    const div = new Graphics();
    div.rect(px + 12, py + 72, W - 24, 1).fill({ color: 0x3a3a4e, alpha: 1 });
    this.panel.addChild(div);

    // 스탯
    const statLine = `ATK ${item.finalAtk}   Lv.${item.level}`;
    const stat = new BitmapText({
      text: statLine,
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xffffff },
    });
    stat.x = px + 12;
    stat.y = py + 80;
    this.panel.addChild(stat);

    // Memory Strata
    const strata = STRATA_BY_RARITY[item.rarity] ?? 2;
    const strataText = new BitmapText({
      text: `Memory Strata: ${strata} Floors`,
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0x88ccff },
    });
    strataText.x = px + 12;
    strataText.y = py + 94;
    this.panel.addChild(strataText);

    // [X] CLOSE 프롬프트 (+ 입력 잠금 프로그레스 링).
    const iconSize = 10;
    const closePrompt = KeyPrompt.createKeyIcon('X', iconSize);
    closePrompt.x = px + W - 72;
    closePrompt.y = py + H - 18;
    this.panel.addChild(closePrompt);

    // 잠금 wipe-ring — closePrompt 위에 자식으로 얹어 좌표를 공유.
    const closeRing = new Graphics();
    closePrompt.addChild(closeRing);

    const closeLabel = new BitmapText({
      text: 'CLOSE',
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xaaaaaa },
    });
    closeLabel.x = px + W - 58;
    closeLabel.y = py + H - 16;
    this.panel.addChild(closeLabel);

    // update() 가 dim/arc 을 갱신할 수 있도록 참조 캐시.
    this.closePrompt = closePrompt;
    this.closeLabel = closeLabel;
    this.closeRing = closeRing;
    this.closePromptSize = iconSize;
  }

  destroy(): void {
    if (this.container.parent) this.container.parent.removeChild(this.container);
    this.container.destroy({ children: true });
  }
}
