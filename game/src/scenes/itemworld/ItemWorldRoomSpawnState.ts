export class ItemWorldRoomSpawnState {
  readonly spawnedRooms = new Set<string>();
  readonly roomEnemyCount = new Map<string, number>();
  private lastPreSpawnRoomKey: string | null = null;

  clearSpawnedRooms(): void {
    this.spawnedRooms.clear();
  }

  markSpawned(roomKey: string): void {
    this.spawnedRooms.add(roomKey);
  }

  hasSpawned(roomKey: string): boolean {
    return this.spawnedRooms.has(roomKey);
  }

  resetNeighborPreSpawn(): void {
    this.lastPreSpawnRoomKey = null;
  }

  shouldPreSpawnNeighbors(roomKey: string): boolean {
    if (this.lastPreSpawnRoomKey === roomKey) return false;
    this.lastPreSpawnRoomKey = roomKey;
    return true;
  }
}
