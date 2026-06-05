import type { ItemInstance } from '@items/ItemInstance';
import type { ItemWorldSceneLike } from './WorldItemWorldSceneFlowRuntime';
import { ItemWorldEntryPushTransition, type ItemWorldEntryPushOptions } from './ItemWorldEntryPushTransition';
import {
  applyItemWorldSceneCompletionLifecycle,
  createOneShotHandler,
} from './ItemWorldSceneCompletionHelpers';

interface WorldScenePortalItemWorldFlowRuntimeDeps {
  createItemWorldScene: (item: ItemInstance, entryCorridor: boolean) => ItemWorldSceneLike;
  pushTransition: ItemWorldEntryPushTransition;
  preparePush: () => void;
  popScene: () => void;
  updatePlayerAtk: () => void;
  getPlayerAtk: () => number;
  isFirstItemWorldBossDefeated: () => boolean;
  grantDungeonItem: (item: ItemInstance) => boolean;
  awardWeaponLevelUpToast: (item: ItemInstance) => void;
  awardDungeonItemToast: (item: ItemInstance) => void;
  awardAtkChangeToast: (prevAtk: number, nextAtk: number) => void;
  saveProgress: () => void;
}

export class WorldScenePortalItemWorldFlowRuntime {
  constructor(private readonly deps: WorldScenePortalItemWorldFlowRuntimeDeps) {}

  enterPortalDungeon(
    targetItem: ItemInstance,
    dungeonItem: ItemInstance | undefined,
    isAltar: boolean,
    prevLevel: number,
    prevAtk: number,
    pushOptions: ItemWorldEntryPushOptions = {},
  ): void {
    const itemWorldScene = this.deps.createItemWorldScene(targetItem, true);
    const hadFirstBossClear = this.deps.isFirstItemWorldBossDefeated();
    const completeFlow = createOneShotHandler(() => {
      this.deps.popScene();
      this.deps.updatePlayerAtk();
    });

    itemWorldScene.onComplete = createOneShotHandler(() => {
      completeFlow();
      applyItemWorldSceneCompletionLifecycle({
        targetItem,
        prevLevel,
        prevAtk,
        isAltar,
        dungeonItem,
        getCurrentAtk: () => this.deps.getPlayerAtk(),
        onAwardWeaponLevelUp: (item) => {
          this.deps.awardWeaponLevelUpToast(item);
        },
        onAwardDungeonItemToast: (item) => {
          this.deps.awardDungeonItemToast(item);
        },
        onAwardAtkDeltaToast: (before, after) => {
          this.deps.awardAtkChangeToast(before, after);
        },
        onGrantDungeonItem: (item) => this.deps.grantDungeonItem(item),
        hadFirstBossClear,
        onAfterCompletion: () => {
          this.deps.saveProgress();
        },
        completeReturn: () => {
          completeFlow();
        },
      });
    });

    void this.deps.pushTransition.push(
      itemWorldScene,
      this.deps.preparePush,
      {
        alreadyBlack: pushOptions.alreadyBlack ?? true,
        revealMs: pushOptions.revealMs ?? 0,
      },
    );
  }
}
