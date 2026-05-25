import type { Anvil } from '@entities/Anvil';
import type { ItemInstance } from '@items/ItemInstance';
import { DEMO_BLOCK_REDIVE, isItemFullyCleared } from '@items/ItemInstance';
import type { Inventory } from '@items/Inventory';
import { STARTER_ONLY_IDS } from '@data/weapons';
import type { InventoryUI } from '@ui/InventoryUI';
import type { ToastManager } from '@ui/Toast';
import { t } from '@i18n';

interface AnvilPlacementDeps {
  getAnvil: () => Anvil | null;
  inventory: () => Inventory;
  inventoryUI: () => InventoryUI;
  toast: ToastManager;
  requestTetherFadeOut: () => void;
  hidePrompts: () => void;
  showCyclePrompt: (item: ItemInstance) => void;
  placeItem: (item: ItemInstance) => void;
}

export class AnvilPlacementController {
  constructor(private readonly deps: AnvilPlacementDeps) {}

  open(): void {
    const anvil = this.deps.getAnvil();
    if (!anvil || anvil.disabled) return;
    if (this.deps.inventory().items.length === 0) {
      this.deps.toast.show(t('toast.no_items_to_place'), 0xff4444);
      return;
    }

    this.deps.requestTetherFadeOut();
    this.deps.hidePrompts();
    this.deps.inventoryUI().openForAnvil((item) => this.handleSelectedItem(item));
  }

  private handleSelectedItem(item: ItemInstance): void {
    const { toast } = this.deps;
    const inventory = this.deps.inventory();
    const inventoryUI = this.deps.inventoryUI();

    if (inventory.equipped?.uid === item.uid) {
      toast.show(t('toast.unequip_first'), 0xff4444);
      return;
    }
    if (STARTER_ONLY_IDS.has(item.def.id)) {
      toast.show(t('toast.cannot_dive_broken'), 0xff4444);
      return;
    }
    if (isItemFullyCleared(item)) {
      if (DEMO_BLOCK_REDIVE) {
        toast.show(t('toast.memory_exhausted'), 0xff8844);
        inventoryUI.close();
        return;
      }
      this.deps.showCyclePrompt(item);
      return;
    }

    this.deps.placeItem(item);
  }
}
