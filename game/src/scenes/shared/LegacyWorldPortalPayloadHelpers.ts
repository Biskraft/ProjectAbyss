import type { PortalSourceType } from '@entities/Portal';
import type { Rarity } from '@data/weapons';
import type { ItemInstance } from '@items/ItemInstance';
import { createDungeonRewardItemByRarity } from '@items/ItemRewardFactory';

export interface LegacyWorldPendingPortalData {
  rarity: Rarity;
  sourceType: PortalSourceType;
  sourceItem?: ItemInstance;
}

export interface LegacyWorldPortalDungeonEntryPayload {
  targetItem: ItemInstance;
  dungeonItem: ItemInstance | undefined;
  isAltar: boolean;
  prevLevel: number;
  prevAtk: number;
}

export function prepareLegacyWorldPortalDungeonEntry(
  data: LegacyWorldPendingPortalData,
  prevAtk: number,
): LegacyWorldPortalDungeonEntryPayload {
  const isAltar = data.sourceType === 'altar';
  const dungeonItem = isAltar ? undefined : createDungeonRewardItemByRarity(data.rarity);
  const targetItem = isAltar ? data.sourceItem! : dungeonItem!;

  return {
    targetItem,
    dungeonItem,
    isAltar,
    prevLevel: targetItem.level,
    prevAtk,
  };
}
