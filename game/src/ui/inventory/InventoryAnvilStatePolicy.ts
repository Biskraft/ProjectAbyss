import type { ItemInstance } from '@items/ItemInstance';

export type InventoryAnvilState = 'selecting' | 'placed';

export interface InventoryAnvilTransition {
  anvilState: InventoryAnvilState;
  anvilItem: ItemInstance | null;
}

export interface InventoryAnvilRemoveTransition extends InventoryAnvilTransition {
  selectedIndex: number;
}

export interface InventoryAnvilDiveTransition extends InventoryAnvilTransition {
  confirmedItem: ItemInstance | null;
}

export function placeInventoryAnvilItem(item: ItemInstance): InventoryAnvilTransition {
  return {
    anvilState: 'placed',
    anvilItem: item,
  };
}

export function removeInventoryAnvilItem(
  filteredItems: readonly ItemInstance[],
  anvilItem: ItemInstance | null,
  selectedIndex: number,
): InventoryAnvilRemoveTransition {
  const idx = anvilItem ? filteredItems.indexOf(anvilItem) : -1;
  return {
    anvilState: 'selecting',
    anvilItem: null,
    selectedIndex: idx >= 0 ? idx : selectedIndex,
  };
}

export function confirmInventoryAnvilDive(anvilItem: ItemInstance | null): InventoryAnvilDiveTransition {
  return {
    anvilState: 'selecting',
    anvilItem: null,
    confirmedItem: anvilItem,
  };
}
