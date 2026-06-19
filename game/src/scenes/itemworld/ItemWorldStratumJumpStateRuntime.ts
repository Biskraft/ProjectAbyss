import { t } from '@i18n';
import type { UnifiedGridData } from '@level/RoomGrid';
import type { StrataConfig, StratumDef } from '@data/StrataConfig';

interface ItemWorldStratumJumpStateRuntimeDeps {
  getUnifiedGrid: () => UnifiedGridData;
  getStrataConfig: () => StrataConfig;
  getDeepestUnlocked: () => number;
  setDeepestUnlocked: (value: number) => void;
  setLastSafeStratum: (value: number) => void;
  setCurrentRoomState: (stratumIndex: number, col: number, row: number, stratumDef: StratumDef) => void;
  resetNeighborPreSpawn: () => void;
  persistRoomState: () => void;
  hasSpawnedRoom: (key: string) => boolean;
  markRoomSpawned: (key: string) => void;
  spawnRoom: (col: number, row: number) => void;
  showToast: (message: string, color: number) => void;
}

export class ItemWorldStratumJumpStateRuntime {
  constructor(private readonly deps: ItemWorldStratumJumpStateRuntimeDeps) {}

  resolveStartRoom(stratumIndex: number): { col: number; row: number } | null {
    const unifiedGrid = this.deps.getUnifiedGrid();
    const stratumStart = unifiedGrid.stratumStartRooms?.[stratumIndex];
    const offset = unifiedGrid.strataOffsets[stratumIndex];
    if (!offset) return null;
    return {
      col: stratumStart?.col ?? 0,
      row: stratumStart?.absoluteRow ?? offset.rowOffset,
    };
  }

  applyStratumState(stratumIndex: number, col: number, row: number): void {
    const strataConfig = this.deps.getStrataConfig();
    this.deps.setCurrentRoomState(stratumIndex, col, row, strataConfig.strata[stratumIndex]);
    this.deps.resetNeighborPreSpawn();
  }

  updateProgress(prevStratum: number, stratumIndex: number): void {
    if (stratumIndex <= prevStratum) return;
    if (this.deps.getDeepestUnlocked() < stratumIndex) {
      this.deps.setDeepestUnlocked(stratumIndex);
    }
    this.deps.setLastSafeStratum(stratumIndex);
    this.deps.persistRoomState();
  }

  activateStartRoom(col: number, row: number): void {
    const key = `${col},${row}`;
    if (this.deps.hasSpawnedRoom(key)) return;
    this.deps.markRoomSpawned(key);
    this.deps.spawnRoom(col, row);
  }

  showDepthToast(stratumIndex: number): void {
    if (stratumIndex <= 0) return;
    const totalStrata = this.deps.getStrataConfig().strata.length;
    this.deps.showToast(t('toast.depth', { n: stratumIndex + 1, total: totalStrata }), 0xff4488);
  }
}
