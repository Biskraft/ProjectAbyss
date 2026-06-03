import type { UnifiedGridData, UnifiedRoomCell } from '@level/RoomGrid';
import type { ItemWorldEnemySpawnContext } from './ItemWorldEnemySpawnRuntime';

interface ItemWorldRoomSpawnRuntimeDeps {
  getUnifiedGrid: () => UnifiedGridData;
  isStartSpawnDone: () => boolean;
  isStratumEndRoom: (col: number, absRow: number) => boolean;
  spawnAmbientForSafeRoom: (role: 'hub' | 'shrine', col: number, absRow: number) => void;
  markCleared: (cell: UnifiedRoomCell, recoveryBonus?: number) => void;
  hasMemoryRoom: (col: number, absRow: number) => boolean;
  getRoomType: (col: number, absRow: number) => string;
  createSpawnContext: (col: number, absRow: number, isBossRoom: boolean) => ItemWorldEnemySpawnContext | null;
  spawnRoomRewards: (col: number, absRow: number) => void;
  spawnEncounter: (args: {
    col: number;
    absRow: number;
    stratumIndex: number;
    roomType: string;
    isBossRoom: boolean;
    spawnContext: ItemWorldEnemySpawnContext;
  }) => void;
}

export class ItemWorldRoomSpawnRuntime {
  constructor(private readonly deps: ItemWorldRoomSpawnRuntimeDeps) {}

  spawnForRoom(col: number, absRow: number): void {
    const grid = this.deps.getUnifiedGrid();
    const cell = grid.cells[absRow]?.[col];
    if (!cell) return;

    if (cell.role === 'hub' || cell.role === 'shrine') {
      const isStartRoom = col === grid.startRoom.col && absRow === grid.startRoom.absoluteRow;
      if (isStartRoom && !this.deps.isStartSpawnDone()) return;

      this.deps.spawnAmbientForSafeRoom(cell.role, col, absRow);
      this.deps.markCleared(cell, 0.3);
      return;
    }

    if (cell.cleared) return;

    const stratumIndex = cell.stratumIndex ?? 0;
    const stratumStartCell = grid.stratumStartRooms?.[stratumIndex];
    if (
      stratumStartCell &&
      stratumStartCell.col === col &&
      stratumStartCell.absoluteRow === absRow
    ) {
      this.deps.markCleared(cell);
      return;
    }

    if (this.deps.hasMemoryRoom(col, absRow)) {
      this.deps.markCleared(cell);
      return;
    }

    const roomType = this.deps.getRoomType(col, absRow);
    const isBossRoom = roomType === 'Boss' || this.deps.isStratumEndRoom(col, absRow);
    const spawnContext = this.deps.createSpawnContext(col, absRow, isBossRoom);
    if (!spawnContext) return;

    this.deps.spawnRoomRewards(col, absRow);

    if (cell.kind === 'corridor') {
      this.deps.markCleared(cell);
      return;
    }

    if (roomType === 'Rest') {
      this.deps.markCleared(cell);
      return;
    }

    if (roomType === 'Puzzle') {
      return;
    }

    this.deps.spawnEncounter({
      col,
      absRow,
      stratumIndex,
      roomType,
      isBossRoom,
      spawnContext,
    });
  }
}
