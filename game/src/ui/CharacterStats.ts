/**
 * CharacterStats — TAB key STATUS overlay.
 *
 * Spec: docs/ui-components.html#character-stats
 *   - 9-slice modal panel (createModalPanel)
 *   - Single-column layout, 360px wide
 *   - Equipped weapon line / ATK / HP / Lv·EXP / Relic dots / hint
 *   - PIXEL_FONT, fontSize 8 / 10 / 12 only (120 source 정수 비율)
 *   - 모든 색상 ModalPanel.ts 토큰만 사용 (하드코딩 금지)
 *
 * Anti-patterns (가이드 §폐기):
 *   - 3-column 레이아웃 (장비 그리드 + 실루엣 + 스탯) — 인벤토리(I) 와 분리
 *   - raw Graphics.rect 패널 — createModalPanel 만 사용
 *   - 임의 fontSize (7/9/14/16) — 카논 토큰 외 금지
 */

import { Container, Graphics, BitmapText } from 'pixi.js';
import { PIXEL_FONT } from './fonts';
import { createUiText } from './factories';
import { t } from '@i18n';
import type { Inventory } from '@items/Inventory';
import { RARITY_COLOR, calcInnocentBonus, type InnocentStatKey } from '@items/ItemInstance';
import { RARITY_DISPLAY_NAME } from '@data/weapons';
import { getPlayerBaseStats } from '@data/playerStats';
import {
  createModalPanel,
  MODAL_BORDER,
  MODAL_DIVIDER,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_GOLD,
  ROW_CHEVRON_COLOR,
  FONT_TITLE,
  FONT_BODY,
  FONT_HINT,
} from './ModalPanel';
import type { UISkin } from './UISkin';

const PANEL_W = 360;
// Height computed from content blocks; balance ≈ 240 with all sections.
const PANEL_H = 244;

const PADDING = 12;
const ROW_GAP = 4;
const SECTION_GAP = 8;

const HP_COLOR_SAFE = 0x22aa22;
const HP_COLOR_WARN = 0xaaaa22;
const HP_COLOR_DANGER = 0xaa2222;
const RELIC_DOT_R = 5;
const RELIC_DOT_GAP = 14;

export class CharacterStats {
  readonly container: Container;
  visible = false;
  private inventory: Inventory | null = null;
  private playerLevel = 1;
  private playerExp = 0;
  private playerMaxExp = 100;
  private playerHp = 100;
  private playerMaxHp = 100;
  private relics: boolean[] = [false, false, false, false, false, false];
  private skin: UISkin | null = null;

  onVisibilityChanged: ((visible: boolean) => void) | null = null;

  /** UI native 마이그레이션 1단계: uiContainer(scale=1) 직속 마운트용 자체 scale. */
  constructor(skin?: UISkin | null, uiScale: number = 1) {
    this.skin = skin ?? null;
    this.container = new Container();
    this.container.scale.set(uiScale);
    this.container.visible = false;
  }

  setData(inventory: Inventory, level: number, exp: number, maxExp: number, hp: number, maxHp: number, relics: boolean[]): void {
    this.inventory = inventory;
    this.playerLevel = level;
    this.playerExp = exp;
    this.playerMaxExp = maxExp;
    this.playerHp = hp;
    this.playerMaxHp = maxHp;
    this.relics = relics;
  }

  show(): void {
    this.visible = true;
    this.container.visible = true;
    this.draw();
    this.onVisibilityChanged?.(true);
  }

  hide(): void {
    this.visible = false;
    this.container.visible = false;
    this.onVisibilityChanged?.(false);
  }

  // =========================================================================

  private draw(): void {
    this.container.removeChildren();

    // Canonical 9-slice modal — overlay + panel.
    const { overlay, panel } = createModalPanel(this.skin, PANEL_W, PANEL_H);
    this.container.addChild(overlay);
    this.container.addChild(panel);

    // ── Title ──
    const title = createUiText(t('ui.character.title'), { fontSize: FONT_TITLE, fill: TEXT_PRIMARY });
    title.x = Math.floor((PANEL_W - title.width) / 2);
    title.y = 10;
    panel.addChild(title);

    // Top divider
    this.drawDivider(panel, 28);

    let y = 38;

    // ── Equipped weapon line ──
    y = this.drawEquippedLine(panel, y);
    y += SECTION_GAP;

    // ── Core stats (ATK + HP) ──
    y = this.drawAtkLine(panel, y);
    y += ROW_GAP;
    y = this.drawHpBlock(panel, y);
    y += ROW_GAP;
    y = this.drawExpBlock(panel, y);
    y += SECTION_GAP;

    this.drawDivider(panel, y);
    y += 8;

    // ── Relics ──
    y = this.drawRelics(panel, y);
    y += SECTION_GAP;

    this.drawDivider(panel, y);
    y += 6;

    // ── Hint ──
    const hint = createUiText(t('ui.character.close_hint'), { fontSize: FONT_HINT, fill: TEXT_SECONDARY });
    hint.x = PANEL_W - PADDING - hint.width;
    hint.y = y;
    panel.addChild(hint);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private drawDivider(parent: Container, y: number): void {
    const div = new Graphics();
    div.moveTo(PADDING, y).lineTo(PANEL_W - PADDING, y);
    div.stroke({ width: 1, color: MODAL_DIVIDER, alpha: 0.4 });
    parent.addChild(div);
  }

  private drawEquippedLine(parent: Container, y: number): number {
    const eq = this.inventory?.equipped;
    if (eq) {
      const name = createUiText(eq.def.name, { fontSize: FONT_BODY, fill: RARITY_COLOR[eq.rarity] ?? TEXT_PRIMARY });
      name.x = PADDING;
      name.y = y;
      parent.addChild(name);

      const meta = createUiText(
        t('ui.character.equipped_meta', { rarity: RARITY_DISPLAY_NAME[eq.rarity] ?? eq.rarity, level: eq.level }),
        { fontSize: FONT_HINT, fill: TEXT_SECONDARY },
      );
      meta.x = PADDING + name.width + 8;
      meta.y = y + 2;
      parent.addChild(meta);
    } else {
      const name = createUiText(t('ui.character.no_weapon'), { fontSize: FONT_BODY, fill: TEXT_SECONDARY });
      name.x = PADDING;
      name.y = y;
      parent.addChild(name);
    }
    return y + 16;
  }

  private drawAtkLine(parent: Container, y: number): number {
    const base = getPlayerBaseStats(this.playerLevel);
    const eq = this.inventory?.equipped;
    const eqAtk = eq?.finalAtk ?? 0;
    const eqBonus = eq ? calcInnocentBonus(eq, 'atk' as InnocentStatKey) : 0;
    const finalAtk = base.atk + eqAtk + eqBonus;

    const labelW = 36;

    const lbl = new BitmapText({
      text: t('ui.inventory.atk_label'),
      style: { fontFamily: PIXEL_FONT, fontSize: FONT_BODY, fill: TEXT_SECONDARY },
    });
    lbl.x = PADDING;
    lbl.y = y;
    parent.addChild(lbl);

    const num = new BitmapText({
      text: String(finalAtk),
      style: { fontFamily: PIXEL_FONT, fontSize: FONT_BODY, fill: TEXT_PRIMARY },
    });
    num.x = PADDING + labelW;
    num.y = y;
    parent.addChild(num);

    const decomp = new BitmapText({
      text: `(${base.atk} + ${eqAtk} + ${eqBonus})`,
      style: { fontFamily: PIXEL_FONT, fontSize: FONT_HINT, fill: TEXT_SECONDARY },
    });
    decomp.x = PADDING + labelW + num.width + 8;
    decomp.y = y + 2;
    parent.addChild(decomp);

    return y + 14;
  }

  private drawHpBlock(parent: Container, y: number): number {
    const labelW = 36;

    const lbl = new BitmapText({
      text: t('ui.character.hp_label'),
      style: { fontFamily: PIXEL_FONT, fontSize: FONT_BODY, fill: TEXT_SECONDARY },
    });
    lbl.x = PADDING;
    lbl.y = y;
    parent.addChild(lbl);

    const num = new BitmapText({
      text: `${this.playerHp} / ${this.playerMaxHp}`,
      style: { fontFamily: PIXEL_FONT, fontSize: FONT_BODY, fill: TEXT_PRIMARY },
    });
    num.x = PADDING + labelW;
    num.y = y;
    parent.addChild(num);

    // HP bar
    const barW = PANEL_W - PADDING * 2;
    const barH = 6;
    const barY = y + 14;
    const ratio = this.playerMaxHp > 0 ? Math.min(1, this.playerHp / this.playerMaxHp) : 0;
    const color = ratio > 0.5 ? HP_COLOR_SAFE : ratio > 0.25 ? HP_COLOR_WARN : HP_COLOR_DANGER;

    const bar = new Graphics();
    bar.rect(PADDING, barY, barW, barH).fill(0x222233);
    if (ratio > 0) bar.rect(PADDING, barY, barW * ratio, barH).fill(color);
    bar.rect(PADDING, barY, barW, barH).stroke({ color: MODAL_BORDER, width: 1 });
    parent.addChild(bar);

    return barY + barH;
  }

  private drawExpBlock(parent: Container, y: number): number {
    const labelW = 36;

    const lbl = new BitmapText({
      text: t('ui.character.exp_label'),
      style: { fontFamily: PIXEL_FONT, fontSize: FONT_BODY, fill: TEXT_SECONDARY },
    });
    lbl.x = PADDING;
    lbl.y = y;
    parent.addChild(lbl);

    const lvNum = new BitmapText({
      text: t('ui.character.level_label', { level: this.playerLevel }),
      style: { fontFamily: PIXEL_FONT, fontSize: FONT_BODY, fill: TEXT_PRIMARY },
    });
    lvNum.x = PADDING + labelW;
    lvNum.y = y;
    parent.addChild(lvNum);

    const expTxt = new BitmapText({
      text: `${this.playerExp} / ${this.playerMaxExp}`,
      style: { fontFamily: PIXEL_FONT, fontSize: FONT_HINT, fill: TEXT_SECONDARY },
    });
    expTxt.x = PADDING + labelW + lvNum.width + 8;
    expTxt.y = y + 2;
    parent.addChild(expTxt);

    // EXP bar
    const barW = PANEL_W - PADDING * 2;
    const barH = 6;
    const barY = y + 14;
    const ratio = this.playerMaxExp > 0 ? Math.min(1, this.playerExp / this.playerMaxExp) : 0;

    const bar = new Graphics();
    bar.rect(PADDING, barY, barW, barH).fill(0x222233);
    if (ratio > 0) bar.rect(PADDING, barY, barW * ratio, barH).fill(TEXT_GOLD);
    bar.rect(PADDING, barY, barW, barH).stroke({ color: MODAL_BORDER, width: 1 });
    parent.addChild(bar);

    return barY + barH;
  }

  private drawRelics(parent: Container, y: number): number {
    const lbl = createUiText(t('ui.character.relics'), { fontSize: FONT_HINT, fill: TEXT_SECONDARY });
    lbl.x = PADDING;
    lbl.y = y;
    parent.addChild(lbl);

    // 6 dots — acquired = filled orange, missing = dim outline
    const dotsY = y + 4;
    const dotsX = PADDING + lbl.width + 12;
    for (let i = 0; i < 6; i++) {
      const cx = dotsX + i * RELIC_DOT_GAP;
      const acquired = this.relics[i] ?? false;
      const dot = new Graphics();
      if (acquired) {
        dot.circle(cx, dotsY + RELIC_DOT_R, RELIC_DOT_R).fill(ROW_CHEVRON_COLOR);
      } else {
        dot.circle(cx, dotsY + RELIC_DOT_R, RELIC_DOT_R).stroke({ color: TEXT_SECONDARY, width: 1 });
      }
      parent.addChild(dot);
    }
    return y + 14;
  }
}
