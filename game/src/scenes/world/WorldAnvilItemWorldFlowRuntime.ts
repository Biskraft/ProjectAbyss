import type { Rarity } from '@data/weapons';
import type { Player } from '@entities/Player';
import type { ItemInstance } from '@items/ItemInstance';
import { getDisplayName } from '@items/ItemInstance';
import { t } from '@i18n';
import type { WorldFixedItemWorldFlowRuntime } from './WorldFixedItemWorldFlowRuntime';
import type { ItemWorldSceneLike, WorldItemWorldSceneFlowRuntime } from './WorldItemWorldSceneFlowRuntime';
import {
  applyItemWorldSceneCompletionLifecycle,
  createOneShotHandler,
} from './ItemWorldSceneCompletionHelpers';

type TunnelEnterFrom = 'up' | 'down';

interface WorldAnvilItemWorldFlowRuntimeDeps {
  itemWorldSceneFlow: WorldItemWorldSceneFlowRuntime;
  createItemWorldScene: (item: ItemInstance, entryCorridor: boolean) => ItemWorldSceneLike;
  fixedItemWorldFlow: WorldFixedItemWorldFlowRuntime;
  getEntryItem: () => ItemInstance | null;
  getPlayer: () => Player;
  getCurrentLevelId: () => string | null;
  setPreTunnelLevelId: (levelId: string) => void;
  setInTunnel: (inTunnel: boolean) => void;
  hideMinimap: () => void;
  hasLevel: (levelId: string) => boolean;
  loadLevel: (levelId: string, enterFrom: TunnelEnterFrom) => void;
  restoreUiAfterDiveTransition: () => void;
  clearDamageNumbers: () => void;
  isFirstItemWorldBossDefeated: () => boolean;
  showToast: (message: string, color: number) => void;
  fireWorldReturnDialogue: (weaponDefId: string) => void;
  retireAfterBossClear: (hadFirstBossClear: boolean) => void;
  /** Prologue end transition target for the next chapter (Start_Room_01 when coming from prologue flow). */
  enterChapter1FromPrologue: () => void;
}

export class WorldAnvilItemWorldFlowRuntime {
  private static readonly TUNNEL_BY_RARITY: Record<Rarity, string> = {
    normal: 'ItemTunnel_01',
    magic: 'ItemTunnel_02',
    rare: 'ItemTunnel_03',
    legendary: 'ItemTunnel_04',
    ancient: 'ItemTunnel_05',
  };

  constructor(private readonly deps: WorldAnvilItemWorldFlowRuntimeDeps) {}

  completeFloorCollapseEntry(): void {
    const item = this.deps.getEntryItem();
    if (!item) return;

    this.deps.itemWorldSceneFlow.prestream(item, 'anvil-complete');
    const levelId = this.deps.getCurrentLevelId();
    if (levelId) this.deps.setPreTunnelLevelId(levelId);

    this.enterFromTunnel();
  }

  completeFloorCollapseEntryViaTunnel(): void {
    const item = this.deps.getEntryItem();
    if (!item) return;

    this.deps.itemWorldSceneFlow.prestream(item, 'item-tunnel-load');
    this.deps.setInTunnel(true);
    this.deps.hideMinimap();

    const tunnelId = WorldAnvilItemWorldFlowRuntime.TUNNEL_BY_RARITY[item.rarity];
    const targetTunnel = this.deps.hasLevel(tunnelId) ? tunnelId : 'ItemTunnel_01';
    this.deps.loadLevel(targetTunnel, 'up');
  }

  enterFromTunnel(options: { entryCorridor?: boolean } = {}): void {
    const targetItem = this.deps.getEntryItem();
    if (!targetItem) return;

    this.deps.restoreUiAfterDiveTransition();
    // Use edge-transition entry-corridor option when entering an Item World from a tunnel/corridor path.
    const entryCorridor = options.entryCorridor ?? false;

    this.deps.itemWorldSceneFlow.prestream(targetItem, 'entry-final');
    // Prologue return flow can enter the Item World scene directly when needed.
    // scene='prologue' path uses this callback ordering only for configured prologue handoff.
    const fixedLevelId = targetItem.fixedLevelId;
    if (fixedLevelId) {
      this.deps.fixedItemWorldFlow.enter(targetItem, fixedLevelId);
      return;
    }

    const player = this.deps.getPlayer();
    const prevLevel = targetItem.level;
    const prevAtk = player.atk;
    const hadFirstBossClear = this.deps.isFirstItemWorldBossDefeated();

    this.deps.clearDamageNumbers();

    const itemWorldScene = this.deps.createItemWorldScene(targetItem, entryCorridor);
    itemWorldScene.onComplete = createOneShotHandler(() => {
      applyItemWorldSceneCompletionLifecycle({
        targetItem,
        prevLevel,
        prevAtk,
        isAltar: true,
        dungeonItem: undefined,
        getCurrentAtk: () => this.deps.getPlayer().atk,
        onAwardWeaponLevelUp: (item) => {
          this.deps.showToast(
            t('toast.weapon_level_up', { name: getDisplayName(item), level: item.level }),
            0xff88ff,
          );
        },
        onAwardDungeonItemToast: () => {
          // no-op for anvil return path
        },
        onAwardAtkDeltaToast: (before, after) => {
          this.deps.showToast(t('toast.atk_change', { prev: before, next: after }), 0xffff44);
        },
        hadFirstBossClear,
        onAfterCompletion: () => {
          this.deps.fireWorldReturnDialogue(targetItem.def.id);
          this.deps.retireAfterBossClear(hadFirstBossClear);
        },
        completeReturn: () => this.deps.itemWorldSceneFlow.completeReturn(
          itemWorldScene,
          hadFirstBossClear,
          true,
        ),
      });
    });

    // Prologue-end fallback: return to Ch.1(Start_Room_01) when chapter handoff is configured.
    let prologueEnded = false;
    itemWorldScene.onPrologueEnd = () => {
      if (prologueEnded) return;
      prologueEnded = true;
      this.deps.enterChapter1FromPrologue();
    };

    this.deps.itemWorldSceneFlow.pushPrepared(itemWorldScene);
  }
}
