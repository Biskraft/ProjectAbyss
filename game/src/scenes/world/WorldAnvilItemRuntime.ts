import type { Anvil } from '@entities/Anvil';
import type { Inventory } from '@items/Inventory';
import { getDisplayName, type ItemInstance } from '@items/ItemInstance';
import { t } from '@i18n';

interface WorldAnvilItemRuntimeDeps {
  getAnvil: () => Anvil | null;
  getInventory: () => Inventory;
  closeInventory: () => void;
  openAnvilPlacement: () => void;
  setEntryItem: (item: ItemInstance) => void;
  setReturnItem: (item: ItemInstance | null) => void;
  suppressPrompts: (durationMs: number) => void;
  showToast: (message: string, color: number) => void;
  flushInventoryHint: (delayMs: number) => void;
  restoreUiAfterDiveTransition: () => void;
  setSharedUiVisible: (visible: boolean) => void;
  hideUiForDiveTransition: () => void;
  markFirstDiveDone: () => void;
  triggerFloorCollapse: () => void;
}

export class WorldAnvilItemRuntime {
  constructor(private readonly deps: WorldAnvilItemRuntimeDeps) {}

  reclaimItem(): void {
    const anvil = this.deps.getAnvil();
    if (!anvil?.item) return;

    const item = anvil.item;
    const inventory = this.deps.getInventory();
    const alreadyInInventory = inventory.items.some(i => i.uid === item.uid);
    const added = alreadyInInventory || inventory.add(item);
    if (!added) {
      this.deps.showToast(t('toast.inventory_full'), 0xff4444);
      return;
    }

    anvil.clearPlacedItem();
    this.deps.setReturnItem(null);
    this.deps.suppressPrompts(1000);
    this.deps.flushInventoryHint(500);
    this.deps.showToast(t('toast.item_returned', { name: getDisplayName(item) }), 0xffd35a);
  }

  openInventory(): void {
    this.deps.restoreUiAfterDiveTransition();
    this.deps.setSharedUiVisible(true);
    this.deps.openAnvilPlacement();
  }

  placeItem(item: ItemInstance): void {
    const anvil = this.deps.getAnvil();
    if (!anvil) {
      this.deps.closeInventory();
      return;
    }

    this.deps.markFirstDiveDone();
    anvil.placeItem(item);
    this.deps.setEntryItem(item);
    this.deps.setReturnItem(item);
    this.deps.closeInventory();
    this.deps.hideUiForDiveTransition();
    this.deps.triggerFloorCollapse();
  }
}
