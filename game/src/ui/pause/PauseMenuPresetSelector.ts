import { BitmapText, Container, Graphics } from 'pixi.js';
import { GAME_HEIGHT, GAME_WIDTH } from '../../Game';
import type { PresetName } from '@core/InputManager';
import { t } from '@i18n';
import { PIXEL_FONT } from '../fonts';
import { createUiText } from '../factories';
import { createModalPanel, drawSelectionRow } from '../ModalPanel';
import type { UISkin } from '../UISkin';
import {
  COL_ACCENT,
  COL_BORDER,
  COL_DIM,
  COL_TEXT,
  COL_WARNING,
  PRESET_LIST_Y,
  PRESET_PANEL_H,
  PRESET_PANEL_W,
  PRESET_ROW_H,
  PRESET_ROW_PAD_X,
  PRESETS_DATA,
} from './PauseMenuConstants';

export interface PausePresetSelectorResult {
  panel: Container;
  pulseG: Graphics;
  selectedRowY: number;
  pulseRect: { w: number; h: number };
}

export function createPausePresetSelectorPanel(
  skin: UISkin | null,
  presetIndex: number,
  currentPreset: PresetName,
): PausePresetSelectorResult {
  const cw = PRESET_PANEL_W;
  const ch = PRESET_PANEL_H;
  const cx = Math.floor((GAME_WIDTH - cw) / 2);
  const cy = Math.floor((GAME_HEIGHT - ch) / 2);

  const container = new Container();
  container.x = cx;
  container.y = cy;

  const { panel } = createModalPanel(skin, cw, ch);
  container.addChild(panel);

  const title = createUiText(t('ui.pause.controls'), { fontSize: 10, fill: COL_TEXT });
  title.x = Math.floor((cw - title.width) / 2);
  title.y = 8;
  panel.addChild(title);

  const divider = new Graphics();
  divider.moveTo(12, 22);
  divider.lineTo(cw - 12, 22);
  divider.stroke({ width: 1, color: COL_BORDER });
  panel.addChild(divider);

  const rowW = cw - PRESET_ROW_PAD_X * 2;
  let selectedRowY = 0;

  for (let i = 0; i < PRESETS_DATA.length; i++) {
    const p = PRESETS_DATA[i];
    const isSel = i === presetIndex;
    const isActive = p.name === currentPreset;
    const rowY = PRESET_LIST_Y + i * (PRESET_ROW_H + 2);

    if (isSel) {
      const rowBg = new Graphics();
      rowBg.x = PRESET_ROW_PAD_X;
      rowBg.y = rowY;
      drawSelectionRow(rowBg, rowW, PRESET_ROW_H, 'soft');
      panel.addChild(rowBg);
      selectedRowY = rowY;
    }

    const chevron = new BitmapText({
      text: isSel ? '>' : ' ',
      style: { fontFamily: PIXEL_FONT, fontSize: 10, fill: COL_ACCENT },
    });
    chevron.x = PRESET_ROW_PAD_X + 4;
    chevron.y = rowY + 5;
    panel.addChild(chevron);

    const label = createUiText(t(p.labelKey), {
      fontFamily: PIXEL_FONT,
      fontSize: 10,
      fill: isSel ? COL_TEXT : COL_DIM,
    });
    label.x = PRESET_ROW_PAD_X + 18;
    label.y = rowY + 4;
    panel.addChild(label);

    if (isActive) {
      const badge = createUiText(t('ui.pause.active'), { fontSize: 8, fill: COL_WARNING });
      badge.x = PRESET_ROW_PAD_X + rowW - badge.width - 6;
      badge.y = rowY + 5;
      panel.addChild(badge);
    }

    const desc = createUiText(t(p.descKey), {
      fontFamily: PIXEL_FONT,
      fontSize: 8,
      fill: isSel ? COL_DIM : 0x666677,
    });
    desc.x = PRESET_ROW_PAD_X + 18;
    desc.y = rowY + 16;
    panel.addChild(desc);
  }

  const hint = createUiText(t('ui.pause.preset_hint'), {
    fontFamily: PIXEL_FONT,
    fontSize: 8,
    fill: COL_DIM,
  });
  hint.x = Math.floor((cw - hint.width) / 2);
  hint.y = ch - 12;
  panel.addChild(hint);

  const pulseG = new Graphics();
  pulseG.x = PRESET_ROW_PAD_X;
  pulseG.y = selectedRowY;
  panel.addChild(pulseG);

  return {
    panel: container,
    pulseG,
    selectedRowY,
    pulseRect: { w: rowW, h: PRESET_ROW_H },
  };
}
