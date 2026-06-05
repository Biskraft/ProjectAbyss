import { Container, Graphics } from 'pixi.js';
import type { ItemInstance } from '@items/ItemInstance';
import type { UnifiedGridData } from '@level/RoomGrid';
import {
  CONTENT_START_Y,
  PANEL_H,
  STATUS_W,
} from './InventoryConstants';
import {
  createInventoryStratumCardBackground,
  createInventoryStratumCardSlots,
  createInventoryStratumNoiseLayer,
  drawInventoryStratumCardLabel,
  drawInventoryStratumCardOutline,
  drawInventoryStratumEmptyPlaceholder,
  inventoryStratumCountForRarity,
  type InventoryStratumNoiseLayer,
} from './InventoryStratumCardDisplay';
import { buildInventoryStratumUnified } from './InventoryStratumDataBuilder';
import { drawInventoryStratumPixelMap } from './InventoryStratumRoomRender';

export type InventoryStratumPixelMapRenderer = (
  card: Graphics,
  item: ItemInstance,
  stratumIndex: number,
  cardY: number,
  cardH: number,
  cardW: number,
) => void;

export function drawInventoryStratumMinimap(
  container: Container,
  item: ItemInstance | undefined,
  abyssNoiseTick: number,
  renderPixelMap: InventoryStratumPixelMapRenderer,
): InventoryStratumNoiseLayer[] {
  const noiseLayers: InventoryStratumNoiseLayer[] = [];
  const y = 0;
  const width = STATUS_W - 6;

  if (!item) {
    drawInventoryStratumEmptyPlaceholder(container, width, y);
    return noiseLayers;
  }

  const totalStrata = inventoryStratumCountForRarity(item.rarity);
  const reached = item.worldProgress?.deepestUnlocked ?? 0;
  const totalH = PANEL_H - CONTENT_START_Y - 20;
  const cardSlots = createInventoryStratumCardSlots(totalStrata, reached, totalH, y);

  for (const { slot, cardY, cardH, stratumIdx, level, isAvailable, isNext } of cardSlots) {
    const card = createInventoryStratumCardBackground(cardY, width, cardH, isAvailable);

    if (isAvailable) {
      renderPixelMap(card, item, level - 1, cardY, cardH, width);
    }

    drawInventoryStratumCardOutline(card, cardY, width, cardH, isAvailable, isNext);
    container.addChild(card);

    const noiseLayer = createInventoryStratumNoiseLayer(item.uid ?? 0, stratumIdx, slot, cardY, cardH, width, abyssNoiseTick);
    if (noiseLayer) {
      container.addChild(noiseLayer.graphics);
      noiseLayers.push(noiseLayer);
    }

    drawInventoryStratumCardLabel(container, `S${level}`, cardY, width, isAvailable, isNext);
  }

  return noiseLayers;
}

export interface InventoryStratumMinimapForItemArgs {
  container: Container;
  item: ItemInstance | undefined;
  abyssNoiseTick: number;
  unifiedGridCache: Map<string, UnifiedGridData | null>;
}

export interface InventoryStratumMinimapForItemResult {
  abyssNoiseLayers: InventoryStratumNoiseLayer[];
}

export function drawInventoryStratumMinimapForItem(
  args: InventoryStratumMinimapForItemArgs,
): InventoryStratumMinimapForItemResult {
  const unified = args.item === undefined ? null : buildInventoryStratumUnified(args.item, args.unifiedGridCache);
  if (!unified) {
    return {
      abyssNoiseLayers: drawInventoryStratumMinimap(
        args.container,
        args.item,
        args.abyssNoiseTick,
        () => {
          return;
        },
      ),
    };
  }

  return {
    abyssNoiseLayers: drawInventoryStratumMinimap(
      args.container,
      args.item,
      args.abyssNoiseTick,
      (card, item, stratumIndex, cardY, cardH, cardW) => {
        drawInventoryStratumPixelMap(
          card,
          unified,
          item.uid,
          stratumIndex,
          cardY,
          cardH,
          cardW,
        );
      },
    ),
  };
}
