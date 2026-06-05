import { BitmapText, Container, Graphics } from 'pixi.js';
import type { ItemInstance } from '@items/ItemInstance';
import { ItemImage } from '../ItemImage';
import { PIXEL_FONT } from '../fonts';
import {
  CELL_H,
  CELL_W,
  COL_CLEARED,
  COL_EQUIPPED_BAR,
  COL_KEY,
  COL_LOCKED,
} from './InventoryConstants';

export interface InventoryGridCellState {
  rarityColor: number;
  isSelected: boolean;
  isEquipped: boolean;
  isOnAnvil: boolean;
  isCleared: boolean;
  isLocked: boolean;
  isAnvilMode: boolean;
}

export function drawInventoryGridCell(
  gridArea: Container,
  item: ItemInstance,
  cx: number,
  cy: number,
  state: InventoryGridCellState,
): void {
  const bg = new Graphics();
  bg.rect(cx, cy, CELL_W, CELL_H).fill({ color: 0x0d0d10, alpha: state.isOnAnvil ? 0.2 : 1 });
  if (state.isSelected) {
    bg.rect(cx, cy, CELL_W, CELL_H).stroke({ color: COL_KEY, width: 2 });
  } else if (state.isEquipped) {
    bg.rect(cx, cy, CELL_W, CELL_H).stroke({ color: COL_EQUIPPED_BAR, width: 1 });
  } else {
    bg.rect(cx, cy, CELL_W, CELL_H).stroke({ color: state.rarityColor, width: 1, alpha: 0.55 });
  }
  gridArea.addChild(bg);

  if (!state.isOnAnvil) {
    const iconSize = 32;
    const img = new ItemImage(item, iconSize);
    img.container.x = cx + Math.floor((CELL_W - iconSize) / 2);
    img.container.y = cy + Math.floor((CELL_H - iconSize) / 2);
    if (state.isLocked && state.isAnvilMode) img.container.alpha = 0.4;
    gridArea.addChild(img.container);
  }

  if (state.isEquipped) {
    const badge = new Graphics();
    badge.rect(cx, cy, 8, 7).fill(COL_EQUIPPED_BAR);
    gridArea.addChild(badge);
    const label = new BitmapText({ text: 'E', style: { fontFamily: PIXEL_FONT, fontSize: 6, fill: 0x000000 } });
    label.x = cx + 1;
    label.y = cy;
    gridArea.addChild(label);
  }

  if (state.isCleared && !state.isLocked) {
    const badge = new Graphics();
    badge.rect(cx + CELL_W - 12, cy + CELL_H - 7, 12, 7).fill({ color: COL_CLEARED, alpha: 0.85 });
    gridArea.addChild(badge);
    const label = new BitmapText({ text: 'CLR', style: { fontFamily: PIXEL_FONT, fontSize: 5, fill: 0x000000 } });
    label.x = cx + CELL_W - 11;
    label.y = cy + CELL_H - 7;
    gridArea.addChild(label);
  }

  if (state.isLocked && state.isAnvilMode) {
    const lock = new BitmapText({ text: '🔒', style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: COL_LOCKED } });
    lock.x = cx + Math.floor((CELL_W - 8) / 2);
    lock.y = cy + Math.floor((CELL_H - 8) / 2) + 2;
    gridArea.addChild(lock);
  }
}
