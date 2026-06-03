import type { Rarity } from '@data/weapons';
import type { Player } from '@entities/Player';
import type { ItemInstance } from '@items/ItemInstance';
import { getDisplayName } from '@items/ItemInstance';
import { t } from '@i18n';
import type { WorldFixedItemWorldFlowRuntime } from './WorldFixedItemWorldFlowRuntime';
import type { WorldItemWorldSceneFlowRuntime } from './WorldItemWorldSceneFlowRuntime';

type TunnelEnterFrom = 'up' | 'down';

interface WorldAnvilItemWorldFlowRuntimeDeps {
  itemWorldSceneFlow: WorldItemWorldSceneFlowRuntime;
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
    const entryCorridor = options.entryCorridor ?? true;

    this.deps.itemWorldSceneFlow.prestream(targetItem, 'entry-final');

    if (targetItem.fixedLevelId) {
      this.deps.fixedItemWorldFlow.enter(targetItem);
      return;
    }

    const player = this.deps.getPlayer();
    const prevLevel = targetItem.level;
    const prevAtk = player.atk;
    const hadFirstBossClear = this.deps.isFirstItemWorldBossDefeated();

    this.deps.clearDamageNumbers();

    const itemWorldScene = this.deps.itemWorldSceneFlow.createScene(targetItem, entryCorridor);
    itemWorldScene.onComplete = () => {
      this.deps.itemWorldSceneFlow.completeReturn(itemWorldScene, hadFirstBossClear, { restoreAtAnvil: true });

      if (targetItem.level > prevLevel) {
        this.deps.showToast(
          t('toast.weapon_level_up', { name: getDisplayName(targetItem), level: targetItem.level }),
          0xff88ff,
        );
      }

      if (this.deps.getPlayer().atk !== prevAtk) {
        this.deps.showToast(t('toast.atk_change', { prev: prevAtk, next: this.deps.getPlayer().atk }), 0xffff44);
      }

      this.deps.fireWorldReturnDialogue(targetItem.def.id);
      this.deps.retireAfterBossClear(hadFirstBossClear);
    };

    this.deps.itemWorldSceneFlow.pushPrepared(itemWorldScene);
  }
}
