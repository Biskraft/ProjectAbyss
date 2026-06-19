import { applyFluidGenericResolution } from '@data/ItemWorldFluidMapping';

interface ItemWorldInitialBuildRuntimeDeps {
  restoreRoomState: () => { roomsCleared: number };
  setRoomsCleared: (amount: number) => void;
  countTotalRooms: () => number;
  setTotalRooms: (amount: number) => void;
  clearFluidSpawners: () => void;
  clearFluidCrestFoam: () => void;
  resetContainerRegistry: () => void;
  setFluidSystemReady: (ready: boolean) => void;
  buildFullMap: () => void;
  getFullGrid: () => number[][];
  getTemperament: () => Parameters<typeof applyFluidGenericResolution>[1];
  initWeather: () => void;
  attachFluidSystem: () => void;
  settleContainers: () => void;
  showGameplayHud: () => void;
  setCameraZoom: (zoom: number) => void;
  placePlayerAtCurrentRoom: () => void;
  shouldActivateEntryCorridor: () => boolean;
  activateEntryCorridor: () => void;
}

export class ItemWorldInitialBuildRuntime {
  constructor(private readonly deps: ItemWorldInitialBuildRuntimeDeps) {}

  initialize(): void {
    const restoredRoomState = this.deps.restoreRoomState();
    this.deps.setRoomsCleared(restoredRoomState.roomsCleared);
    this.deps.setTotalRooms(this.deps.countTotalRooms());

    this.rebuildEnvironment();
    this.deps.showGameplayHud();

    this.deps.setCameraZoom(1.0);
    this.deps.placePlayerAtCurrentRoom();
    if (this.deps.shouldActivateEntryCorridor()) {
      this.deps.activateEntryCorridor();
    }
  }

  rebuildEnvironment(): void {
    this.deps.clearFluidSpawners();
    this.deps.clearFluidCrestFoam();
    this.deps.resetContainerRegistry();
    this.deps.setFluidSystemReady(false);
    this.deps.buildFullMap();
    applyFluidGenericResolution(this.deps.getFullGrid(), this.deps.getTemperament());
    this.deps.initWeather();
    this.deps.attachFluidSystem();
    this.deps.setFluidSystemReady(true);
    this.deps.settleContainers();
  }
}
