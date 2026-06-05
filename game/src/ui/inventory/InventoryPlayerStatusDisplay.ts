import { Container } from 'pixi.js';
import type { ItemInstance } from '@items/ItemInstance';
import { drawInventoryPlayerStatSummary } from './InventoryPlayerStatSummaryDisplay';
import { drawInventoryRelicStatus } from './InventoryRelicStatusDisplay';
import { STATUS_W } from './InventoryConstants';

export interface InventoryPlayerStatusStats {
  hp: number;
  maxHp: number;
  atk: number;
  abilities: string[];
}

export function drawInventoryPlayerStatus(
  container: Container,
  stats: InventoryPlayerStatusStats | null,
  selectedItem: ItemInstance | undefined,
  equippedItem: ItemInstance | undefined,
): void {
  const width = STATUS_W - 6;
  const hpStr = stats ? `${stats.hp} / ${stats.maxHp}` : '\u2014';
  const equippedAtk = equippedItem?.finalAtk ?? stats?.atk ?? 0;
  let atkDelta = 0;
  if (selectedItem && selectedItem.uid !== equippedItem?.uid) {
    atkDelta = selectedItem.finalAtk - equippedAtk;
  }

  const y = drawInventoryPlayerStatSummary(container, {
    hpText: hpStr,
    atkText: `${equippedAtk}`,
    atkDelta,
  }, width);
  drawInventoryRelicStatus(container, stats?.abilities ?? [], y);
}
