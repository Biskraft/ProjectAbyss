import type { ItemInstance } from '@items/ItemInstance';
import type { ItemWorldEntryPushOptions } from './ItemWorldEntryPushTransition';
import type { ItemWorldEntryPreloader } from './ItemWorldEntryPreloader';
import type { ItemWorldEntryPushTransition } from './ItemWorldEntryPushTransition';

export interface ItemWorldSceneLike {
  onComplete: (() => void) | null;
  onPrologueEnd: (() => void) | null;
  readonly earnedGold: number;
}

interface WorldItemWorldSceneFlowRuntimeDeps {
  popScene: () => void;
  getUnlockedEvents: () => Set<string>;
  preloader: ItemWorldEntryPreloader;
  pushTransition: ItemWorldEntryPushTransition;
  preparePush: () => void;
  startReturnFade: () => void;
  restoreWorldAtAnvilReturnPoint: (resetAnvil: boolean) => void;
  updatePlayerAtk: () => void;
  isFirstItemWorldBossDefeated: () => boolean;
  showFirstItemWorldReturnInventoryHint: (hadFirstBossClear: boolean) => void;
  onEarnedGold: (amount: number) => void;
  createScene: (item: ItemInstance, entryCorridor: boolean) => ItemWorldSceneLike;
}

export class WorldItemWorldSceneFlowRuntime {
  private readonly completedReturns = new WeakSet<object>();

  constructor(private readonly deps: WorldItemWorldSceneFlowRuntimeDeps) {}

  prestream(item: ItemInstance, reason: string): void {
    this.deps.preloader.prestream(item, reason);
  }

  createScene(item: ItemInstance, entryCorridor: boolean): ItemWorldSceneLike {
    return this.deps.createScene(item, entryCorridor);
  }

  completeReturn(
    itemWorldScene: ItemWorldSceneLike,
    hadFirstBossClear: boolean,
    restoreAtAnvil?: boolean,
  ): void {
    if (this.completedReturns.has(itemWorldScene as object)) {
      return;
    }
    this.completedReturns.add(itemWorldScene as object);

    if (restoreAtAnvil !== undefined) {
      this.deps.restoreWorldAtAnvilReturnPoint(restoreAtAnvil);
    }
    this.deps.popScene();
    this.deps.startReturnFade();
    this.deps.updatePlayerAtk();

    if (this.deps.isFirstItemWorldBossDefeated()) {
      this.deps.getUnlockedEvents().add('__itemWorldTutorialDone');
    }
    this.deps.showFirstItemWorldReturnInventoryHint(hadFirstBossClear);

    if (itemWorldScene.earnedGold > 0) {
      this.deps.onEarnedGold(itemWorldScene.earnedGold);
    }
  }

  pushPrepared(
    itemWorldScene: ItemWorldSceneLike,
    options: ItemWorldEntryPushOptions = {},
  ): void {
    void this.deps.pushTransition.push(
      itemWorldScene,
      this.deps.preparePush,
      options,
    );
  }
}
