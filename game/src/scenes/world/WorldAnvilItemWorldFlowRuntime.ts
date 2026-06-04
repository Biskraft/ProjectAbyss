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
  /** 프롤로그 종료 — 아이템계 pop 후 Start_Room_01(chapter_01) 로 전환. */
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
    // 진입 통로(entry corridor) 기능 제거 (사용자 요청) — 아이템계로 직접 진입.
    void options;
    const entryCorridor = false;

    this.deps.itemWorldSceneFlow.prestream(targetItem, 'entry-final');

    // 프롤로그 다이브는 절차 ItemWorldScene 으로 들어가며, 그 안에서
    // scene='prologue' 게이트가 그래프·방을 강제한다(PrologueDive). 별도 고정
    // 레벨 라우팅은 두지 않는다 — 진짜 fixedLevelId 가 박힌 아이템만 고정 경로.
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

    // 프롤로그 종료 시퀀스 완료 시 — 앵빌 복귀 대신 Ch.1(Start_Room_01)로 전환.
    itemWorldScene.onPrologueEnd = () => {
      this.deps.enterChapter1FromPrologue();
    };

    this.deps.itemWorldSceneFlow.pushPrepared(itemWorldScene);
  }
}
