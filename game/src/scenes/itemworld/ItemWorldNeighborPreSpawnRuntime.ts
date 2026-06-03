import { Debug } from '@core/Debug';
import type { UnifiedGridData } from '@level/RoomGrid';

interface ItemWorldNeighborPreSpawnRuntimeDeps {
  getUnifiedGrid: () => UnifiedGridData;
  getSpawnedRooms: () => Set<string>;
  getEnemyCount: () => number;
  spawnRuntimeCell: (col: number, absRow: number) => void;
  spawnEnemiesInRoom: (col: number, absRow: number) => void;
  getRoomDebugLabel: (col: number, absRow: number) => string;
  persistRoomState: () => void;
}

const DIRECTIONS = [
  { dc: -1, dr: 0, name: 'W' },
  { dc: 1, dr: 0, name: 'E' },
  { dc: 0, dr: -1, name: 'N' },
  { dc: 0, dr: 1, name: 'S' },
];

export class ItemWorldNeighborPreSpawnRuntime {
  constructor(private readonly deps: ItemWorldNeighborPreSpawnRuntimeDeps) {}

  preSpawn(curCol: number, curAbsRow: number): void {
    const unifiedGrid = this.deps.getUnifiedGrid();
    const totalCols = unifiedGrid.totalWidth;
    const totalRows = unifiedGrid.totalHeight;
    Debug.log(`[ItemWorld] preSpawnNeighborRooms from (${curCol},${curAbsRow}) totalGrid=${totalCols}x${totalRows}`);

    let spawnedCount = 0;
    let skippedBounds = 0;
    let skippedSpawned = 0;
    let skippedNullCell = 0;

    for (const { dc, dr, name } of DIRECTIONS) {
      const col = curCol + dc;
      const absRow = curAbsRow + dr;
      if (col < 0 || col >= totalCols || absRow < 0 || absRow >= totalRows) {
        Debug.log(`  [${name}] skip: out of bounds (${col},${absRow})`);
        skippedBounds++;
        continue;
      }

      const key = `${col},${absRow}`;
      if (this.deps.getSpawnedRooms().has(key)) {
        Debug.log(`  [${name}] skip: already spawned ${key}`);
        skippedSpawned++;
        continue;
      }

      const cell = unifiedGrid.cells[absRow]?.[col];
      if (!cell) {
        Debug.log(`  [${name}] skip: null cell ${key}`);
        skippedNullCell++;
        continue;
      }

      this.deps.spawnRuntimeCell(col, absRow);
      this.deps.getSpawnedRooms().add(key);
      const beforeCount = this.deps.getEnemyCount();
      this.deps.spawnEnemiesInRoom(col, absRow);
      const spawned = this.deps.getEnemyCount() - beforeCount;
      Debug.log(
        `  [${name}] spawned ${spawned} enemies in ${key} `
        + `(roomType=${this.deps.getRoomDebugLabel(col, absRow)}, cleared=${cell.cleared})`,
      );
      spawnedCount++;
    }

    Debug.log(
      `[ItemWorld] preSpawn result: ${spawnedCount} rooms spawned, `
      + `${skippedBounds} bounds, ${skippedSpawned} already, ${skippedNullCell} null`,
    );
    this.deps.persistRoomState();
  }
}
