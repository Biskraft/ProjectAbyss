import { t } from '@i18n';
import type { ItemWorldProgress } from '@items/ItemInstance';
import type { UnifiedGridData, UnifiedRoomCell } from '@level/RoomGrid';
import type { ItemWorldNeighborPreSpawnRuntime } from './ItemWorldNeighborPreSpawnRuntime';
import type { ItemWorldRoomSpawnRuntime } from './ItemWorldRoomSpawnRuntime';
import type { ItemWorldRoomSpawnState } from './ItemWorldRoomSpawnState';

interface PlayerFootPoint {
  x: number;
  y: number;
}

interface ItemWorldRoomProgressionRuntimeDeps {
  getPlayerFootPoint: () => PlayerFootPoint;
  findRoomAtPixel: (x: number, y: number) => { col: number; absRow: number };
  getUnifiedGrid: () => UnifiedGridData;
  getCurrentRoom: () => { col: number; row: number };
  setCurrentRoom: (col: number, row: number) => void;
  getCurrentStratumIndex: () => number;
  setCurrentStratum: (stratumIndex: number) => void;
  getTotalStrata: () => number;
  getProgress: () => ItemWorldProgress;
  getRoomSpawnState: () => ItemWorldRoomSpawnState;
  getRoomSpawnRuntime: () => ItemWorldRoomSpawnRuntime;
  getNeighborPreSpawnRuntime: () => ItemWorldNeighborPreSpawnRuntime;
  hasAnyEnemy: () => boolean;
  fireMonsterVisible: () => void;
  showToast: (message: string, color: number) => void;
  persistRoomState: () => void;
}

export class ItemWorldRoomProgressionRuntime {
  constructor(private readonly deps: ItemWorldRoomProgressionRuntimeDeps) {}

  update(): void {
    const playerFoot = this.deps.getPlayerFootPoint();
    const playerRoom = this.deps.findRoomAtPixel(playerFoot.x, playerFoot.y);
    const playerRoomCol = playerRoom.col;
    const playerAbsRow = playerRoom.absRow;
    const roomKey = `${playerRoomCol},${playerAbsRow}`;
    const unifiedGrid = this.deps.getUnifiedGrid();

    this.syncCurrentRoom(unifiedGrid, playerRoomCol, playerAbsRow);
    this.syncCurrentStratum(unifiedGrid, playerRoomCol, playerAbsRow);
    this.spawnRoomIfNeeded(unifiedGrid, playerRoomCol, playerAbsRow, roomKey);
    this.preSpawnNeighborsIfNeeded(playerRoomCol, playerAbsRow, roomKey);
  }

  private syncCurrentRoom(unifiedGrid: UnifiedGridData, playerRoomCol: number, playerAbsRow: number): void {
    const current = this.deps.getCurrentRoom();
    if (playerRoomCol === current.col && playerAbsRow === current.row) return;
    const syncedCell = unifiedGrid.cells[playerAbsRow]?.[playerRoomCol];
    if (!syncedCell) return;

    this.deps.setCurrentRoom(playerRoomCol, playerAbsRow);
    if (!syncedCell.visited) {
      syncedCell.visited = true;
      this.deps.persistRoomState();
    }
  }

  private syncCurrentStratum(unifiedGrid: UnifiedGridData, playerRoomCol: number, playerAbsRow: number): void {
    const prevStratumIndex = this.deps.getCurrentStratumIndex();
    const cellAtCursor = unifiedGrid.cells[playerAbsRow]?.[playerRoomCol] ?? null;
    if (!cellAtCursor || cellAtCursor.stratumIndex === prevStratumIndex) return;

    const nextStratumIndex = cellAtCursor.stratumIndex;
    this.deps.setCurrentStratum(nextStratumIndex);
    this.deps.showToast(
      t('toast.depth', { n: nextStratumIndex + 1, total: this.deps.getTotalStrata() }),
      0xff4488,
    );

    if (nextStratumIndex <= prevStratumIndex) return;
    const progress = this.deps.getProgress();
    if (progress.deepestUnlocked < nextStratumIndex) {
      progress.deepestUnlocked = nextStratumIndex;
    }
    progress.lastSafeStratum = nextStratumIndex;
    this.deps.persistRoomState();
  }

  private spawnRoomIfNeeded(
    unifiedGrid: UnifiedGridData,
    playerRoomCol: number,
    playerAbsRow: number,
    roomKey: string,
  ): void {
    const roomSpawnState = this.deps.getRoomSpawnState();
    if (roomSpawnState.hasSpawned(roomKey)) return;

    roomSpawnState.markSpawned(roomKey);
    this.deps.setCurrentRoom(playerRoomCol, playerAbsRow);
    const enteredCell = unifiedGrid.cells[playerAbsRow]?.[playerRoomCol] as UnifiedRoomCell | null | undefined;
    if (enteredCell) {
      enteredCell.visited = true;
      this.deps.persistRoomState();
    }
    this.deps.getRoomSpawnRuntime().spawnForRoom(playerRoomCol, playerAbsRow);

    if (this.deps.hasAnyEnemy()) {
      this.deps.fireMonsterVisible();
    }
  }

  private preSpawnNeighborsIfNeeded(playerRoomCol: number, playerAbsRow: number, roomKey: string): void {
    const roomSpawnState = this.deps.getRoomSpawnState();
    if (roomSpawnState.shouldPreSpawnNeighbors(roomKey)) {
      this.deps.getNeighborPreSpawnRuntime().preSpawn(playerRoomCol, playerAbsRow);
    }
  }
}
