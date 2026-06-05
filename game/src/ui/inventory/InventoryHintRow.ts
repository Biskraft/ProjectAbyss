import { Container } from 'pixi.js';
import { GameAction, actionKey } from '@core/InputManager';
import { createUiText } from '../factories';
import { KeyPrompt } from '../KeyPrompt';
import { COL_DIM } from './InventoryConstants';

export interface InventoryHintPair {
  action: GameAction;
  label: string;
  labelColor?: number;
}

export function createInventoryHintRow(
  pairs: InventoryHintPair[],
  iconSize = 10,
  fontSize = 7,
): Container {
  const row = new Container();
  let x = 0;
  for (const { action, label, labelColor } of pairs) {
    const icon = KeyPrompt.createKeyIcon(actionKey(action), iconSize);
    icon.x = x;
    row.addChild(icon);
    x += iconSize + 4;

    const txt = createUiText(label, { fontSize, fill: labelColor ?? COL_DIM });
    txt.x = x;
    txt.y = Math.floor((iconSize - (txt.height ?? fontSize)) / 2);
    row.addChild(txt);
    x += (txt.width ?? 20) + 10;
  }
  return row;
}
