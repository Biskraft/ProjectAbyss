import type { ItemInstance } from './ItemInstance';
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

  /**
   * @deprecated 2026-05-24: 무기 미장착 상태 차단. 호출 시 no-op + 콘솔 경고.
   * 무기 교체는 항상 다른 무기를 직접 equip() 으로 수행해야 한다.
   */
  unequip(): void {
    console.warn('[Inventory] unequip() blocked — 무기 미장착 상태가 차단되어 있습니다 (2026-05-24).');
  }

  /** Total ATK from equipped weapon. 2026-05-24: 맨손 상태 제거 — 무기 미장착 시 0. */
  getWeaponAtk(): number {
    return this.equipped ? this.equipped.finalAtk : 0;
  }

  getById(uid: number): ItemInstance | undefined {
    return this.items.find(i => i.uid === uid);
  }
}
