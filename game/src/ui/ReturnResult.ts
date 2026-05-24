/**
 * ReturnResult — Item World dive completion screen.
 *
 * Shows: item level changes, stat deltas, innocents captured, strata progress.
 * Death variant shows losses with strikethrough.
 */

import { Container, Graphics, BitmapText, Text } from 'pixi.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../Game';
import { PIXEL_FONT } from './fonts';
import { createUiText } from './factories';
import { t } from '@i18n';
import { RARITY_COLOR, type ItemInstance, getDisplayName, getIdentityCategory } from '@items/ItemInstance';
import { getStageFragment } from '@data/fragments';
import { RARITY_DISPLAY_NAME } from '@data/weapons';
import { MODAL_BG, MODAL_BG_ALPHA, MODAL_OVERLAY, MODAL_OVERLAY_ALPHA, MODAL_BORDER, MODAL_BORDER_W, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_POSITIVE, TEXT_NEGATIVE, TEXT_ACCENT, TEXT_GOLD, FONT_TITLE, FONT_HINT, createModalPanel } from './ModalPanel';
import { GameAction, actionKey } from '@core/InputManager';
import type { UISkin } from './UISkin';

const PANEL_W = 400;
const PANEL_H = 260;
const PANEL_X = Math.floor((GAME_WIDTH - PANEL_W) / 2);
const PANEL_Y = Math.floor((GAME_HEIGHT - PANEL_H) / 2);

// Death modal — 사망 시 패널티 없는 현 스펙에 맞춰 ModalPanel 표준 (title +
// divider + body + hint) 의 작은 모달. 거짓된 stat-loss / strata-table 제거.
const DEATH_PANEL_W = 260;
const DEATH_PANEL_H = 110;

const COL_BG = MODAL_BG;
const COL_BORDER = MODAL_BORDER;
const COL_TEXT = TEXT_PRIMARY;
const COL_DIM = TEXT_SECONDARY;
const COL_POSITIVE = TEXT_POSITIVE;
const COL_NEGATIVE = TEXT_NEGATIVE;
const COL_GOLD = TEXT_GOLD;
const COL_NEUTRAL = 0x666666;

export interface DiveResult {
  item: ItemInstance;
  prevLevel: number;
  prevAtk: number;
  goldEarned: number;
  enemiesDefeated: number;
  innocentsCaptured: number;
  strataCleared: number;
  totalStrata: number;
  isDeath: boolean;
}

export class ReturnResult {
  readonly container: Container;
  visible = false;
  private panel: Container;
  private inputReady = false;
  private inputTimer = 0;
  private skin: UISkin | null = null;

  onDismiss: (() => void) | null = null;

  /** UI native 마이그레이션 1단계: uiContainer(scale=1) 직속 마운트용 자체 scale. */
  constructor(skin?: UISkin | null, uiScale: number = 1) {
    this.skin = skin ?? null;
    this.container = new Container();
    this.container.scale.set(uiScale);
    this.container.visible = false;

    this.panel = new Container();
    this.container.addChild(this.panel);
  }

  show(result: DiveResult): void {
    this.visible = true;
    this.container.visible = true;
    this.inputReady = false;
    this.inputTimer = 0;
    this.draw(result);
  }

  hide(): void {
    this.visible = false;
    this.container.visible = false;
  }

  update(dt: number): void {
    if (!this.visible) return;
    this.inputTimer += dt;
    if (this.inputTimer > 1000) this.inputReady = true;
  }

  confirm(): void {
    if (!this.inputReady) return;
    this.hide();
    this.onDismiss?.();
  }

  private draw(r: DiveResult): void {
    if (r.isDeath) {
      this.drawDeath();
      return;
    }
    this.drawSuccess(r);
  }

  /**
   * Death modal — 사망 시 패널티 없는 현 스펙 (2026-05-05) 에 맞춘 미니멀 패널.
   * ModalPanel 표준 구성 (title + divider + body + hint). 거짓 stat-loss /
   * strata-table 제거.
   */
  private drawDeath(): void {
    this.container.removeChildren();

    const { overlay, panel } = createModalPanel(this.skin, DEATH_PANEL_W, DEATH_PANEL_H);
    this.container.addChild(overlay);
    this.panel = panel;
    this.container.addChild(this.panel);

    let y = 14;

    // Title — BitmapText (글리프, alloc 절감). 사용자 결정 2026-05-25.
    const titleText = new BitmapText({
      text: t('ui.return.death_title'),
      style: { fontFamily: PIXEL_FONT, fontSize: FONT_TITLE, fill: COL_NEGATIVE },
    });
    titleText.x = Math.floor((DEATH_PANEL_W - titleText.width) / 2);
    titleText.y = y;
    this.panel.addChild(titleText);
    y += 18;

    // Divider
    const div = new Graphics();
    div.moveTo(12, y).lineTo(DEATH_PANEL_W - 12, y).stroke({ width: 1, color: COL_BORDER });
    this.panel.addChild(div);
    y += 10;

    // Body — BitmapText.
    const bodyText = new BitmapText({
      text: t('ui.return.death_body'),
      style: { fontFamily: PIXEL_FONT, fontSize: FONT_HINT, fill: COL_DIM },
    });
    bodyText.x = Math.floor((DEATH_PANEL_W - bodyText.width) / 2);
    bodyText.y = y;
    this.panel.addChild(bodyText);

    // Hint — BitmapText.
    const hintText = new BitmapText({
      text: t('ui.return.continue_hint', { key: actionKey(GameAction.ATTACK) }),
      style: { fontFamily: PIXEL_FONT, fontSize: FONT_HINT, fill: TEXT_ACCENT },
    });
    hintText.x = Math.floor((DEATH_PANEL_W - hintText.width) / 2);
    hintText.y = DEATH_PANEL_H - 18;
    this.panel.addChild(hintText);
  }

  /** Success modal — 기존 dive complete 결과 (대규모 패널). */
  private drawSuccess(r: DiveResult): void {
    this.container.removeChildren();

    const { overlay, panel } = createModalPanel(this.skin, PANEL_W, PANEL_H);
    this.container.addChild(overlay);
    this.panel = panel;
    this.container.addChild(this.panel);

    let y = 12;

    // Title
    const titleText = createUiText(t('ui.return.success_title'), { fontSize: FONT_TITLE, fill: COL_TEXT });
    titleText.x = Math.floor((PANEL_W - titleText.width) / 2);
    titleText.y = y;
    this.panel.addChild(titleText);
    y += 18;

    // Divider
    this.addDivider(y); y += 6;

    // === DEC-046 A LIFE RECOVERED 섹션 ===
    const rarityColor = RARITY_COLOR[r.item.rarity] ?? COL_TEXT;
    const displayName = getDisplayName(r.item);
    const category = getIdentityCategory(r.item);

    // 진명/현재 이름 + 카테고리
    this.addText(displayName, 16, y, rarityColor, 9); y += 12;
    if (category !== 'Unknown' && category !== 'Tutorial' && category !== 'LoreWeapon') {
      const categoryKey = `ui.category.${category.replace(/([A-Z])/g, '_$1').replace(/^_/, '').toLowerCase()}`;
      this.addText(t(categoryKey), 16, y, COL_DIM, FONT_HINT);
      y += 12;
    }

    // Recovery 변화
    const prevRecovery = Math.max(0, Math.min(100, r.prevLevel * 10));  // legacy level → recovery 환산
    const currRecovery = Math.floor(r.item.memoryRecovery);
    if (currRecovery > prevRecovery) {
      this.addText(t('ui.return.recovery_change', { prev: prevRecovery, curr: currRecovery }), 16, y, COL_GOLD, FONT_HINT);
    } else {
      this.addText(t('ui.return.recovery_current', { curr: currRecovery }), 16, y, COL_DIM, FONT_HINT);
    }
    y += 12;

    this.addDivider(y); y += 6;

    // === MEMORY FRAGMENTS RECOVERED 섹션 ===
    this.addText(t('ui.return.fragments_header'), 16, y, COL_DIM, FONT_HINT); y += 12;

    const stagesForRarity =
      r.item.rarity === 'normal' ? [4]
      : r.item.rarity === 'magic' ? [2, 4]
      : r.item.rarity === 'rare' ? [1, 2, 4]
      : [1, 2, 3, 4];

    let fragmentLinesShown = 0;
    for (const stage of stagesForRarity) {
      if (fragmentLinesShown >= 4) break;
      const fragId = `${r.item.def.id}_stage_${stage}`;
      const isUnlocked = r.item.unlockedFragments.includes(fragId);
      const f = getStageFragment(r.item.def.id, stage);
      const isFire = stage === 4 && isUnlocked;
      if (isUnlocked && f) {
        const text = `▸ "${(f.textKo || f.textEn).slice(0, 52)}${(f.textKo || f.textEn).length > 52 ? '…' : ''}"`;
        this.addText(text, 16, y, isFire ? COL_GOLD : COL_TEXT, isFire ? FONT_HINT : FONT_HINT);
      } else {
        this.addText(t('ui.inventory.fragment_placeholder'), 16, y, 0x555555, FONT_HINT);
      }
      y += 12;
      fragmentLinesShown++;
    }

    this.addDivider(y); y += 6;

    // === STAT CHANGES (수치는 부산물 — 작게 표시) ===
    const atkDelta = r.item.finalAtk - r.prevAtk;
    const atkColor = atkDelta > 0 ? COL_POSITIVE : atkDelta < 0 ? COL_NEGATIVE : COL_NEUTRAL;
    const atkSign = atkDelta > 0 ? '+' : '';
    const atkLabel = `ATK ${r.prevAtk} → ${r.item.finalAtk}${atkDelta !== 0 ? ` (${atkSign}${atkDelta})` : ''}`;
    this.addText(atkLabel, 16, y, atkColor, FONT_HINT);
    y += 14;

    this.addDivider(y); y += 6;

    // STRATA PROGRESS — 압축 한 줄 표시 (Recovery 게이지로 흡수)
    this.addText(t('ui.return.strata_summary', { cleared: r.strataCleared, total: r.totalStrata }), 16, y, COL_DIM, FONT_HINT);
    y += 14;

    this.addDivider(y); y += 6;

    // LOOT
    this.addText(t('ui.return.gold_earned', { amount: r.goldEarned.toLocaleString() }), 16, y, COL_DIM, FONT_HINT); y += 10;
    this.addText(t('ui.return.enemies_defeated', { count: r.enemiesDefeated }), 16, y, COL_DIM, FONT_HINT); y += 14;

    // Action
    this.addText(t('ui.return.continue_hint', { key: actionKey(GameAction.ATTACK) }), Math.floor((PANEL_W - 100) / 2), PANEL_H - 20, TEXT_ACCENT, FONT_HINT);
  }

  private addText(text: string, x: number, y: number, color: number, fontSize: number): BitmapText | Text {
    // wordWrap with the remaining panel width as budget — KO build's wider
    // Noto Sans KR latin metrics can otherwise spill long stat / boss lines
    // past the right border. EN build text usually fits without wrapping.
    const node = createUiText(text, {
      fontSize,
      fill: color,
      wordWrap: true,
      wordWrapWidth: Math.max(60, PANEL_W - x - 12),
    });
    node.x = x; node.y = y;
    this.panel.addChild(node);
    return node;
  }

  private addDivider(y: number): void {
    const g = new Graphics();
    g.moveTo(12, y); g.lineTo(PANEL_W - 12, y);
    g.stroke({ width: 1, color: COL_BORDER });
    this.panel.addChild(g);
  }
}
