import type { ItemInstance } from '@items/ItemInstance';

export class FixedItemWorldRuntime {
  private item: ItemInstance | null = null;
  private hadFirstBossClear = false;

  get isActive(): boolean {
    return this.item !== null;
  }

  get currentItem(): ItemInstance | null {
    return this.item;
  }

  begin(item: ItemInstance, hadFirstBossClear: boolean): void {
    this.item = item;
    this.hadFirstBossClear = hadFirstBossClear;
  }

  clear(): void {
    this.item = null;
    this.hadFirstBossClear = false;
  }

  consumeExitState(): { item: ItemInstance | null; hadFirstBossClear: boolean } {
    const state = {
      item: this.item,
      hadFirstBossClear: this.hadFirstBossClear,
    };
    this.clear();
    return state;
  }
}
