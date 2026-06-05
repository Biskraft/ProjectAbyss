import { Container, Graphics } from 'pixi.js';
import { GAME_HEIGHT, GAME_WIDTH } from '../../Game';
import { t } from '@i18n';
import { createUiText } from '../factories';
import { drawSelectionRow } from '../ModalPanel';
import {
  COL_BG,
  COL_DANGER,
  COL_DIM,
  COL_TEXT,
  COL_WARNING,
} from './PauseMenuConstants';

export interface PauseConfirmPanelResult {
  panel: Container;
  pulseG: Graphics;
  pulseRect: { w: number; h: number };
}

export function createPauseConfirmPanel(confirmSelection: number): PauseConfirmPanelResult {
  const cw = 160;
  const ch = 60;
  const cx = Math.floor((GAME_WIDTH - cw) / 2);
  const cy = Math.floor((GAME_HEIGHT - ch) / 2);

  const panel = new Container();
  panel.x = cx;
  panel.y = cy;

  const bg = new Graphics();
  bg.rect(0, 0, cw, ch).fill({ color: COL_BG, alpha: 0.97 });
  bg.rect(0, 0, cw, ch).stroke({ color: COL_DANGER, width: 1 });
  panel.addChild(bg);

  const warning = createUiText(t('ui.pause.quit_confirm_title'), {
    fontSize: 8,
    fill: COL_WARNING,
    wordWrap: true,
    wordWrapWidth: cw - 20,
  });
  warning.x = Math.floor((cw - warning.width) / 2);
  warning.y = 10;
  panel.addChild(warning);

  const sub = createUiText(t('ui.pause.quit_confirm_warn'), {
    fontSize: 8,
    fill: COL_DIM,
    wordWrap: true,
    wordWrapWidth: cw - 20,
  });
  sub.x = Math.floor((cw - sub.width) / 2);
  sub.y = 24;
  panel.addChild(sub);

  const btnW = 50;
  const btnH = 16;
  const btnY = 38;
  let selectedBtnX = 0;
  for (let b = 0; b < 2; b++) {
    const bx = b === 0 ? 20 : cw - 20 - btnW;
    const selected = b === confirmSelection;
    const label = b === 0 ? t('ui.confirm.yes') : t('ui.confirm.no');

    const btnBg = new Graphics();
    btnBg.x = bx;
    btnBg.y = btnY;
    if (selected) {
      drawSelectionRow(btnBg, btnW, btnH, 'soft');
      selectedBtnX = bx;
    } else {
      btnBg.rect(0, 0, btnW, btnH).fill(0x1a1a2e);
      btnBg.rect(0, 0, btnW, btnH).stroke({ color: 0x333333, width: 1 });
    }
    panel.addChild(btnBg);

    const btnText = createUiText(label, { fontSize: 8, fill: selected ? COL_TEXT : COL_DIM });
    btnText.x = bx + Math.floor((btnW - btnText.width) / 2);
    btnText.y = btnY + 4;
    panel.addChild(btnText);
  }

  if (confirmSelection === 0) {
    const dangerEdge = new Graphics();
    dangerEdge.rect(selectedBtnX, btnY, btnW, btnH).stroke({ color: COL_DANGER, width: 2, alpha: 0.6 });
    panel.addChild(dangerEdge);
  }

  const pulseG = new Graphics();
  pulseG.x = selectedBtnX;
  pulseG.y = btnY;
  panel.addChild(pulseG);

  return {
    panel,
    pulseG,
    pulseRect: { w: btnW, h: btnH },
  };
}
