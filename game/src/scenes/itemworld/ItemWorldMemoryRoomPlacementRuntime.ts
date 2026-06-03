import { Debug } from '@core/Debug';
import { getMemoryRoom } from '@data/memoryRoomTable';
import type { LdtkLevel } from '@level/LdtkLoader';
import type { UnifiedGridData } from '@level/RoomGrid';
import { PRNG } from '@utils/PRNG';

interface ItemWorldMemoryRoomPlacementRuntimeDeps {
  isStratumEndRoom: (col: number, absRow: number) => boolean;
}

interface ComputeOptions {
  templates: LdtkLevel[];
  unifiedGrid: UnifiedGridData;
  strataCount: number;
  weaponId: string;
  itemUid: number;
}

export class ItemWorldMemoryRoomPlacementRuntime {
  private readonly placements = new Map<string, LdtkLevel>();

  constructor(private readonly deps: ItemWorldMemoryRoomPlacementRuntimeDeps) {}

  clear(): void {
    this.placements.clear();
  }

  getPlacements(): Map<string, LdtkLevel> {
    return this.placements;
  }

  has(col: number, absRow: number): boolean {
    return this.placements.has(`${col}:${absRow}`);
  }

  compute(options: ComputeOptions): void {
    this.placements.clear();
    if (options.templates.length === 0) return;

    for (let stratumIndex = 0; stratumIndex < options.strataCount; stratumIndex++) {
      const roomName = getMemoryRoom(options.weaponId, stratumIndex);
      if (!roomName) continue;

      const template = options.templates.find(t => t.identifier === roomName);
      if (!template) {
        console.warn(
          `[ItemWorld] Memory room template "${roomName}" not found for ${options.weaponId} stratum ${stratumIndex}`,
        );
        continue;
      }

      const picked = this.pickCell(options.unifiedGrid, stratumIndex, options.itemUid);
      if (!picked) continue;

      this.placements.set(`${picked.col}:${picked.absRow}`, template);
      Debug.log(
        `[ItemWorld] Memory room placement stratum=${stratumIndex} weapon=${options.weaponId} `
        + `cell=(${picked.col},${picked.absRow}) template=${roomName}`,
      );
    }
  }

  private pickCell(
    unifiedGrid: UnifiedGridData,
    stratumIndex: number,
    itemUid: number,
  ): { col: number; absRow: number } | null {
    const offset = unifiedGrid.strataOffsets[stratumIndex];
    if (!offset) return null;

    const startCol = unifiedGrid.startRoom.col;
    const startAbsRow = unifiedGrid.startRoom.absoluteRow;
    const branchCandidates: { col: number; absRow: number }[] = [];
    const anyCandidates: { col: number; absRow: number }[] = [];

    for (let localRow = 0; localRow < offset.height; localRow++) {
      for (let col = 0; col < unifiedGrid.totalWidth; col++) {
        const absRow = offset.rowOffset + localRow;
        const cell = unifiedGrid.cells[absRow]?.[col];
        if (!cell) continue;
        if (this.deps.isStratumEndRoom(col, absRow)) continue;
        if (col === startCol && absRow === startAbsRow) continue;
        if (!cell.onCriticalPath) branchCandidates.push({ col, absRow });
        anyCandidates.push({ col, absRow });
      }
    }

    const pool = branchCandidates.length > 0 ? branchCandidates : anyCandidates;
    if (pool.length === 0) return null;

    const rng = new PRNG(itemUid * 131 + stratumIndex * 7 + 13);
    return pool[rng.nextInt(0, pool.length - 1)];
  }
}
