import { Container, Graphics } from 'pixi.js';
import type { ItemInstance } from '@items/ItemInstance';
import { ItemImage } from '../ItemImage';

export function drawInventoryAnvilSlotBackground(
  container: Container,
  x: number,
  y: number,
  size: number,
  borderColor: number,
): void {
  const background = new Graphics();
  background.rect(x, y, size, size).fill({ color: 0x0d0d10, alpha: 0.8 });
  background.rect(x, y, size, size).stroke({ color: borderColor, width: 2 });
  container.addChild(background);
}

export function createInventoryAnvilPulseOverlay(
  container: Container,
  x: number,
  y: number,
): Graphics {
  const pulse = new Graphics();
  pulse.x = x;
  pulse.y = y;
  container.addChild(pulse);
  return pulse;
}

export function drawInventoryAnvilPlacedIcon(
  container: Container,
  item: ItemInstance,
  slotX: number,
  slotY: number,
  slotSize: number,
): void {
  const imgSize = slotSize - 12;
  const img = new ItemImage(item, imgSize);
  img.container.x = slotX + 6;
  img.container.y = slotY + 6;
  container.addChild(img.container);
}

export function updateInventoryDivePromptPulse(
  icon: Container,
  label: Container,
  timerMs: number,
): void {
  const t = timerMs / 1000;
  const pulse = 0.55 + 0.45 * Math.sin(t * Math.PI * 2 * 1.2);
  icon.alpha = pulse;
  label.alpha = pulse;
}
