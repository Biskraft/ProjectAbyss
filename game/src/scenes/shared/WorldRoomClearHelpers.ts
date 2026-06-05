import type { Enemy } from '@entities/Enemy';
import { countAliveEnemies } from '@scenes/shared/EnemyRegistryHelpers';

export interface ClearableRoomCell {
  cleared: boolean;
}

export function markRoomClearedWhenNoAliveEnemies({
  enemies,
  cell,
  onCleared,
}: {
  enemies: readonly Enemy<string>[];
  cell: ClearableRoomCell;
  onCleared: () => void;
}): boolean {
  if (countAliveEnemies(enemies) !== 0 || cell.cleared) return false;
  cell.cleared = true;
  onCleared();
  return true;
}
