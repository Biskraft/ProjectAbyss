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
    const strataConfig = this.deps.getStrataConfig();
    const unifiedGrid = this.deps.getUnifiedGrid();
    const progress = this.deps.getProgress();
    const totalStrata = strataConfig.strata.length;
    const cleared: boolean[] = [];

    for (let i = 0; i < totalStrata; i++) {
      const endRoom = unifiedGrid.stratumEndRooms.find(e => e.stratumIndex === i);
      if (endRoom) {
        const cell = unifiedGrid.cells[endRoom.absoluteRow]?.[endRoom.col];
        cleared.push(
          (cell?.cleared ?? false) ||
          !!progress.bossPortals?.[String(i)] ||
          progress.deepestUnlocked > i,
        );
      } else {
        cleared.push(false);
      }
    }

    return cleared;
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
