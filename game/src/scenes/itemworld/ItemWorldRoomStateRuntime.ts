import type { ItemWorldProgress } from '@items/ItemInstance';
import type { UnifiedGridData, UnifiedRoomCell } from '@level/RoomGrid';

interface RestoreResult {
  roomsCleared: number;
}

export class ItemWorldRoomStateRuntime {
  restoreRoomState(
    unifiedGrid: UnifiedGridData,
    progress: ItemWorldProgress,
    spawnedRooms: Set<string>,
  ): RestoreResult {
    const visited = new Set(progress.visitedRooms);
    const cleared = new Set(progress.clearedRooms);
    const bossPortals = progress.bossPortals ?? {};

    let roomsCleared = 0;
    for (let r = 0; r < unifiedGrid.totalHeight; r++) {
      for (let c = 0; c < unifiedGrid.totalWidth; c++) {
        const cell = unifiedGrid.cells[r][c];
        if (!cell) continue;
        if (cell.isFiller) continue;
        const key = `${c},${r}`;
        cell.visited = visited.has(key);
        cell.cleared = cleared.has(key);
        const portal = bossPortals[String(cell.stratumIndex ?? 0)];
        if (portal) {
          cell.bossPortalX = portal.x;
          cell.bossPortalY = portal.y;
        }
        if (cell.cleared) roomsCleared++;
      }
    }

    spawnedRooms.clear();
    for (const key of progress.spawnedRooms ?? []) {
      spawnedRooms.add(key);
    }

    return { roomsCleared };
  }

  persistRoomState(
    unifiedGrid: UnifiedGridData,
    progress: ItemWorldProgress,
    spawnedRooms: Set<string>,
  ): void {
    const visited: string[] = [];
    const cleared: string[] = [];
    const bossPortals: Record<string, { x: number; y: number }> = {
      ...(progress.bossPortals ?? {}),
    };

    for (let r = 0; r < unifiedGrid.totalHeight; r++) {
      for (let c = 0; c < unifiedGrid.totalWidth; c++) {
        const cell = unifiedGrid.cells[r][c];
        if (!cell) continue;
        if (cell.isFiller) continue;
        const key = `${c},${r}`;
        if (cell.visited) visited.push(key);
        if (cell.cleared) cleared.push(key);
        if (cell.bossPortalX != null && cell.bossPortalY != null) {
          bossPortals[String(cell.stratumIndex ?? 0)] = {
            x: cell.bossPortalX,
            y: cell.bossPortalY,
          };
        }
      }
    }

    progress.visitedRooms = visited;
    progress.clearedRooms = cleared;
    progress.spawnedRooms = Array.from(spawnedRooms);
    progress.bossPortals = bossPortals;
  }

  getCell(unifiedGrid: UnifiedGridData, col: number, row: number): UnifiedRoomCell | null {
    if (row < 0 || row >= unifiedGrid.totalHeight) return null;
    if (col < 0 || col >= unifiedGrid.totalWidth) return null;
    return unifiedGrid.cells[row][col];
  }

  getCurrentCell(unifiedGrid: UnifiedGridData, currentCol: number, currentRow: number): UnifiedRoomCell {
    const row = unifiedGrid.cells[currentRow];
    if (!row) return unifiedGrid.cells[0][0]!;
    return row[currentCol] ?? unifiedGrid.cells[0][0]!;
  }

  countTotalRooms(unifiedGrid: UnifiedGridData): number {
    let total = 0;
    for (let r = 0; r < unifiedGrid.totalHeight; r++) {
      for (let c = 0; c < unifiedGrid.totalWidth; c++) {
        const cell = unifiedGrid.cells[r][c];
        if (cell && !cell.isFiller && cell.type !== 0) total++;
      }
    }
    return total;
  }
}
