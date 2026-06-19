import type { ItemWorldProgress } from '@items/ItemInstance';

export function resetPrologueItemWorldRunProgress(progress: ItemWorldProgress): void {
  progress.deepestUnlocked = 0;
  progress.visitedRooms = [];
  progress.clearedRooms = [];
  progress.spawnedRooms = [];
  progress.bossPortals = {};
  progress.lastSafeStratum = 0;
  progress.cleared = false;
}
