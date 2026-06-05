import { Container, Graphics } from 'pixi.js';
import { GAME_HEIGHT, GAME_WIDTH } from '../../Game';
import { t } from '@i18n';
import { createUiText } from '../factories';
import { createModalPanel, drawSelectionRow } from '../ModalPanel';
import type { UISkin } from '../UISkin';
import {
  COL_ACCENT,
  COL_BORDER,
  COL_DIM,
  COL_TEXT,
  SETTINGS_LIST_Y,
  SETTINGS_PANEL_H,
  SETTINGS_PANEL_W,
  SETTINGS_ROW_H,
  SETTINGS_ROW_PAD_X,
  SETTINGS_TAB_Y,
  SETTINGS_TABS,
  type SettingsRow,
} from './PauseMenuConstants';

export interface PauseSettingsPanelResult {
  panel: Container;
  pulseG: Graphics;
  pulseRect: { w: number; h: number };
}

export function createPauseSettingsPanel(
  skin: UISkin | null,
  settingsTabIndex: number,
  settingsIndex: number,
  rows: SettingsRow[],
  getValue: (row: SettingsRow) => string,
): PauseSettingsPanelResult {
  const cw = SETTINGS_PANEL_W;
  const ch = SETTINGS_PANEL_H;
  const cx = Math.floor((GAME_WIDTH - cw) / 2);
  const cy = Math.floor((GAME_HEIGHT - ch) / 2);

  const container = new Container();
  container.x = cx;
  container.y = cy;

  const { panel } = createModalPanel(skin, cw, ch);
  container.addChild(panel);

  const title = createUiText(t('ui.settings.title'), { fontSize: 10, fill: COL_TEXT });
  title.x = Math.floor((cw - title.width) / 2);
  title.y = 8;
  panel.addChild(title);

  const divider = new Graphics();
  divider.moveTo(12, 24);
  divider.lineTo(cw - 12, 24);
  divider.stroke({ width: 1, color: COL_BORDER });
  panel.addChild(divider);

  const rowW = cw - SETTINGS_ROW_PAD_X * 2;
  let pulseY = SETTINGS_TAB_Y - 3;
  let pulseH = SETTINGS_ROW_H - 2;

  if (settingsIndex === 0) {
    const rowBg = new Graphics();
    rowBg.x = SETTINGS_ROW_PAD_X;
    rowBg.y = pulseY;
    drawSelectionRow(rowBg, rowW, pulseH, 'soft');
    panel.addChild(rowBg);
  }

  const tabGap = 6;
  const tabW = Math.floor((rowW - tabGap * (SETTINGS_TABS.length - 1)) / SETTINGS_TABS.length);
  for (let i = 0; i < SETTINGS_TABS.length; i++) {
    const tab = SETTINGS_TABS[i];
    const active = i === settingsTabIndex;
    const label = createUiText(t(tab.labelKey), { fontSize: 7, fill: active ? COL_ACCENT : COL_DIM });
    const tx = SETTINGS_ROW_PAD_X + i * (tabW + tabGap);
    label.x = tx + Math.floor((tabW - label.width) / 2);
    label.y = SETTINGS_TAB_Y + 2;
    panel.addChild(label);
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const isSel = settingsIndex === i + 1;
    const rowY = SETTINGS_LIST_Y + i * SETTINGS_ROW_H;
    if (isSel) {
      const rowBg = new Graphics();
      rowBg.x = SETTINGS_ROW_PAD_X;
      rowBg.y = rowY;
      drawSelectionRow(rowBg, rowW, SETTINGS_ROW_H - 2, 'soft');
      panel.addChild(rowBg);
      pulseY = rowY;
      pulseH = SETTINGS_ROW_H - 2;
    }

    const label = createUiText(t(row.labelKey), { fontSize: 8, fill: isSel ? COL_TEXT : COL_DIM });
    label.x = SETTINGS_ROW_PAD_X + 8;
    label.y = rowY + 4;
    panel.addChild(label);

    const valueText = getValue(row);
    if (valueText) {
      const value = createUiText(valueText, { fontSize: 8, fill: isSel ? COL_TEXT : COL_DIM });
      value.x = SETTINGS_ROW_PAD_X + rowW - value.width - 8;
      value.y = rowY + 4;
      panel.addChild(value);
    }
  }

  const hintKey = settingsIndex === 0 ? 'ui.settings.tab_hint' : 'ui.settings.hint';
  const hint = createUiText(t(hintKey), { fontSize: 7, fill: COL_DIM });
  hint.x = Math.floor((cw - hint.width) / 2);
  hint.y = ch - 14;
  panel.addChild(hint);

  const pulseG = new Graphics();
  pulseG.x = SETTINGS_ROW_PAD_X;
  pulseG.y = pulseY;
  panel.addChild(pulseG);

  return {
    panel: container,
    pulseG,
    pulseRect: { w: rowW, h: pulseH },
  };
}
