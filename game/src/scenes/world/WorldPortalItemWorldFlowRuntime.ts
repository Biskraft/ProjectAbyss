import type { Inventory } from '@items/Inventory';
import { getDisplayName } from '@items/ItemInstance';
import type { ItemInstance } from '@items/ItemInstance';
import { createDungeonRewardItemByRarity } from '@items/ItemRewardFactory';
import type { Player } from '@entities/Player';
import { t } from '@i18n';
import type { PortalEntryRuntime } from './PortalEntryRuntime';
import type { ItemWorldSceneLike } from './WorldItemWorldSceneFlowRuntime';
import type { WorldItemWorldSceneFlowRuntime } from './WorldItemWorldSceneFlowRuntime';
import {
  applyItemWorldSceneCompletionLifecycle,
  createOneShotHandler,
} from './ItemWorldSceneCompletionHelpers';

interface WorldPortalItemWorldFlowRuntimeDeps {
  portalEntryRuntime: PortalEntryRuntime;
  itemWorldSceneFlow: WorldItemWorldSceneFlowRuntime;
  createItemWorldScene: (item: ItemInstance, entryCorridor: boolean) => ItemWorldSceneLike;
  isFixedItemWorldActive: () => boolean;
  exitFixedItemWorldFlow: () => void;
  getInventory: () => Inventory;
  getPlayer: () => Player;
  clearDamageNumbers: () => void;
  showToast: (message: string, color: number) => void;
  sacredPickupFlow: (item: ItemInstance, x: number, y: number) => void;
  fireWorldReturnDialogue: (weaponDefId: string) => void;
  retireAfterBossClear: (hadFirstBossClear: boolean) => void;
  isFirstItemWorldBossDefeated: () => boolean;
}

export class WorldPortalItemWorldFlowRuntime {
  constructor(private readonly deps: WorldPortalItemWorldFlowRuntimeDeps) {}

  completePendingEntry(): void {
    const data = this.deps.portalEntryRuntime.consume();
    if (!data) return;

    this.deps.portalEntryRuntime.destroyPendingEntity();

    if (this.deps.isFixedItemWorldActive()) {
      this.deps.exitFixedItemWorldFlow();
      return;
    }

    const isAltar = data.sourceType === 'altar';
    let dungeonItem: ItemInstance | undefined;
    if (!isAltar) {
      dungeonItem = createDungeonRewardItemByRarity(data.rarity);
    }

    const targetItem = isAltar ? data.sourceItem! : dungeonItem!;
    this.deps.itemWorldSceneFlow.prestream(targetItem, 'portal-entry');
    const prevLevel = targetItem.level;
    const prevAtk = this.deps.getPlayer().atk;
    const hadFirstBossClear = this.deps.isFirstItemWorldBossDefeated();

    this.deps.clearDamageNumbers();

    const itemWorldScene = this.deps.createItemWorldScene(targetItem, true);
    itemWorldScene.onComplete = createOneShotHandler(() => {
      const player = this.deps.getPlayer();

      applyItemWorldSceneCompletionLifecycle({
        targetItem,
        prevLevel,
        prevAtk,
        isAltar,
        dungeonItem,
        getCurrentAtk: () => player.atk,
        onAwardWeaponLevelUp: (item) => {
          this.deps.showToast(
            t('toast.weapon_level_up', { name: getDisplayName(item), level: item.level }),
            0xff88ff,
          );
        },
        onAwardDungeonItemToast: (item) => {
          this.deps.showToast(
            t('toast.item_acquired', {
              name: getDisplayName(item),
              rarity: item.rarity.toUpperCase(),
            }),
            0xffcc44,
          );
        },
        onAwardAtkDeltaToast: (before, after) => {
          this.deps.showToast(t('toast.atk_change', { prev: before, next: after }), 0xffff44);
        },
        onGrantDungeonItem: (item) => {
          return this.deps.getInventory().add(item);
        },
        hadFirstBossClear,
        onAfterCompletion: ({ didGrantDungeonItem }) => {
          this.deps.fireWorldReturnDialogue(targetItem.def.id);
          this.deps.retireAfterBossClear(hadFirstBossClear);
          if (didGrantDungeonItem) {
            this.deps.sacredPickupFlow(
              dungeonItem!,
              player.x + player.width / 2,
              player.y + player.height / 2,
            );
          }
        },
        completeReturn: () => {
          this.deps.itemWorldSceneFlow.completeReturn(itemWorldScene, hadFirstBossClear);
        },
      });
    });

    this.deps.itemWorldSceneFlow.pushPrepared(itemWorldScene, { alreadyBlack: true, revealMs: 240 });
  }
}
