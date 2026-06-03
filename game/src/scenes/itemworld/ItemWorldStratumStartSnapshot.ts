import type { ItemInstance } from '@items/ItemInstance';

export class ItemWorldStratumStartSnapshot {
  level = 0;
  atk = 0;
  innocentCount = 0;

  capture(item: ItemInstance): void {
    this.level = item.level;
    this.atk = item.finalAtk;
    this.innocentCount = item.innocents.length;
  }

  innocentsCapturedBy(item: ItemInstance): number {
    return item.innocents.length - this.innocentCount;
  }
}
