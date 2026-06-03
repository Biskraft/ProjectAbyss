import { SWORD_DEFS } from '@data/weapons';
import type { Inventory } from '@items/Inventory';
import { createItem, getDisplayName } from '@items/ItemInstance';
import type { ItemInstance } from '@items/ItemInstance';
import type { Player } from '@entities/Player';
import { sacredSave } from '@save/PlayerSave';
import { t } from '@i18n';
import type { PortalEntryRuntime } from './PortalEntryRuntime';
import type { WorldFixedItemWorldFlowRuntime } from './WorldFixedItemWorldFlowRuntime';
import type { WorldItemWorldSceneFlowRuntime } from './WorldItemWorldSceneFlowRuntime';

interface WorldPortalItemWorldFlowRuntimeDeps {
  portalEntryRuntime: PortalEntryRuntime;
  fixedItemWorldFlow: WorldFixedItemWorldFlowRuntime;
  itemWorldSceneFlow: WorldItemWorldSceneFlowRuntime;
  getInventory: () => Inventory;
  getPlayer: () => Player;
  clearDamageNumbers: () => void;
  showToast: (message: string, color: number) => void;
  sacredPickupFlow: (item: ItemInstance, x: number, y: number) => void;
  fireWorldReturnDialogue: (weaponDefId: string) => void;
  retireAfterBossClear: (hadFirstBossClear: boolean) => void;
}

export class WorldPortalItemWorldFlowRuntime {
  constructor(private readonly deps: WorldPortalItemWorldFlowRuntimeDeps) {}

  completePendingEntry(): void {
    const data = this.deps.portalEntryRuntime.consume();
    if (!data) return;

    this.deps.portalEntryRuntime.destroyPendingEntity();

    if (this.deps.fixedItemWorldFlow.isActive) {
      this.deps.fixedItemWorldFlow.exit();
      return;
    }

    const isAltar = data.sourceType === 'altar';
    let dungeonItem: ItemInstance | undefined;
    if (!isAltar) {
      const defs = SWORD_DEFS.filter((d) => d.rarity === data.rarity);
      const def = defs.length > 0 ? defs[0] : SWORD_DEFS[0];
      dungeonItem = createItem(def, data.rarity);
    }

    const targetItem = isAltar ? data.sourceItem! : dungeonItem!;
    this.deps.itemWorldSceneFlow.prestream(targetItem, 'portal-entry');
    const prevLevel = targetItem.level;
    const prevAtk = this.deps.getPlayer().atk;
    const hadFirstBossClear = sacredSave.isFirstItemWorldBossDefeated();

    this.deps.clearDamageNumbers();

    const itemWorldScene = this.deps.itemWorldSceneFlow.createScene(targetItem, true);
    itemWorldScene.onComplete = () => {
      this.deps.itemWorldSceneFlow.completeReturn(itemWorldScene, hadFirstBossClear);
      this.deps.fireWorldReturnDialogue(targetItem.def.id);
      this.deps.retireAfterBossClear(hadFirstBossClear);

      if (isAltar) {
        if (targetItem.level > prevLevel) {
          this.deps.showToast(
            t('toast.weapon_level_up', { name: getDisplayName(targetItem), level: targetItem.level }),
            0xff88ff,
          );
        }
      } else if (this.deps.getInventory().add(dungeonItem!)) {
        this.deps.showToast(
          t('toast.item_acquired', {
            name: getDisplayName(dungeonItem!),
            rarity: dungeonItem!.rarity.toUpperCase(),
          }),
          0xffcc44,
        );
        const player = this.deps.getPlayer();
        this.deps.sacredPickupFlow(
          dungeonItem!,
          player.x + player.width / 2,
          player.y + player.height / 2,
        );
      }

      const player = this.deps.getPlayer();
      if (player.atk !== prevAtk) {
        this.deps.showToast(t('toast.atk_change', { prev: prevAtk, next: player.atk }), 0xffff44);
      }
    };

    this.deps.itemWorldSceneFlow.pushPrepared(itemWorldScene, { alreadyBlack: true, revealMs: 240 });
  }
}
