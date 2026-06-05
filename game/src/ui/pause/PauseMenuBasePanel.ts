import { BitmapText, Container, Graphics, type Text } from 'pixi.js';
import { GAME_HEIGHT, GAME_WIDTH } from '../../Game';
import { PIXEL_FONT } from '../fonts';
import { createUiText } from '../factories';
import {
  createModalPanel,
  drawSelectionRow,
  MODAL_OVERLAY,
  MODAL_OVERLAY_ALPHA,
  ROW_CHEVRON_COLOR,
} from '../ModalPanel';
import type { UISkin } from '../UISkin';
import {
  CHEVRON_INSET,
  COL_BORDER,
  COL_DIM,
  COL_TEXT,
  ITEM_SPACING,
  ITEM_START_Y,
  MENU_ITEMS,
  PANEL_H,
  PANEL_W,
  ROW_H,
  ROW_PAD_X,
  type MenuItem,
} from './PauseMenuConstants';
import { redrawPauseMenuPulse } from './PauseMenuPulse';

export interface PauseMenuBasePanelParts {
  overlay: Graphics;
  panel: Container;
  menuTexts: (BitmapText | Text)[];
  selectionBg: Graphics;
  selectionPulseG: Graphics;
  chevronL: BitmapText;
  chevronR: BitmapText;
}

export function createPauseMenuBasePanel(
  skin: UISkin | null,
  resolveItemLabel: (item: MenuItem) => string,
): PauseMenuBasePanelParts {
  const overlay = new Graphics();
  overlay.rect(0, 0, GAME_WIDTH, GAME_HEIGHT).fill({ color: MODAL_OVERLAY, alpha: MODAL_OVERLAY_ALPHA });

  const { panel } = createModalPanel(skin, PANEL_W, PANEL_H);

  const title = createUiText(resolveItemLabel({ labelKey: 'ui.pause.title', action: 'continue' }), { fontSize: 10, fill: COL_TEXT });
  title.x = Math.floor((PANEL_W - title.width) / 2);
  title.y = 10;
  panel.addChild(title);

  const divider = new Graphics();
  divider.moveTo(12, 28);
  divider.lineTo(PANEL_W - 12, 28);
  divider.stroke({ width: 1, color: COL_BORDER });
  panel.addChild(divider);

  const rowW = PANEL_W - ROW_PAD_X * 2;
  const selectionBg = new Graphics();
  selectionBg.x = ROW_PAD_X;
  drawSelectionRow(selectionBg, rowW, ROW_H, 'soft');
  panel.addChild(selectionBg);

  const menuTexts: (BitmapText | Text)[] = [];
  for (let i = 0; i < MENU_ITEMS.length; i++) {
    const item = MENU_ITEMS[i];
    const labelText = createUiText(resolveItemLabel(item), {
      fontSize: 8,
      fill: item.color ?? COL_TEXT,
    });
    labelText.x = Math.floor((PANEL_W - labelText.width) / 2);
    labelText.y = ITEM_START_Y + i * ITEM_SPACING;
    panel.addChild(labelText);
    menuTexts.push(labelText);
  }

  const chevronL = new BitmapText({
    text: '\u25B6',
    style: { fontFamily: PIXEL_FONT, fontSize: 10, fill: ROW_CHEVRON_COLOR },
  });
  const chevronR = new BitmapText({
    text: '\u25C0',
    style: { fontFamily: PIXEL_FONT, fontSize: 10, fill: ROW_CHEVRON_COLOR },
  });
  panel.addChild(chevronL);
  panel.addChild(chevronR);

  const selectionPulseG = new Graphics();
  selectionPulseG.x = ROW_PAD_X;
  panel.addChild(selectionPulseG);

  return {
    overlay,
    panel,
    menuTexts,
    selectionBg,
    selectionPulseG,
    chevronL,
    chevronR,
  };
}

export interface PauseMenuBaseCursorParts {
  menuTexts: (BitmapText | Text)[];
  selectionBg: Graphics | null;
  selectionPulseG: Graphics | null;
  chevronL: BitmapText | null;
  chevronR: BitmapText | null;
}

export interface UpdatePauseMenuCursorOptions {
  parts: PauseMenuBaseCursorParts;
  selectedIndex: number;
  selectionPulseTimer: number;
}

export function updatePauseMenuCursor(options: UpdatePauseMenuCursorOptions): void {
  const { parts, selectedIndex, selectionPulseTimer } = options;
  if (!parts.selectionBg || !parts.selectionPulseG || !parts.chevronL || !parts.chevronR) return;

  const labelY = ITEM_START_Y + selectedIndex * ITEM_SPACING;
  const rowY = labelY - 3;
  parts.selectionBg.y = rowY;
  parts.selectionPulseG.y = rowY;

  const rowW = PANEL_W - ROW_PAD_X * 2;
  parts.chevronL.x = ROW_PAD_X + CHEVRON_INSET;
  parts.chevronL.y = rowY + 3;
  parts.chevronR.x = ROW_PAD_X + rowW - CHEVRON_INSET - 7;
  parts.chevronR.y = rowY + 3;

  for (let i = 0; i < parts.menuTexts.length; i++) {
    const text = parts.menuTexts[i];
    const item = MENU_ITEMS[i];
    const isSelected = i === selectedIndex;
    text.style.fill = isSelected ? COL_TEXT : (item.color ?? COL_DIM);
  }

  redrawPauseMenuPulse(parts.selectionPulseG, { w: rowW, h: ROW_H }, selectionPulseTimer);
}

export interface AdvancePauseMenuBaseCursorOptions extends UpdatePauseMenuCursorOptions {
  dt: number;
}

export function advancePauseMenuBaseCursor(options: AdvancePauseMenuBaseCursorOptions): number {
  const selectionPulseTimer = options.selectionPulseTimer + options.dt;
  updatePauseMenuCursor({
    parts: options.parts,
    selectedIndex: options.selectedIndex,
    selectionPulseTimer,
  });
  return selectionPulseTimer;
}

export function setPauseMenuBaseSelectionPulseSuppressed(selectionPulseG: Graphics | null, suppressed: boolean): void {
  if (!selectionPulseG) return;
  selectionPulseG.alpha = suppressed ? 0.15 : 1;
}
