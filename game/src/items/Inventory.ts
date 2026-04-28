import type { ItemInstance } from './ItemInstance';
import { BARE_HAND_ATK } from '@data/rarityConfig';
import { trackItemEquip } from '@utils/Analytics';
import { ItemConst } from '@data/constData';

const MAX_SLOTS = ItemConst.MaxSlots;

export class Inventory {
  items: ItemInstance[] = [];
  equipped: ItemInstance | null = null;

  get isFull(): boolean {
    return this.items.length >= MAX_SLOTS;
  }

  add(item: ItemInstance): boolean {
    if (this.isFull) return false;
    this.items.push(item);
    return true;
  }

  remove(uid: number): ItemInstance | null {
    const idx = this.items.findIndex(i => i.uid === uid);
    if (idx === -1) return null;
    const [item] = this.items.splice(idx, 1);
    if (this.equipped?.uid === uid) {
      this.equipped = null;
    }
    return item;
  }

  /**
   * Equip an item by uid.
   * @param silent If true, skip telemetry (starter equip, save-load restore).
   */
  equip(uid: number, silent: boolean = false): void {
    const item = this.items.find(i => i.uid === uid);
    if (item) {
      const prev = this.equipped;
      this.equipped = item;
      if (!silent) {
        trackItemEquip({
          item_id: item.def.id,
          item_rarity: item.rarity,
          previous_rarity: prev?.rarity ?? 'none',
        });
      }
    }
  }

  unequip(): void {
    this.equipped = null;
  }

  /** Total ATK from equipped weapon (or bare hand) */
  getWeaponAtk(): number {
    return this.equipped ? this.equipped.finalAtk : BARE_HAND_ATK;
  }

  getById(uid: number): ItemInstance | undefined {
    return this.items.find(i => i.uid === uid);
  }
}
