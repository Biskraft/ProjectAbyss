import { Container, Graphics } from 'pixi.js';
import { type ItemInstance, RARITY_COLOR, DEMO_BLOCK_REDIVE } from '@items/ItemInstance';
import { STARTER_ONLY_IDS } from '@data/weapons';
import { redrawInventorySelectionPulse, type InventorySelectionPulseRect } from './InventorySelectionPulse';
import { createInventorySelectionPulseOverlay, drawInventoryEmptySlots, drawInventoryScrollIndicator } from './InventoryGridChrome';
import { drawInventoryGridCell } from './InventoryGridCell';
import { clearInventoryContainer } from './InventoryShellDisplay';
import {
  CELL_GAP,
  CELL_H,
  CELL_W,
  GRID_COLS,
  GRID_ROWS,
} from './InventoryConstants';

export interface InventoryGridDisplayResult {
  selectionPulseOverlay: Graphics | null;
  selectionPulseRect: InventorySelectionPulseRect | null;
}

export function drawInventoryGrid(
  container: Container,
  items: readonly ItemInstance[],
  selectedIndex: number,
  scrollRowOffset: number,
  equippedUid: number | undefined,
  anvilItemUid: number | undefined,
  isAnvilMode: boolean,
  selectionPulseTimer: number,
): InventoryGridDisplayResult {
  clearInventoryContainer(container);

  const startIdx = scrollRowOffset * GRID_COLS;
  const endIdx = Math.min(items.length, startIdx + GRID_ROWS * GRID_COLS);

  for (let i = startIdx; i < endIdx; i++) {
    const localIdx = i - startIdx;
    const col = localIdx % GRID_COLS;
    const row = Math.floor(localIdx / GRID_COLS);
    const item = items[i];
    const rarityColor = RARITY_COLOR[item.rarity] ?? 0xffffff;
    const isCleared = item.worldProgress?.cleared === true;
    const isStarterOnly = STARTER_ONLY_IDS.has(item.def.id);
    const isLocked = isStarterOnly || (DEMO_BLOCK_REDIVE && isCleared);

    drawInventoryGridCell(container, item, col * (CELL_W + CELL_GAP), row * (CELL_H + CELL_GAP), {
      rarityColor,
      isSelected: i === selectedIndex,
      isEquipped: equippedUid === item.uid,
      isOnAnvil: anvilItemUid === item.uid,
      isCleared,
      isLocked,
      isAnvilMode,
    });
  }

  const itemsVisible = endIdx - startIdx;
  drawInventoryEmptySlots(container, itemsVisible);
  drawInventoryScrollIndicator(container, items.length, scrollRowOffset);

  const pulse = createInventorySelectionPulseOverlay(container, selectedIndex, startIdx, endIdx);
  if (!pulse) return { selectionPulseOverlay: null, selectionPulseRect: null };

  redrawInventorySelectionPulse(pulse.overlay, pulse.rect, selectionPulseTimer);
  return { selectionPulseOverlay: pulse.overlay, selectionPulseRect: pulse.rect };
}
