import type { StrataConfig } from '@data/StrataConfig';
import type { ItemWorldProgress } from '@items/ItemInstance';
import type { UnifiedGridData } from '@level/RoomGrid';

interface ClearedStrataFlagsInput {
  strataConfig: StrataConfig;
  unifiedGrid: UnifiedGridData;
  progress: ItemWorldProgress;
}

export function getClearedStrataFlags(input: ClearedStrataFlagsInput): boolean[] {
  const totalStrata = input.strataConfig.strata.length;
  const cleared: boolean[] = [];

  for (let i = 0; i < totalStrata; i++) {
    const endRoom = input.unifiedGrid.stratumEndRooms.find(e => e.stratumIndex === i);
    if (endRoom) {
      const cell = input.unifiedGrid.cells[endRoom.absoluteRow]?.[endRoom.col];
      cleared.push(
        (cell?.cleared ?? false) ||
        !!input.progress.bossPortals?.[String(i)] ||
        input.progress.deepestUnlocked > i,
      );
    } else {
      cleared.push(false);
    }
  }

  return cleared;
}
