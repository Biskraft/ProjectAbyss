import { Container } from 'pixi.js';
import { getDisplayName, getIdentityCategory, type ItemInstance } from '@items/ItemInstance';
import { t } from '@i18n';
import { createUiText } from '../factories';
import { COL_DIM, COL_TEXT } from './InventoryConstants';

export interface InventoryAnvilMetaOptions {
  nameFontSize: number;
  breakWords?: boolean;
}

export function drawInventoryAnvilMeta(
  container: Container,
  item: ItemInstance,
  x: number,
  y: number,
  width: number,
  rarityColor: number,
  options: InventoryAnvilMetaOptions,
): void {
  let nextY = y;

  const nameText = createUiText(getDisplayName(item), {
    fontSize: options.nameFontSize,
    fill: rarityColor,
    wordWrap: true,
    wordWrapWidth: width,
    breakWords: options.breakWords,
  });
  nameText.x = x;
  nameText.y = nextY;
  container.addChild(nameText);
  nextY += Math.max(16, Math.floor((nameText.height ?? 14)) + 2);

  const category = getIdentityCategory(item);
  const categoryLabel = category === 'Unknown'
    ? t('ui.inventory.recovery_unknown')
    : t(`ui.category.${category.replace(/([A-Z])/g, '_$1').replace(/^_/, '').toLowerCase()}`);
  const titleText = createUiText(categoryLabel, { fontSize: 9, fill: COL_TEXT });
  titleText.x = x;
  titleText.y = nextY;
  container.addChild(titleText);
  nextY += 14;

  const recoveryPct = Math.floor(item.memoryRecovery);
  const recoveryText = createUiText(t('ui.inventory.recovery_line', { pct: recoveryPct }), { fontSize: 9, fill: COL_DIM });
  recoveryText.x = x;
  recoveryText.y = nextY;
  container.addChild(recoveryText);
}
