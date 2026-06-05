import { Container, Graphics } from 'pixi.js';
import { createUiText } from '../factories';
import { COL_DIM, COL_KEY, COL_LOCKED } from './InventoryConstants';
import { drawAbyssNoise } from './InventoryAbyssNoise';

export interface InventoryStratumNoiseLayer {
  graphics: Graphics;
  cardY: number;
  cardH: number;
  cardW: number;
  top: number;
  bot: number;
  baseSeed: number;
}

export interface InventoryStratumCardSlot {
  slot: number;
  cardY: number;
  cardH: number;
  stratumIdx: number;
  level: number;
  isAvailable: boolean;
  isReached: boolean;
  isNext: boolean;
}

export function inventoryStratumCountForRarity(rarity: string): number {
  return ({
    normal: 1,
    magic: 2,
    rare: 3,
    legendary: 4,
    ancient: 5,
  } as const)[rarity] ?? 1;
}

export function inventoryStratumNextLevel(reached: number, totalStrata: number): number {
  return Math.min(reached + 1, totalStrata);
}

export function createInventoryStratumCardSlots(
  totalStrata: number,
  reached: number,
  totalH: number,
  startY: number,
): InventoryStratumCardSlot[] {
  const cardGap = 4;
  const cardHFull = Math.floor((totalH - cardGap * 2) * 0.4);
  const cardHHalf = Math.floor(cardHFull * 0.5);
  const firstVisibleIdx = Math.max(0, Math.min(totalStrata - 1, reached));
  const slotHeights = [cardHFull, cardHFull, cardHHalf];
  const next = inventoryStratumNextLevel(reached, totalStrata);
  const slots: InventoryStratumCardSlot[] = [];

  let cardY = startY;
  for (let slot = 0; slot < slotHeights.length; slot++) {
    const cardH = slotHeights[slot];
    const stratumIdx = firstVisibleIdx + slot;
    const level = stratumIdx + 1;
    const isAvailable = stratumIdx < totalStrata;
    const isReached = stratumIdx < reached;
    const isNext = isAvailable && level === next && !isReached;
    slots.push({ slot, cardY, cardH, stratumIdx, level, isAvailable, isReached, isNext });
    cardY += cardH + cardGap;
  }

  return slots;
}

export function createInventoryStratumCardBackground(
  cardY: number,
  cardW: number,
  cardH: number,
  isAvailable: boolean,
): Graphics {
  const card = new Graphics();
  card.rect(0, cardY, cardW, cardH).fill({ color: 0x161515, alpha: isAvailable ? 1 : 0.6 });
  return card;
}

export function drawInventoryStratumCardOutline(
  card: Graphics,
  cardY: number,
  cardW: number,
  cardH: number,
  isAvailable: boolean,
  isNext: boolean,
): void {
  if (isAvailable && !isNext) {
    card.rect(0, cardY, cardW, cardH).stroke({ color: 0x555555, width: 1 });
  }
  if (isNext) {
    card.rect(0, cardY, cardW, cardH).stroke({ color: COL_KEY, width: 2 });
  }
}

export function createInventoryStratumNoiseLayer(
  itemUid: number,
  stratumIdx: number,
  slot: number,
  cardY: number,
  cardH: number,
  cardW: number,
  tick: number,
): InventoryStratumNoiseLayer | null {
  const slotIntensity: Array<{ top: number; bot: number }> = [
    { top: 0,   bot: 0   },
    { top: 0.1, bot: 0.8 },
    { top: 0.8, bot: 1.0 },
  ];
  const { top, bot } = slotIntensity[slot] ?? { top: 0, bot: 0 };
  if (top <= 0.001 && bot <= 0.001) return null;

  const graphics = new Graphics();
  const baseSeed = itemUid * 257 + stratumIdx;
  drawAbyssNoise(graphics, {
    cardY,
    cardH,
    cardW,
    topIntensity: top,
    bottomIntensity: bot,
    seed: baseSeed + tick * 7919,
  });
  return { graphics, cardY, cardH, cardW, top, bot, baseSeed };
}

export function redrawInventoryStratumNoiseLayers(
  layers: readonly InventoryStratumNoiseLayer[],
  tick: number,
): void {
  for (const layer of layers) {
    layer.graphics.clear();
    drawAbyssNoise(layer.graphics, {
      cardY: layer.cardY,
      cardH: layer.cardH,
      cardW: layer.cardW,
      topIntensity: layer.top,
      bottomIntensity: layer.bot,
      seed: layer.baseSeed + tick * 7919,
    });
  }
}

export function drawInventoryStratumCardLabel(
  container: Container,
  label: string,
  cardY: number,
  cardW: number,
  isAvailable: boolean,
  isNext: boolean,
): void {
  const labelColor = isNext ? COL_KEY : (isAvailable ? COL_DIM : COL_LOCKED);
  const text = createUiText(label, { fontSize: 8, fill: labelColor });
  text.x = cardW - text.width - 4;
  text.y = cardY + 2;
  container.addChild(text);
}

export function drawInventoryStratumEmptyPlaceholder(
  container: Container,
  width: number,
  y: number,
): void {
  const placeholder = createUiText('-', { fontSize: 8, fill: COL_LOCKED });
  placeholder.x = 2 + Math.floor((width - placeholder.width) / 2);
  placeholder.y = y + 20;
  container.addChild(placeholder);
}
