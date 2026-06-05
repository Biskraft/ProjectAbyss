import type { Graphics } from 'pixi.js';
import {
  drawSelectionPulse,
  ROW_SELECTED_GLOW,
  ROW_SELECTED_GLOW_ALPHA,
  ROW_SELECTED_GLOW_INNER,
} from '../ModalPanel';

export interface InventorySelectionPulseRect {
  w: number;
  h: number;
}

export function redrawInventorySelectionPulse(
  overlay: Graphics,
  rect: InventorySelectionPulseRect,
  timerMs: number,
): void {
  const seconds = timerMs / 1000;
  const alpha = ROW_SELECTED_GLOW_ALPHA * (0.65 + 0.35 * Math.sin(seconds * Math.PI * 2 * 1.4));
  overlay.clear();
  drawSelectionPulse(overlay, rect.w, rect.h, alpha);
}

export function redrawInventoryAnvilPulse(
  overlay: Graphics,
  rect: InventorySelectionPulseRect,
  timerMs: number,
): void {
  const seconds = timerMs / 1000;
  const alpha = ROW_SELECTED_GLOW_ALPHA * (0.55 + 0.45 * Math.sin(seconds * Math.PI * 2 * 1.2));
  overlay.clear();
  overlay
    .rect(0, 0, rect.w, rect.h)
    .stroke({ color: ROW_SELECTED_GLOW, width: 2, alpha });
  overlay
    .rect(1, 1, rect.w - 2, rect.h - 2)
    .stroke({ color: ROW_SELECTED_GLOW_INNER, width: 1, alpha: Math.min(1, alpha * 0.85) });
}
