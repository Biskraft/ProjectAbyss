import type { ItemInstance } from '@items/ItemInstance';
import type { Anvil } from '@entities/Anvil';
import type { Player } from '@entities/Player';
import type { FixedItemWorldRuntime } from './FixedItemWorldRuntime';
import type { ItemWorldSceneLike, WorldItemWorldSceneFlowRuntime } from './WorldItemWorldSceneFlowRuntime';
import type { AnvilItemWorldReturnState } from './AnvilReturnState';
import { getDisplayName } from '@items/ItemInstance';
import { t } from '@i18n';
import {
  applyItemWorldSceneCompletionLifecycle,
  createOneShotHandler,
} from './ItemWorldSceneCompletionHelpers';

interface WorldFixedItemWorldFlowRuntimeDeps {
  fixedItemWorld: FixedItemWorldRuntime;
  itemWorldSceneFlow: WorldItemWorldSceneFlowRuntime;
  createItemWorldScene: (item: ItemInstance, entryCorridor: boolean) => ItemWorldSceneLike;
  returnState: AnvilItemWorldReturnState;
  getAnvil: () => Anvil | null;
  getPlayer: () => Player;
  snapCamera: (x: number, y: number) => void;
  restoreUiAfterDiveTransition: () => void;
  hasLevel: (levelId: string) => boolean;
  loadLevel: (levelId: string, enterFrom: 'down') => void;
  setEntryItem: (item: ItemInstance | null) => void;
  clearEntryItem: () => void;
  setInTunnel: (inTunnel: boolean) => void;
  getAnvilReturnLevelId: () => string | null;
  getPreTunnelLevelId: () => string | null;
  clearPreTunnelLevelId: () => void;
  getFallbackLevelId: () => string;
  setWorldVisualsReleased: (released: boolean) => void;
  resetEdgeTransition: () => void;
  isFirstItemWorldBossDefeated: () => boolean;
  getUnlockedEvents: () => Set<string>;
  showFirstItemWorldReturnInventoryHint: (hadFirstBossClear: boolean) => void;
  showToast: (message: string, color: number) => void;
  getPlayerAtk: () => number;
  fireWorldReturnDialogue: (weaponDefId: string) => void;
  retireAfterBossClear: (hadFirstBossClear: boolean) => void;
}

export class WorldFixedItemWorldFlowRuntime {
  constructor(private readonly deps: WorldFixedItemWorldFlowRuntimeDeps) {}

  clear(): void {
    this.deps.fixedItemWorld.clear();
  }

  enter(item: ItemInstance, levelIdOverride?: string): void {
    this.deps.restoreUiAfterDiveTransition();
    // Override routes a fixed dive without permanently tagging the item
    // (scene-driven prologue dive); falls back to the item's own fixedLevelId.
    const levelId = levelIdOverride ?? item.fixedLevelId;
    if (!levelId) return;

    if (!this.deps.hasLevel(levelId)) {
      console.error(`[LdtkWorldScene] Fixed item world level not found: "${levelId}"`);
      this.enterProceduralFallback(item);
      return;
    }

    this.deps.fixedItemWorld.begin(item, this.deps.isFirstItemWorldBossDefeated());
    this.deps.setInTunnel(false);
    this.deps.loadLevel(levelId, 'down');
  }

  exit(): void {
    const { item: completedItem, hadFirstBossClear } = this.deps.fixedItemWorld.consumeExitState();
    this.deps.clearEntryItem();

    this.deps.resetEdgeTransition();
    const returnLevel = this.deps.getAnvilReturnLevelId()
      ?? this.deps.getPreTunnelLevelId()
      ?? this.deps.getFallbackLevelId();
    this.deps.clearPreTunnelLevelId();
    this.deps.loadLevel(returnLevel, 'down');
    this.deps.setWorldVisualsReleased(false);
    this.deps.returnState.placePlayer(this.deps.getPlayer(), this.deps.getAnvil(), this.deps.snapCamera);

    if (this.deps.isFirstItemWorldBossDefeated()) {
      this.deps.getUnlockedEvents().add('__itemWorldTutorialDone');
    }
    this.deps.showFirstItemWorldReturnInventoryHint(hadFirstBossClear);
    if (completedItem) {
      this.deps.fireWorldReturnDialogue(completedItem.def.id);
    }
    this.deps.retireAfterBossClear(hadFirstBossClear);
  }

  private enterProceduralFallback(item: ItemInstance): void {
    this.deps.setEntryItem(item);
    const prevLevel = item.level;
    const prevAtk = this.deps.getPlayerAtk();
    const hadFirstBossClear = this.deps.isFirstItemWorldBossDefeated();
    const itemWorldScene = this.deps.createItemWorldScene(item, true);
    itemWorldScene.onComplete = createOneShotHandler(() => {
      applyItemWorldSceneCompletionLifecycle({
        targetItem: item,
        prevLevel,
        prevAtk,
        isAltar: true,
        dungeonItem: undefined,
        getCurrentAtk: () => this.deps.getPlayerAtk(),
        onAwardWeaponLevelUp: (awardedItem) => {
          this.deps.showToast(
            t('toast.weapon_level_up', { name: getDisplayName(awardedItem), level: awardedItem.level }),
            0xff88ff,
          );
        },
        onAwardDungeonItemToast: () => {
          // no-op for fixed item world fallback
        },
        onAwardAtkDeltaToast: (before, after) => {
          this.deps.showToast(t('toast.atk_change', { prev: before, next: after }), 0xffff44);
        },
        hadFirstBossClear,
        onAfterCompletion: () => {
          this.deps.fireWorldReturnDialogue(item.def.id);
          this.deps.retireAfterBossClear(hadFirstBossClear);
        },
        completeReturn: () => {
          this.deps.itemWorldSceneFlow.completeReturn(
            itemWorldScene,
            hadFirstBossClear,
            false,
          );
        },
      });
    });
    this.deps.itemWorldSceneFlow.pushPrepared(itemWorldScene, { alreadyBlack: true, revealMs: 240 });
  }
}
