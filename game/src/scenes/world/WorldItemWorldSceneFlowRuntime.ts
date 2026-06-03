import type { Game } from '../../Game';
import type { Inventory } from '@items/Inventory';
import type { ItemInstance } from '@items/ItemInstance';
import type { Player } from '@entities/Player';
import { ItemWorldScene } from '../ItemWorldScene';
import type { ItemWorldEntryPushOptions } from './ItemWorldEntryPushTransition';
import type { ItemWorldEntryPreloader } from './ItemWorldEntryPreloader';
import type { ItemWorldEntryPushTransition } from './ItemWorldEntryPushTransition';

interface CompleteReturnOptions {
  restoreAtAnvil?: boolean;
}

interface WorldItemWorldSceneFlowRuntimeDeps {
  game: Game;
  getInventory: () => Inventory;
  getPlayer: () => Player;
  getUnlockedEvents: () => Set<string>;
  preloader: ItemWorldEntryPreloader;
  pushTransition: ItemWorldEntryPushTransition;
  preparePush: () => void;
  restoreWorldAtAnvilReturnPoint: (resetAnvil: boolean) => void;
  startItemWorldReturnFadeIn: () => void;
  updatePlayerAtk: () => void;
  isFirstItemWorldBossDefeated: () => boolean;
  showFirstItemWorldReturnInventoryHint: (hadFirstBossClear: boolean) => void;
  onEarnedGold: (amount: number) => void;
}

export class WorldItemWorldSceneFlowRuntime {
  constructor(private readonly deps: WorldItemWorldSceneFlowRuntimeDeps) {}

  prestream(item: ItemInstance, reason: string): void {
    this.deps.preloader.prestream(item, reason);
  }

  createScene(item: ItemInstance, entryCorridor: boolean): ItemWorldScene {
    const itemWorldScene = new ItemWorldScene(
      this.deps.game,
      item,
      this.deps.getInventory(),
      this.deps.getPlayer(),
      { entryCorridor },
    );
    const unlockedEvents = this.deps.getUnlockedEvents();
    itemWorldScene.itemWorldTutorialDone = unlockedEvents.has('__itemWorldTutorialDone');
    itemWorldScene.egoUnlockedEvents = unlockedEvents;
    return itemWorldScene;
  }

  completeReturn(
    itemWorldScene: ItemWorldScene,
    hadFirstBossClear: boolean,
    options: CompleteReturnOptions = {},
  ): void {
    if (options.restoreAtAnvil !== undefined) {
      this.deps.restoreWorldAtAnvilReturnPoint(options.restoreAtAnvil);
    }
    this.deps.game.sceneManager.pop();
    this.deps.startItemWorldReturnFadeIn();
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
    itemWorldScene: ItemWorldScene,
    options: ItemWorldEntryPushOptions = {},
  ): void {
    void this.deps.pushTransition.push(
      itemWorldScene,
      () => this.deps.preparePush(),
      options,
    );
  }
}
