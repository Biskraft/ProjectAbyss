import type { UnifiedRoomCell } from '@level/RoomGrid';
import { addRecovery, type ItemInstance } from '@items/ItemInstance';

interface ItemWorldRoomClearRuntimeDeps {
  getItem: () => ItemInstance;
  incrementRoomsCleared: () => void;
  persistRoomState: () => void;
}

export class ItemWorldRoomClearRuntime {
  constructor(private readonly deps: ItemWorldRoomClearRuntimeDeps) {}

  markCleared(cell: UnifiedRoomCell, recoveryAmount = 0): boolean {
    if (cell.cleared) return false;

    cell.cleared = true;
    this.deps.incrementRoomsCleared();
    if (recoveryAmount > 0) {
      addRecovery(this.deps.getItem(), recoveryAmount);
    }
    this.deps.persistRoomState();
    return true;
  }
}
