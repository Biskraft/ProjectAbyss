import { Container } from 'pixi.js';
import { GameAction } from '@core/InputManager';
import { t } from '@i18n';
import { createInventoryHintRow } from './InventoryHintRow';
import { COL_KEY } from './InventoryConstants';

export interface InventoryAnvilActionHints {
  divePromptIcon: Container | null;
  divePromptLabel: Container | null;
}

export function drawInventoryItemActionHints(
  container: Container,
  y: number,
  isEquipped: boolean,
): void {
  const hintPairs = isEquipped
    ? [{ action: GameAction.MENU, label: t('ui.inventory.action_close') }]
    : [{ action: GameAction.ATTACK, label: t('ui.inventory.action_equip') }, { action: GameAction.MENU, label: t('ui.inventory.action_close') }];
  const hintRow = createInventoryHintRow(hintPairs);
  hintRow.x = 4;
  hintRow.y = y;
  container.addChild(hintRow);
}

export function drawInventoryAnvilActionHints(
  container: Container,
  hasItem: boolean,
  y: number,
): InventoryAnvilActionHints {
  const hintPairs = hasItem
    ? [
        { action: GameAction.ATTACK, label: t('ui.inventory.action_dive'), labelColor: COL_KEY },
        { action: GameAction.MENU, label: t('ui.inventory.action_cancel') },
      ]
    : [
        { action: GameAction.ATTACK, label: t('ui.inventory.action_place') },
        { action: GameAction.MENU, label: t('ui.inventory.action_back') },
      ];
  const hintRow = createInventoryHintRow(hintPairs, 15, 10);
  hintRow.x = 4;
  hintRow.y = y;
  container.addChild(hintRow);

  return {
    divePromptIcon: hasItem ? hintRow.children[0] as Container : null,
    divePromptLabel: hasItem ? hintRow.children[1] as Container : null,
  };
}
