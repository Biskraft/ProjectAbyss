import type { LdtkLevel } from '@level/LdtkLoader';
import type { RoomGraphData } from '@level/RoomGraph';
import type { UnifiedGridData } from '@level/RoomGrid';
import type { StrataConfig, StratumDef, TopologyKind } from '@data/StrataConfig';
import type { ItemWorldDebugGenerationResult } from './ItemWorldGenerationRuntime';

interface MemoryPlacementOptions {
  templates: LdtkLevel[];
  unifiedGrid: UnifiedGridData;
  strataCount: number;
  weaponId: string;
  itemUid: number;
}

interface ItemWorldDebugMapStateRuntimeDeps {
  getTemplates: () => LdtkLevel[];
  getUnifiedGrid: () => UnifiedGridData;
  getStrataConfig: () => StrataConfig;
  getWeaponId: () => string;
  setStrataConfig: (value: StrataConfig) => void;
  setDebugGenerationSeedOffset: (value: number) => void;
  setUnifiedGrid: (value: UnifiedGridData) => void;
  setRoomGraphs: (value: RoomGraphData[]) => void;
  setCurrentRoomState: (col: number, row: number, stratumIndex: number, stratumDef: StratumDef) => void;
  initDevOverlay: (topology: TopologyKind | undefined) => void;
  computeMemoryPlacements: (options: MemoryPlacementOptions) => void;
  resetTrapdoorState: () => void;
  resetNeighborPreSpawn: () => void;
  restoreRoomState: () => void;
  setRoomsCleared: (value: number) => void;
  countTotalRooms: () => number;
  setTotalRooms: (value: number) => void;
  rebuildEnvironment: () => void;
  placePlayerAtCurrentRoom: () => void;
  showGameplayHud: () => void;
  markRoomSpawned: (key: string) => void;
  spawnRoom: (col: number, row: number) => void;
}

export class ItemWorldDebugMapStateRuntime {
  constructor(private readonly deps: ItemWorldDebugMapStateRuntimeDeps) {}

  applyGeneratedMap(result: ItemWorldDebugGenerationResult): void {
    this.deps.setStrataConfig(result.strataConfig);
    this.deps.setDebugGenerationSeedOffset(result.debugGenerationSeedOffset);
    this.deps.setUnifiedGrid(result.unifiedGrid);
    this.deps.setRoomGraphs(result.graphs);
    this.deps.initDevOverlay(result.topology);
  }

  computeMemoryPlacements(debugSeed: number): void {
    const strataConfig = this.deps.getStrataConfig();
    this.deps.computeMemoryPlacements({
      templates: this.deps.getTemplates(),
      unifiedGrid: this.deps.getUnifiedGrid(),
      strataCount: strataConfig.strata.length,
      weaponId: this.deps.getWeaponId(),
      itemUid: debugSeed,
    });
  }

  resetToStartRoom(): void {
    const unifiedGrid = this.deps.getUnifiedGrid();
    const strataConfig = this.deps.getStrataConfig();
    const col = unifiedGrid.startRoom.col;
    const row = unifiedGrid.startRoom.absoluteRow;
    const startCell = unifiedGrid.cells[row]?.[col];
    const stratumIndex = startCell?.stratumIndex ?? 0;
    this.deps.setCurrentRoomState(col, row, stratumIndex, strataConfig.strata[stratumIndex]);
  }

  resetRunState(): void {
    this.deps.resetTrapdoorState();
    this.deps.resetNeighborPreSpawn();
    this.deps.restoreRoomState();
    this.deps.setRoomsCleared(0);
    this.deps.setTotalRooms(this.deps.countTotalRooms());
  }

  rebuildEnvironment(): void {
    this.deps.rebuildEnvironment();
  }

  placePlayerAtCurrentRoom(): void {
    this.deps.placePlayerAtCurrentRoom();
    this.deps.showGameplayHud();
  }

  activateStartRoom(): void {
    const unifiedGrid = this.deps.getUnifiedGrid();
    const key = `${unifiedGrid.startRoom.col},${unifiedGrid.startRoom.absoluteRow}`;
    this.deps.markRoomSpawned(key);
    this.deps.spawnRoom(unifiedGrid.startRoom.col, unifiedGrid.startRoom.absoluteRow);
  }
}
