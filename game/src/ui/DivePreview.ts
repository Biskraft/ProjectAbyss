/**
 * DivePreview.ts
 *
 * Sacred Pickup T5/S6 — 다이브 확정 직전에 무기/지층/보상을 한 번 더 보여주는
 * 모달(풀 패널) 또는 하단 스트립(요약) UI.
 *
 *   - showFull:    첫 다이브(sacredSave.isFirstDiveDone === false)에서 사용.
 *                  260×180 중앙 모달, [C] DIVE / [ESC] CANCEL.
 *   - showCompact: 이후 다이브. 화면 하단 1줄 스트립, [C] OK / [ESC] CANCEL.
 */

import { Container, Graphics, BitmapText } from 'pixi.js';
import { PIXEL_FONT } from './fonts';
import { KeyPrompt } from './KeyPrompt';
import { ItemImage } from './ItemImage';
import { RARITY_COLOR, type ItemInstance } from '@items/ItemInstance';
import { RARITY_DISPLAY_NAME } from '@data/weapons';
import { GAME_WIDTH, GAME_HEIGHT } from '../Game';

/** Floors per rarity — matches LorePopup STRATA_BY_RARITY table. */
const STRATA_BY_RARITY: Record<string, number> = {
  normal: 2,
  magic: 3,
  rare: 3,
  legendary: 4,
  ancient: 4,
};

type Mode = 'hidden' | 'full' | 'compact';

export class DivePreview {
  readonly container: Container;
  private overlay: Graphics;
  private panel: Container;
  private mode: Mode = 'hidden';
  private onConfirm: (() => void) | null = null;
  private onCancel: (() => void) | null = null;

  constructor() {
    this.container = new Container();
    this.container.visible = false;

    this.overlay = new Graphics();
    this.container.addChild(this.overlay);

    this.panel = new Container();
    this.container.addChild(this.panel);
  }

  isBlocking(): boolean {
    return this.mode !== 'hidden';
  }

  /** Full modal (first-ever dive). */
  showFull(item: ItemInstance, onConfirm: () => void, onCancel: () => void): void {
    this.mode = 'full';
    this.onConfirm = onConfirm;
    this.onCancel = onCancel;
    this.drawFullPanel(item);
    this.container.visible = true;
  }

  /** Compact bottom strip (subsequent dives). */
  showCompact(item: ItemInstance, onConfirm: () => void, onCancel: () => void): void {
    this.mode = 'compact';
    this.onConfirm = onConfirm;
    this.onCancel = onCancel;
    this.drawCompactStrip(item);
    this.container.visible = true;
  }

  confirm(): void {
    if (this.mode === 'hidden') return;
    const cb = this.onConfirm;
    this.hide();
    cb?.();
  }

  cancel(): void {
    if (this.mode === 'hidden') return;
    const cb = this.onCancel;
    this.hide();
    cb?.();
  }

  hide(): void {
    this.mode = 'hidden';
    this.onConfirm = null;
    this.onCancel = null;
    this.container.visible = false;
    this.clearChildren(this.panel);
    this.overlay.clear();
  }

  destroy(): void {
    if (this.container.parent) this.container.parent.removeChild(this.container);
    this.container.destroy({ children: true });
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private clearChildren(c: Container): void {
    for (const child of [...c.children]) {
      c.removeChild(child);
      child.destroy?.({ children: true });
    }
  }

  private drawFullPanel(item: ItemInstance): void {
    this.clearChildren(this.panel);
    this.overlay.clear();
    this.overlay.rect(0, 0, GAME_WIDTH, GAME_HEIGHT).fill({ color: 0x000000, alpha: 0.6 });

    const W = 260;
    const H = 180;
    const px = Math.floor((GAME_WIDTH - W) / 2);
    const py = Math.floor((GAME_HEIGHT - H) / 2);
    const rColor = RARITY_COLOR[item.rarity];

    const bg = new Graphics();
    bg.rect(0, 0, W, H).fill({ color: 0x1a1a2e, alpha: 0.96 });
    bg.rect(0, 0, W, H).stroke({ color: rColor, width: 1 });
    bg.x = px;
    bg.y = py;
    this.panel.addChild(bg);

    // Title.
    const title = new BitmapText({
      text: 'DIVE INTO MEMORY',
      style: { fontFamily: PIXEL_FONT, fontSize: 10, fill: 0xffcc44 },
    });
    title.x = px + 12;
    title.y = py + 10;
    this.panel.addChild(title);

    // Item portrait — 32px icon.
    const ICON_SIZE = 32;
    const image = new ItemImage(item, ICON_SIZE);
    image.container.x = px + 12;
    image.container.y = py + 26;
    this.panel.addChild(image.container);

    const textX = px + 12 + ICON_SIZE + 10;

    // Item name.
    const nameText = new BitmapText({
      text: item.def.name,
      style: { fontFamily: PIXEL_FONT, fontSize: 12, fill: rColor },
    });
    nameText.x = textX;
    nameText.y = py + 28;
    this.panel.addChild(nameText);

    // Rarity badge.
    const rarityText = new BitmapText({
      text: RARITY_DISPLAY_NAME[item.rarity].toUpperCase(),
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: rColor },
    });
    rarityText.x = textX;
    rarityText.y = py + 44;
    this.panel.addChild(rarityText);

    // Stratum quick stat beside portrait.
    const strata = STRATA_BY_RARITY[item.rarity] ?? 2;
    const stratumInline = new BitmapText({
      text: `Lv.${item.level + 1}  ${strata}F`,
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0x88ccff },
    });
    stratumInline.x = textX;
    stratumInline.y = py + 58;
    this.panel.addChild(stratumInline);

    // Divider below portrait row. 아이콘이 64px 로 커지면서 아래쪽 여백이
    // 줄었으므로 icon 하단(py+90) 아래로 밀어 겹침 방지.
    const div = new Graphics();
    div.rect(px + 12, py + 96, W - 24, 1).fill({ color: 0x3a3a4e, alpha: 1 });
    this.panel.addChild(div);

    // Reward hint.
    const lines: Array<{ text: string; color: number }> = [
      { text: 'Estimated reward:',                    color: 0xaaaaaa },
      { text: 'XP, Innocents, Fragments',             color: 0xffffff },
    ];
    let ly = py + 104;
    for (const line of lines) {
      const t = new BitmapText({
        text: line.text,
        style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: line.color },
      });
      t.x = px + 12;
      t.y = ly;
      this.panel.addChild(t);
      ly += 12;
    }

    // Prompts row.
    const promptY = py + H - 18;
    const dIcon = KeyPrompt.createKeyIcon('C', 10);
    dIcon.x = px + 12;
    dIcon.y = promptY;
    this.panel.addChild(dIcon);
    const dLabel = new BitmapText({
      text: 'DIVE',
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xffffff },
    });
    dLabel.x = px + 26;
    dLabel.y = promptY + 1;
    this.panel.addChild(dLabel);

    const cIcon = KeyPrompt.createKeyIcon('ESC', 10);
    cIcon.x = px + W - 78;
    cIcon.y = promptY;
    this.panel.addChild(cIcon);
    const cLabel = new BitmapText({
      text: 'CANCEL',
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xaaaaaa },
    });
    cLabel.x = px + W - 60;
    cLabel.y = promptY + 1;
    this.panel.addChild(cLabel);
  }

  private drawCompactStrip(item: ItemInstance): void {
    this.clearChildren(this.panel);
    this.overlay.clear();
    // No full-screen dim for compact mode.

    const H = 18;
    const y = GAME_HEIGHT - H - 4;
    const rColor = RARITY_COLOR[item.rarity];

    const bg = new Graphics();
    bg.roundRect(8, y, GAME_WIDTH - 16, H, 2).fill({ color: 0x000000, alpha: 0.75 });
    bg.roundRect(8, y, GAME_WIDTH - 16, H, 2).stroke({ color: rColor, width: 1 });
    this.panel.addChild(bg);

    // Compact 14x14 thumbnail inline with the text.
    const thumb = new ItemImage(item, 14);
    thumb.container.x = 14;
    thumb.container.y = y + Math.floor((H - 14) / 2);
    this.panel.addChild(thumb.container);

    const strata = STRATA_BY_RARITY[item.rarity] ?? 2;
    const text = new BitmapText({
      text: `Diving into ${item.def.name} - ${strata} floors`,
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xffffff },
    });
    text.x = 14 + 14 + 6;
    text.y = y + Math.floor((H - text.height) / 2);
    this.panel.addChild(text);

    const okIcon = KeyPrompt.createKeyIcon('C', 10);
    okIcon.x = GAME_WIDTH - 90;
    okIcon.y = y + 4;
    this.panel.addChild(okIcon);
    const okLabel = new BitmapText({
      text: 'OK',
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xffffff },
    });
    okLabel.x = GAME_WIDTH - 76;
    okLabel.y = y + 5;
    this.panel.addChild(okLabel);

    const cIcon = KeyPrompt.createKeyIcon('ESC', 10);
    cIcon.x = GAME_WIDTH - 58;
    cIcon.y = y + 4;
    this.panel.addChild(cIcon);
    const cLabel = new BitmapText({
      text: 'CANCEL',
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xaaaaaa },
    });
    cLabel.x = GAME_WIDTH - 40;
    cLabel.y = y + 5;
    this.panel.addChild(cLabel);
  }
}
