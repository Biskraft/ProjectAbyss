import { BitmapText, Container, Graphics } from 'pixi.js';
import { GAME_HEIGHT, GAME_WIDTH } from '../../Game';
import { t } from '@i18n';
import { PIXEL_FONT } from '../fonts';
import { createUiText } from '../factories';
import { createModalPanel, drawSelectionRow } from '../ModalPanel';
import type { UISkin } from '../UISkin';
import {
  AUDIO_LIST_Y,
  AUDIO_PANEL_H,
  AUDIO_PANEL_W,
  AUDIO_ROW_H,
  AUDIO_ROW_PAD_X,
  AUDIO_ROWS,
  COL_ACCENT,
  COL_BORDER,
  COL_DIM,
  COL_TEXT,
  type AudioRow,
} from './PauseMenuConstants';

export interface PauseAudioPanelResult {
  panel: Container;
  pulseG: Graphics;
  pulseRect: { w: number; h: number };
}

export function createPauseAudioPanel(
  skin: UISkin | null,
  audioIndex: number,
  getVolume: (row: AudioRow) => number,
): PauseAudioPanelResult {
  const cw = AUDIO_PANEL_W;
  const ch = AUDIO_PANEL_H;
  const cx = Math.floor((GAME_WIDTH - cw) / 2);
  const cy = Math.floor((GAME_HEIGHT - ch) / 2);

  const container = new Container();
  container.x = cx;
  container.y = cy;

  const { panel } = createModalPanel(skin, cw, ch);
  container.addChild(panel);

  const title = createUiText(t('ui.settings.audio.title'), { fontSize: 10, fill: COL_TEXT });
  title.x = Math.floor((cw - title.width) / 2);
  title.y = 8;
  panel.addChild(title);

  const divider = new Graphics();
  divider.moveTo(12, 22);
  divider.lineTo(cw - 12, 22);
  divider.stroke({ width: 1, color: COL_BORDER });
  panel.addChild(divider);

  const rowW = cw - AUDIO_ROW_PAD_X * 2;
  let selectedRowY = 0;

  for (let i = 0; i < AUDIO_ROWS.length; i++) {
    const row = AUDIO_ROWS[i];
    const isSel = i === audioIndex;
    const rowY = AUDIO_LIST_Y + i * AUDIO_ROW_H;

    if (isSel) {
      const rowBg = new Graphics();
      rowBg.x = AUDIO_ROW_PAD_X;
      rowBg.y = rowY;
      drawSelectionRow(rowBg, rowW, AUDIO_ROW_H - 2, 'soft');
      panel.addChild(rowBg);
      selectedRowY = rowY;

      const chL = new BitmapText({
        text: '\u25C0',
        style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: COL_ACCENT },
      });
      chL.x = AUDIO_ROW_PAD_X + rowW - 54;
      chL.y = rowY + 4;
      panel.addChild(chL);

      const chR = new BitmapText({
        text: '\u25B6',
        style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: COL_ACCENT },
      });
      chR.x = AUDIO_ROW_PAD_X + rowW - 10;
      chR.y = rowY + 4;
      panel.addChild(chR);
    }

    const label = createUiText(t(row.labelKey), { fontSize: 8, fill: isSel ? COL_TEXT : COL_DIM });
    label.x = AUDIO_ROW_PAD_X + 6;
    label.y = rowY + 4;
    panel.addChild(label);

    const pct = Math.round(getVolume(row) * 100);
    const value = createUiText(String(pct), { fontSize: 8, fill: isSel ? COL_TEXT : COL_DIM });
    value.x = AUDIO_ROW_PAD_X + rowW - 32 - Math.floor(value.width / 2);
    value.y = rowY + 4;
    panel.addChild(value);
  }

  const hint = createUiText(t('ui.settings.audio.hint'), { fontSize: 8, fill: COL_DIM });
  hint.x = Math.floor((cw - hint.width) / 2);
  hint.y = ch - 14;
  panel.addChild(hint);

  const pulseG = new Graphics();
  pulseG.x = AUDIO_ROW_PAD_X;
  pulseG.y = selectedRowY;
  panel.addChild(pulseG);

  return {
    panel: container,
    pulseG,
    pulseRect: { w: rowW, h: AUDIO_ROW_H - 2 },
  };
}
