import { STRATA_BY_RARITY, type StrataConfig } from '@data/StrataConfig';
import {
  getOrCreateWorldProgress,
  resetItemForNextCycle,
  type ItemInstance,
  type ItemWorldProgress,
} from '@items/ItemInstance';

export interface ItemWorldRunEntryState {
  strataConfig: StrataConfig;
  progress: ItemWorldProgress;
  forcePrologue: boolean;
  resetCycle: number | null;
}

export function initializeItemWorldRunEntryState(options: {
  item: ItemInstance;
  forcePrologue: boolean;
}): ItemWorldRunEntryState {
  const { item, forcePrologue } = options;
  let strataConfig = STRATA_BY_RARITY[item.rarity];
  if (forcePrologue) {
    strataConfig = { ...strataConfig, strata: [strataConfig.strata[0]] };
  }

  let progress = getOrCreateWorldProgress(item);
  let resetCycle: number | null = null;
  if (progress.cleared) {
    resetItemForNextCycle(item);
    progress = getOrCreateWorldProgress(item);
    resetCycle = progress.cycle;
  }

  return {
    strataConfig,
    progress,
    forcePrologue,
    resetCycle,
  };
}
