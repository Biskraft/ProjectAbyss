import type { UnifiedGridData } from '@level/RoomGrid';
import {
  EXP_PER_LEVEL,
  getDisplayName,
  RARITY_COLOR,
  type ItemInstance,
  type ItemWorldProgress,
} from '@items/ItemInstance';
import type { StrataConfig } from '@data/StrataConfig';
import { formatActivePlayerBuffsDebug } from '@systems/PlayerBuffSystem';
import type { HUD } from '@ui/HUD';
import { getClearedStrataFlags } from '@scenes/shared/ItemWorldHudHelpers';

interface ItemWorldHudRuntimeDeps {
  getHud: () => HUD;
  getItem: () => ItemInstance;
  getProgress: () => ItemWorldProgress;
  getStrataConfig: () => StrataConfig;
  getUnifiedGrid: () => UnifiedGridData;
  getCurrentStratumIndex: () => number;
  getEarnedExp: () => number;
}

export class ItemWorldHudRuntime {
  constructor(private readonly deps: ItemWorldHudRuntimeDeps) {}

  getClearedStrataFlags(): boolean[] {
    return getClearedStrataFlags({
      strataConfig: this.deps.getStrataConfig(),
      unifiedGrid: this.deps.getUnifiedGrid(),
      progress: this.deps.getProgress(),
    });
  }

  showGameplayHud(): void {
    const hud = this.deps.getHud();
    const item = this.deps.getItem();
    const strataConfig = this.deps.getStrataConfig();

    hud.container.visible = true;
    hud.hideBossHP();
    hud.showDepthGauge(
      strataConfig.strata.length,
      this.deps.getCurrentStratumIndex(),
      this.getClearedStrataFlags(),
    );
    hud.showItemExp(
      getDisplayName(item),
      RARITY_COLOR[item.rarity],
      item.level,
      item.exp,
      EXP_PER_LEVEL,
    );
    this.updateText();
  }

  updateText(): void {
    const hud = this.deps.getHud();
    const item = this.deps.getItem();
    const progress = this.deps.getProgress();
    const cycleTag = progress.cycle > 0 ? `C${progress.cycle} ` : '';
    const dbg = `[r=${item.rarity} cy=${progress.cycle} deep=${progress.deepestUnlocked} clr=${progress.clearedRooms.length}]`;
    const buffDbg = new URLSearchParams(window.location.search).get('debug') === '1'
      ? ` ${formatActivePlayerBuffsDebug()}`
      : '';

    hud.setFloorText(
      `${cycleTag}${getDisplayName(item)} Lv${item.level} EXP:${item.exp}/${EXP_PER_LEVEL} +${this.deps.getEarnedExp()} ${dbg}${buffDbg}`,
    );
    hud.updateDepthGauge(this.deps.getCurrentStratumIndex(), this.getClearedStrataFlags());
  }
}
