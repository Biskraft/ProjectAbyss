import type { Container } from 'pixi.js';
import type { ItemInstance } from '@items/ItemInstance';
import type { UnifiedGridData } from '@level/RoomGrid';
import { selectedInventoryItem } from './InventorySelection';
import { drawInventoryPlayerStatus } from './InventoryPlayerStatusDisplay';
import { drawInventoryStratumMinimapForItem } from './InventoryStratumMinimapDisplay';
import type { InventoryStratumNoiseLayer } from './InventoryStratumCardDisplay';
import type { InventoryUIMode } from './InventoryVisibilityStatePolicy';
import { clearInventoryContainer } from './InventoryShellDisplay';

export interface InventoryStatsLike {
  hp: number;
  maxHp: number;
  atk: number;
  abilities: string[];
}

export interface InventoryRightColumnArgs {
  statusArea: Container;
  mode: InventoryUIMode;
  playerStats: InventoryStatsLike | null;
  filteredItems: readonly ItemInstance[];
  selectedIndex: number;
  anvilItem: ItemInstance | null;
  equippedItem: ItemInstance | null | undefined;
  abyssNoiseTick: number;
  unifiedGridCache: Map<string, UnifiedGridData | null>;
}

export interface InventoryRightColumnResult {
  abyssNoiseLayers: InventoryStratumNoiseLayer[];
}

export function drawInventoryRightColumn(args: InventoryRightColumnArgs): InventoryRightColumnResult {
  clearInventoryContainer(args.statusArea);
  if (args.mode === 'anvil') {
    const selectedItem = selectedInventoryItem(args.filteredItems, args.selectedIndex);
    const stratumItem = args.anvilItem ?? selectedItem;
    const minimap = drawInventoryStratumMinimapForItem({
      container: args.statusArea,
      item: stratumItem,
      abyssNoiseTick: args.abyssNoiseTick,
      unifiedGridCache: args.unifiedGridCache,
    });
    return {
      abyssNoiseLayers: minimap.abyssNoiseLayers,
    };
  }

  drawInventoryPlayerStatus(
    args.statusArea,
    args.playerStats,
    selectedInventoryItem(args.filteredItems, args.selectedIndex),
    args.equippedItem ?? undefined,
  );
  return { abyssNoiseLayers: [] };
}
