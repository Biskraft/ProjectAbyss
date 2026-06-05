import { Graphics } from 'pixi.js';
import {
  COL_BORDER,
  COL_GAP,
  COL_PANEL_BG,
  INFO_COL_X,
  PADDING_V,
  PANEL_H,
  PANEL_W,
  STATUS_COL_X,
} from './InventoryConstants';

export function drawInventoryPanelBackground(gfx: Graphics): void {
  gfx.rect(0, 0, PANEL_W, PANEL_H).fill({ color: COL_PANEL_BG, alpha: 0.95 });
  gfx.rect(0, 0, PANEL_W, PANEL_H).stroke({ color: COL_BORDER, width: 1 });
}

export function createInventoryColumnDividers(): Graphics {
  const gfx = new Graphics();
  const y0 = PADDING_V;
  const y1 = PANEL_H - PADDING_V;
  const x1 = INFO_COL_X - Math.floor(COL_GAP / 2);
  const x2 = STATUS_COL_X - Math.floor(COL_GAP / 2);
  gfx.moveTo(x1, y0).lineTo(x1, y1).stroke({ color: COL_BORDER, width: 1 });
  gfx.moveTo(x2, y0).lineTo(x2, y1).stroke({ color: COL_BORDER, width: 1 });
  return gfx;
}
