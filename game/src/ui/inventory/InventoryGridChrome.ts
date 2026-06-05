import { Container, Graphics } from 'pixi.js';
import { scrollThumbMetrics } from './InventoryLayout';
import {
  CELL_GAP,
  CELL_H,
  CELL_W,
  COL_BORDER,
  COL_DIM,
  GRID_COLS,
  GRID_ROWS,
  GRID_W,
} from './InventoryConstants';

export function drawInventoryEmptySlots(gridArea: Container, visibleItemCount: number): void {
  for (let i = visibleItemCount; i < GRID_ROWS * GRID_COLS; i++) {
    const col = i % GRID_COLS;
    const row = Math.floor(i / GRID_COLS);
    const cx = col * (CELL_W + CELL_GAP);
    const cy = row * (CELL_H + CELL_GAP);
    const slot = new Graphics();
    slot.rect(cx, cy, CELL_W, CELL_H).fill({ color: 0x0a0a0a, alpha: 0.3 });
    slot.rect(cx, cy, CELL_W, CELL_H).stroke({ color: 0x1e1e1e, width: 1 });
    gridArea.addChild(slot);
  }
}

export function drawInventoryScrollIndicator(
  gridArea: Container,
  itemCount: number,
  scrollRowOffset: number,
): void {
  const thumb = scrollThumbMetrics(itemCount, GRID_COLS, GRID_ROWS, CELL_H, CELL_GAP, scrollRowOffset);
  if (!thumb) return;

  const scroll = new Graphics();
  scroll.rect(GRID_W + 2, 0, 2, thumb.barH).fill({ color: COL_BORDER, alpha: 0.3 });
  scroll.rect(GRID_W + 2, thumb.thumbY, 2, thumb.thumbH).fill({ color: COL_DIM, alpha: 0.6 });
  gridArea.addChild(scroll);
}

export function createInventorySelectionPulseOverlay(
  gridArea: Container,
  selectedIndex: number,
  startIndex: number,
  endIndex: number,
): { overlay: Graphics; rect: { w: number; h: number } } | null {
  if (selectedIndex < startIndex || selectedIndex >= endIndex) return null;

  const localIdx = selectedIndex - startIndex;
  const col = localIdx % GRID_COLS;
  const row = Math.floor(localIdx / GRID_COLS);
  const pulse = new Graphics();
  pulse.x = col * (CELL_W + CELL_GAP);
  pulse.y = row * (CELL_H + CELL_GAP);
  gridArea.addChild(pulse);
  return { overlay: pulse, rect: { w: CELL_W, h: CELL_H } };
}
