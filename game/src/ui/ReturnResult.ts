/**
 * ReturnResult — Item World dive completion screen.
 *
 * Shows: item level changes, stat deltas, innocents captured, strata progress.
 * Death variant shows losses with strikethrough.
 */

import { Container, Graphics, BitmapText } from 'pixi.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../Game';
import { PIXEL_FONT } from './fonts';
import { RARITY_COLOR, type ItemInstance } from '@items/ItemInstance';
import { RARITY_DISPLAY_NAME } from '@data/weapons';
import { MODAL_BG, MODAL_BG_ALPHA, MODAL_OVERLAY, MODAL_OVERLAY_ALPHA, MODAL_BORDER, MODAL_BORDER_W, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_POSITIVE, TEXT_NEGATIVE, TEXT_ACCENT, TEXT_GOLD, FONT_TITLE, FONT_HINT, createModalPanel } from './ModalPanel';
import type { UISkin } from './UISkin';

const PANEL_W = 400;
const PANEL_H = 260;
const PANEL_X = Math.floor((GAME_WIDTH - PANEL_W) / 2);
const PANEL_Y = Math.floor((GAME_HEIGHT - PANEL_H) / 2);

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

  constructor(skin?: UISkin | null) {
    this.skin = skin ?? null;
    this.container = new Container();
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
    // Clear everything and rebuild with overlay + 9-slice panel
    this.container.removeChildren();

    const { overlay, panel } = createModalPanel(this.skin, PANEL_W, PANEL_H);
    this.container.addChild(overlay);
    this.panel = panel;
    this.container.addChild(this.panel);

    let y = 12;

    // Title
    const title = r.isDeath ? 'DIVE FAILED' : 'DIVE COMPLETE';
    const titleColor = r.isDeath ? COL_NEGATIVE : COL_TEXT;
    const titleText = new BitmapText({
      text: title,
      style: { fontFamily: PIXEL_FONT, fontSize: FONT_TITLE, fill: titleColor },
    });
    titleText.x = Math.floor((PANEL_W - title.length * 8) / 2);
    titleText.y = y;
    this.panel.addChild(titleText);
    y += 18;

    // Divider
    this.addDivider(y); y += 6;

    // ITEM section
    const rarityColor = RARITY_COLOR[r.item.rarity] ?? COL_TEXT;
    this.addText(`${r.item.def.name}`, 16, y, rarityColor, 8); y += 12;

    // Level change
    const levelDelta = r.item.level - r.prevLevel;
    if (r.isDeath) {
      this.addText(`Lv.${r.prevLevel} (no change)`, 16, y, COL_NEUTRAL, FONT_HINT);
    } else {
      const levelColor = levelDelta > 0 ? COL_GOLD : COL_TEXT;
      this.addText(`Lv.${r.prevLevel} -> Lv.${r.item.level}  (+${levelDelta})`, 16, y, levelColor, FONT_HINT);
    }
    y += 12;

    this.addDivider(y); y += 6;

    // STAT CHANGES
    this.addText('STAT CHANGES', 16, y, COL_DIM, FONT_HINT); y += 12;
    const atkDelta = r.item.finalAtk - r.prevAtk;
    if (r.isDeath) {
      this.addText(`ATK: ${r.prevAtk} (lost)`, 24, y, COL_NEGATIVE, FONT_HINT);
    } else {
      const atkColor = atkDelta > 0 ? COL_POSITIVE : atkDelta < 0 ? COL_NEGATIVE : COL_NEUTRAL;
      const atkSign = atkDelta > 0 ? '+' : '';
      this.addText(`ATK: ${r.prevAtk} -> ${r.item.finalAtk}  (${atkSign}${atkDelta})`, 24, y, atkColor, FONT_HINT);
    }
    y += 14;

    this.addDivider(y); y += 6;

    // INNOCENTS
    this.addText('INNOCENTS', 16, y, COL_DIM, FONT_HINT); y += 12;
    if (r.innocentsCaptured > 0) {
      this.addText(`[*] ${r.innocentsCaptured} captured`, 24, y, COL_POSITIVE, FONT_HINT);
    } else {
      this.addText('None captured', 24, y, COL_NEUTRAL, FONT_HINT);
    }
    y += 14;

    this.addDivider(y); y += 6;

    // STRATA PROGRESS
    this.addText('STRATA', 16, y, COL_DIM, FONT_HINT); y += 12;
    for (let s = 0; s < r.totalStrata; s++) {
      const cleared = s < r.strataCleared;
      const symbol = cleared ? '[V]' : '[ ]';
      const color = cleared ? COL_POSITIVE : COL_NEUTRAL;
      const bossNames = ['Item General', 'Item King', 'Item God', 'Item Great God'];
      const bossName = bossNames[s] ?? `Stratum ${s + 1}`;
      this.addText(`${symbol} ${bossName}`, 24, y, color, FONT_HINT);
      y += 10;
    }

    y += 4;
    this.addDivider(y); y += 6;

    // LOOT
    this.addText(`Gold earned: ${r.goldEarned.toLocaleString()}`, 16, y, COL_DIM, FONT_HINT); y += 10;
    this.addText(`Enemies defeated: ${r.enemiesDefeated}`, 16, y, COL_DIM, FONT_HINT); y += 14;

    // Death message
    if (r.isDeath) {
      this.addText('All progress lost.', 16, y, COL_NEGATIVE, 8);
      y += 14;
    }

    // Action
    this.addText('[C] CONTINUE', Math.floor((PANEL_W - 100) / 2), PANEL_H - 20, TEXT_ACCENT, FONT_HINT);
  }

  private addText(text: string, x: number, y: number, color: number, fontSize: number): BitmapText {
    const t = new BitmapText({ text, style: { fontFamily: PIXEL_FONT, fontSize, fill: color } });
    t.x = x; t.y = y;
    this.panel.addChild(t);
    return t;
  }

  private addDivider(y: number): void {
    const g = new Graphics();
    g.moveTo(12, y); g.lineTo(PANEL_W - 12, y);
    g.stroke({ width: 1, color: COL_BORDER });
    this.panel.addChild(g);
  }
}
