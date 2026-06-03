import { Container, Graphics } from 'pixi.js';
import { GameAction } from '@core/InputManager';
import { t } from '@i18n';
import { GAME_HEIGHT, GAME_WIDTH } from '../Game';
import { createUiText } from './factories';
import { KeyPrompt } from './KeyPrompt';
import {
  create9SlicePanel,
  MODAL_BG,
  MODAL_BORDER,
  TEXT_INFO_COOL,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from './ModalPanel';
import { PIXEL_FONT } from './fonts';
import type { UISkin } from './UISkin';

export interface ItemWorldLeaveConfirmPanelOptions {
  hudSkin: UISkin | null;
  itemName: string;
  itemLevel: number;
  itemExp: number;
  expPerLevel: number;
  roomsCleared: number;
  totalRooms: number;
  earnedExp: number;
  earnedGold: number;
}

export function createItemWorldLeaveConfirmPanel(options: ItemWorldLeaveConfirmPanelOptions): Container {
  const panelW = 260;
  const panelH = 72;
  const panel = new Container();
  const frame = options.hudSkin?.isLoaded ? create9SlicePanel(options.hudSkin, panelW, panelH) : null;
  if (frame) {
    panel.addChild(frame);
  } else {
    const bg = new Graphics();
    bg.rect(0, 0, panelW, panelH).fill({ color: MODAL_BG, alpha: 0.95 });
    bg.rect(0, 0, panelW, panelH).stroke({ color: MODAL_BORDER, width: 1 });
    panel.addChild(bg);
  }

  const title = createUiText(t('ui.iw.leave_question'), { fontFamily: PIXEL_FONT, fontSize: 8, fill: TEXT_PRIMARY });
  title.x = 12;
  title.y = 6;
  panel.addChild(title);

  const expInfo = createUiText(
    t('ui.iw.leave_summary', {
      name: options.itemName,
      level: options.itemLevel,
      exp: options.itemExp,
      maxExp: options.expPerLevel,
    }),
    { fontFamily: PIXEL_FONT, fontSize: 8, fill: TEXT_INFO_COOL },
  );
  expInfo.x = 12;
  expInfo.y = 20;
  panel.addChild(expInfo);

  const floorInfo = createUiText(
    t('ui.iw.leave_rooms_summary', {
      cleared: options.roomsCleared,
      total: options.totalRooms,
      exp: options.earnedExp,
      gold: options.earnedGold,
    }),
    { fontFamily: PIXEL_FONT, fontSize: 8, fill: TEXT_SECONDARY },
  );
  floorInfo.x = 12;
  floorInfo.y = 33;
  panel.addChild(floorInfo);

  const keySize = 12;
  const labelFont = 8;
  const controlsRow = new Container();
  const yesBlock = new Container();
  const atkIcon = KeyPrompt.createKeyIconForAction(GameAction.ATTACK, keySize);
  yesBlock.addChild(atkIcon);
  const yesLabel = createUiText(t('ui.iw.leave_yes_label'), { fontFamily: PIXEL_FONT, fontSize: labelFont, fill: TEXT_SECONDARY });
  yesLabel.x = keySize + 4;
  yesLabel.y = Math.floor((keySize - yesLabel.height) / 2);
  yesBlock.addChild(yesLabel);
  controlsRow.addChild(yesBlock);

  const noBlock = new Container();
  const jumpIcon = KeyPrompt.createKeyIconForAction(GameAction.JUMP, keySize);
  noBlock.addChild(jumpIcon);
  const slash = createUiText('/', { fontFamily: PIXEL_FONT, fontSize: labelFont, fill: TEXT_SECONDARY });
  slash.x = keySize + 2;
  slash.y = Math.floor((keySize - slash.height) / 2);
  noBlock.addChild(slash);
  const dashIcon = KeyPrompt.createKeyIconForAction(GameAction.DASH, keySize);
  dashIcon.x = slash.x + slash.width + 2;
  noBlock.addChild(dashIcon);
  const noLabel = createUiText(t('ui.iw.leave_no_label'), { fontFamily: PIXEL_FONT, fontSize: labelFont, fill: TEXT_SECONDARY });
  noLabel.x = dashIcon.x + keySize + 4;
  noLabel.y = Math.floor((keySize - noLabel.height) / 2);
  noBlock.addChild(noLabel);
  noBlock.x = yesBlock.width + 14;
  controlsRow.addChild(noBlock);
  controlsRow.x = 12;
  controlsRow.y = 46;
  panel.addChild(controlsRow);

  panel.x = Math.floor((GAME_WIDTH - panelW) / 2);
  panel.y = Math.floor((GAME_HEIGHT - panelH) / 2);
  return panel;
}
