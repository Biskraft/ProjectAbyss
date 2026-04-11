import type { ItemInstance } from './ItemInstance';

const MAX_SLOTS = 20;
const BARE_HAND_ATK = 5;

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

  equip(uid: number): void {
    const item = this.items.find(i => i.uid === uid);
    if (item) {
      this.equipped = item;
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
