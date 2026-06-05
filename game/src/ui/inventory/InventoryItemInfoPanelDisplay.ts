import { Container } from 'pixi.js';
import { type ItemInstance, RARITY_COLOR } from '@items/ItemInstance';
import { drawInventoryItemActionHints } from './InventoryActionHintDisplay';
import { INFO_W } from './InventoryConstants';
import {
  drawInventoryDivider,
  drawInventoryEmptyItemInfo,
  drawInventoryFragmentLines,
  drawInventoryItemIdentityHeader,
  drawInventoryRecoveryBar,
  drawInventoryRediveCounter,
} from './InventoryItemDetailDisplay';

export function drawInventoryItemInfoPanel(
  container: Container,
  item: ItemInstance | undefined,
  equippedItem: ItemInstance | undefined,
): void {
  const width = INFO_W - 8;
  let y = 4;

  if (!item) {
    drawInventoryEmptyItemInfo(container, y);
    return;
  }

  const rarityColor = RARITY_COLOR[item.rarity] ?? 0xffffff;
  y = drawInventoryItemIdentityHeader(container, item, y, width, rarityColor);
  y = drawInventoryRecoveryBar(container, item, y, width, rarityColor);
  y = drawInventoryRediveCounter(container, item, y);

  y = drawInventoryDivider(container, y, width);
  y = drawInventoryFragmentLines(container, item, y, width);
  y = drawInventoryDivider(container, y, width);

  drawInventoryItemActionHints(container, y, equippedItem?.uid === item.uid);
}
