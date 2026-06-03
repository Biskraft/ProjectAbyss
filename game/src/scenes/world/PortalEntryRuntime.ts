import type { Rarity } from '@data/weapons';
import type { Portal, PortalSourceType } from '@entities/Portal';
import type { ItemInstance } from '@items/ItemInstance';

export interface PendingPortalEntry {
  rarity: Rarity;
  sourceType: PortalSourceType;
  sourceItem?: ItemInstance;
}

export class PortalEntryRuntime {
  private pendingData: PendingPortalEntry | null = null;
  private pendingEntity: Portal | null = null;

  begin(portal: Portal): PendingPortalEntry {
    const data: PendingPortalEntry = {
      rarity: portal.rarity,
      sourceType: portal.sourceType,
      sourceItem: portal.sourceItem,
    };
    this.pendingData = data;
    this.pendingEntity = portal;
    return data;
  }

  consume(): PendingPortalEntry | null {
    const data = this.pendingData;
    this.pendingData = null;
    return data;
  }

  destroyPendingEntity(): void {
    this.pendingEntity?.destroy();
    this.pendingEntity = null;
  }

  clear(): void {
    this.pendingData = null;
    this.destroyPendingEntity();
  }
}
