import type { ItemInstance } from '@items/ItemInstance';

export interface ItemWorldSceneCompletionRewardOptions {
  targetItem: ItemInstance;
  prevLevel: number;
  prevAtk: number;
  isAltar: boolean;
  dungeonItem: ItemInstance | undefined;
  getCurrentAtk: () => number;
  onAwardWeaponLevelUp: (item: ItemInstance) => void;
  onAwardDungeonItemToast: (item: ItemInstance) => void;
  onAwardAtkDeltaToast: (prevAtk: number, nextAtk: number) => void;
  onGrantDungeonItem?: (item: ItemInstance) => boolean;
}

export interface ItemWorldSceneCompletionRewardResult {
  didGrantDungeonItem: boolean;
}

export interface ItemWorldSceneCompletionLifecycleOptions extends ItemWorldSceneCompletionRewardOptions {
  completeReturn: () => void;
  hadFirstBossClear: boolean;
  onAfterCompletion: (result: ItemWorldSceneCompletionLifecycleResult) => void;
}

export interface ItemWorldSceneCompletionLifecycleResult extends ItemWorldSceneCompletionRewardResult {
  hadFirstBossClear: boolean;
}

export function createOneShotHandler<T extends () => void>(handler: T): T {
  let called = false;

  return (() => {
    if (called) return;
    called = true;
    return handler();
  }) as T;
}

export function applyItemWorldSceneCompletionRewards(
  options: ItemWorldSceneCompletionRewardOptions,
): ItemWorldSceneCompletionRewardResult {
  const {
    targetItem,
    prevLevel,
    prevAtk,
    isAltar,
    dungeonItem,
    getCurrentAtk,
    onAwardWeaponLevelUp,
    onAwardDungeonItemToast,
    onAwardAtkDeltaToast,
    onGrantDungeonItem,
  } = options;

  if (isAltar) {
    if (targetItem.level > prevLevel) {
      onAwardWeaponLevelUp(targetItem);
    }
    const nextAtk = getCurrentAtk();
    if (nextAtk !== prevAtk) {
      onAwardAtkDeltaToast(prevAtk, nextAtk);
    }
    return { didGrantDungeonItem: false };
  }

  let didGrantDungeonItem = false;
  if (dungeonItem && (!onGrantDungeonItem || onGrantDungeonItem(dungeonItem))) {
    didGrantDungeonItem = true;
    onAwardDungeonItemToast(dungeonItem);
  }

  const nextAtk = getCurrentAtk();
  if (nextAtk !== prevAtk) {
    onAwardAtkDeltaToast(prevAtk, nextAtk);
  }

  return { didGrantDungeonItem };
}

export function applyItemWorldSceneCompletionLifecycle(
  options: ItemWorldSceneCompletionLifecycleOptions,
): ItemWorldSceneCompletionLifecycleResult {
  const { completeReturn, onAfterCompletion, hadFirstBossClear, ...rewardOptions } = options;
  completeReturn();
  const rewardResult = applyItemWorldSceneCompletionRewards(rewardOptions);
  const result: ItemWorldSceneCompletionLifecycleResult = {
    ...rewardResult,
    hadFirstBossClear,
  };
  onAfterCompletion(result);
  return result;
}
