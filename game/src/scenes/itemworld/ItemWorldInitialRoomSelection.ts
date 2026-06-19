import type { UnifiedGridData } from '@level/RoomGrid';
import type { ItemWorldProgress } from '@items/ItemInstance';
import type { StrataConfig, StratumDef } from '@data/StrataConfig';

export interface ItemWorldInitialRoomSelection {
  col: number;
  row: number;
  stratumIndex: number;
  stratumDef: StratumDef;
}

export function selectInitialItemWorldRoom(options: {
  progress: ItemWorldProgress;
  unifiedGrid: UnifiedGridData;
  strataConfig: StrataConfig;
}): ItemWorldInitialRoomSelection {
  const { progress, unifiedGrid, strataConfig } = options;
  const startStratumIndex = Math.min(
    progress.lastSafeStratum,
    progress.deepestUnlocked,
  );

  let col: number;
  let row: number;
  if (startStratumIndex > 0 && startStratumIndex < unifiedGrid.strataOffsets.length) {
    const stratumStart = unifiedGrid.stratumStartRooms?.[startStratumIndex];
    const offset = unifiedGrid.strataOffsets[startStratumIndex];
    col = stratumStart?.col ?? 0;
    row = stratumStart?.absoluteRow ?? offset.rowOffset;
  } else {
    col = unifiedGrid.startRoom.col;
    row = unifiedGrid.startRoom.absoluteRow;
  }

  const startCell = unifiedGrid.cells[row][col];
  const stratumIndex = startCell?.stratumIndex ?? 0;
  const stratumDef = strataConfig.strata[stratumIndex];

  return {
    col,
    row,
    stratumIndex,
    stratumDef,
  };
}
