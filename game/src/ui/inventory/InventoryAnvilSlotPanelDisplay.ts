import { Container, Graphics } from 'pixi.js';
import { type ItemInstance, RARITY_COLOR } from '@items/ItemInstance';
import { redrawInventoryAnvilPulse, type InventorySelectionPulseRect } from './InventorySelectionPulse';
import { drawInventoryAnvilMeta } from './InventoryAnvilMetaDisplay';
import { drawInventoryAnvilActionHints } from './InventoryActionHintDisplay';
import {
  createInventoryAnvilPulseOverlay,
  drawInventoryAnvilPlacedIcon,
  drawInventoryAnvilSlotBackground,
} from './InventoryAnvilSlotDisplay';
import {
  COL_BORDER,
  CONTENT_START_Y,
  INFO_W,
  PADDING_V,
  PANEL_H,
} from './InventoryConstants';

export interface InventoryAnvilSlotPanelResult {
  activeItem: ItemInstance | null;
  radialBaseY: number;
  anvilPulseOverlay: Graphics | null;
  anvilPulseRect: InventorySelectionPulseRect | null;
  divePromptIcon: Container | null;
  divePromptLabel: Container | null;
}

export function drawInventoryAnvilSlotPanel(
  container: Container,
  anvilItem: ItemInstance | null,
  selectedItem: ItemInstance | undefined,
  anvilPulseTimer: number,
): InventoryAnvilSlotPanelResult {
  const placedItem = anvilItem;
  const hasItem = !!placedItem;
  const activeItem = placedItem ?? selectedItem ?? null;
  const slotSize = 48;
  const slotX = 4;
  const slotY = 4;

  const borderColor = placedItem ? (RARITY_COLOR[placedItem.rarity] ?? 0xffffff) : COL_BORDER;
  drawInventoryAnvilSlotBackground(container, slotX, slotY, slotSize, borderColor);

  let anvilPulseOverlay: Graphics | null = null;
  let anvilPulseRect: InventorySelectionPulseRect | null = null;

  if (!placedItem) {
    anvilPulseOverlay = createInventoryAnvilPulseOverlay(container, slotX, slotY);
    anvilPulseRect = { w: slotSize, h: slotSize };
    redrawInventoryAnvilPulse(anvilPulseOverlay, anvilPulseRect, anvilPulseTimer);

    if (activeItem) {
      const rarityColor = RARITY_COLOR[activeItem.rarity] ?? 0xffffff;
      const metaX = slotX + slotSize + 8;
      const metaW = INFO_W - metaX - 4;
      drawInventoryAnvilMeta(container, activeItem, metaX, slotY + 2, metaW, rarityColor, {
        nameFontSize: 9,
        breakWords: true,
      });
    }
  } else {
    const rarityColor = RARITY_COLOR[placedItem.rarity] ?? 0xffffff;

    drawInventoryAnvilPlacedIcon(container, placedItem, slotX, slotY, slotSize);

    const metaX = slotX + slotSize + 8;
    const metaW = INFO_W - metaX - 4;
    drawInventoryAnvilMeta(container, placedItem, metaX, slotY + 2, metaW, rarityColor, {
      nameFontSize: 12,
    });
  }

  const hints = drawInventoryAnvilActionHints(
    container,
    hasItem,
    PANEL_H - CONTENT_START_Y - PADDING_V - 16,
  );

  return {
    activeItem,
    radialBaseY: slotY + slotSize + 12,
    anvilPulseOverlay,
    anvilPulseRect,
    divePromptIcon: hints.divePromptIcon,
    divePromptLabel: hints.divePromptLabel,
  };
}
