import type { LdtkLevel } from '@level/LdtkLoader';
import type { UnifiedRoomCell } from '@level/RoomGrid';

type LogicalRoomType = string;

interface ItemWorldRoomTypeRuntimeDeps {
  isStratumEndRoom: (col: number, absRow: number) => boolean;
}

export class ItemWorldRoomTypeRuntime {
  private readonly roomTypes = new Map<string, LogicalRoomType>();

  constructor(private readonly deps: ItemWorldRoomTypeRuntimeDeps) {}

  clear(): void {
    this.roomTypes.clear();
  }

  assign(cell: UnifiedRoomCell, ldtkLevel: LdtkLevel, col: number, absRow: number): LogicalRoomType {
    const logicalRoomType = this.deps.isStratumEndRoom(col, absRow)
      ? 'Boss'
      : cell.onCriticalPath
        ? 'Combat'
        : ldtkLevel.roomType ?? 'Combat';
    this.roomTypes.set(this.key(col, absRow), logicalRoomType);
    return logicalRoomType;
  }

  get(col: number, absRow: number): LogicalRoomType {
    return this.roomTypes.get(this.key(col, absRow)) ?? 'Combat';
  }

  getDebugLabel(col: number, absRow: number): string {
    return this.roomTypes.get(this.key(col, absRow)) ?? '?';
  }

  private key(col: number, absRow: number): string {
    return `${col}:${absRow}`;
  }
}
