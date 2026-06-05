import type { ItemInstance } from '@items/ItemInstance';

export interface InventoryAnvilPlacementInventory {
  items: ItemInstance[];
  equipped?: ItemInstance | null;
  equip(uid: number, silent?: boolean): void;
}

export function ensureInventoryAnvilPlacementAllowed(
  inventory: InventoryAnvilPlacementInventory,
  item: ItemInstance,
  isFirstDiveDone: boolean,
): boolean {
  if (inventory.equipped?.uid !== item.uid || isFirstDiveDone) return true;

  const fallback = inventory.items.find(candidate => candidate.uid !== item.uid);
  if (!fallback) return false;

  inventory.equip(fallback.uid, true);
  return true;
}
