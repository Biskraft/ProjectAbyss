export interface ItemWorldBuildStateRuntimeDeps {
  resetTileMutator: () => void;
  clearBurnableProps: () => void;
  clearAshRemnant: () => void;
  clearGrassClumpFire: () => void;
  clearFluidResidue: () => void;
  clearEgoShardRuntime: () => void;
  clearContainerRegistry: () => void;
  resetContainerCarry: () => void;
  clearRewardSpawnerPoints: () => void;
  clearSpawnedRooms: () => void;
  clearRoomTypes: () => void;
  clearEnemies: () => void;
  clearPlayerSpawns: () => void;
  clearCellVisualRecords: () => void;
  resetCellVisualRenderedState: () => void;
  clearRuntimeCellSpawns: () => void;
}

export class ItemWorldBuildStateRuntime {
  constructor(private readonly deps: ItemWorldBuildStateRuntimeDeps) {}

  resetForFullMapBuild(): void {
    // Reset elemental tile overlays (frozen/burning/electric) + entity registries.
    // Old cell keys would otherwise leak into the freshly built fullGrid coordinates.
    this.deps.resetTileMutator();
    this.deps.clearBurnableProps();
    this.deps.clearAshRemnant();
    this.deps.clearGrassClumpFire();
    this.deps.clearFluidResidue();
    this.deps.clearEgoShardRuntime();
    this.deps.clearContainerRegistry();
    this.deps.resetContainerCarry();
    this.deps.clearRewardSpawnerPoints();
    this.deps.clearSpawnedRooms();
    this.deps.clearRoomTypes();
    this.deps.clearEnemies();
    this.deps.clearPlayerSpawns();
    this.deps.clearCellVisualRecords();
    this.deps.resetCellVisualRenderedState();
    this.deps.clearRuntimeCellSpawns();
  }
}
