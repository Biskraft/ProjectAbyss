import { GAME_HEIGHT, GAME_WIDTH } from '../../Game';
import type { Camera } from '@core/Camera';
import type { FluidSystem } from '@effects/FluidSystem';
import type { ItemWorldCellVisualRuntime } from './ItemWorldCellVisualRuntime';
import type { ItemWorldRuntimeCellSpawner } from './ItemWorldRuntimeCellSpawner';
import type { ItemWorldTileHazardRuntime } from './ItemWorldTileHazardRuntime';

interface ItemWorldCellVisibilityRuntimeDeps {
  getCellVisualRuntime: () => ItemWorldCellVisualRuntime;
  getRuntimeCellSpawner: () => ItemWorldRuntimeCellSpawner;
  getCamera: () => Camera;
  isFluidSystemReady: () => boolean;
  getFluidSystem: () => FluidSystem;
  getFullGrid: () => number[][];
  getTileHazardRuntime: () => ItemWorldTileHazardRuntime;
}

export class ItemWorldCellVisibilityRuntime {
  constructor(private readonly deps: ItemWorldCellVisibilityRuntimeDeps) {}

  update(): void {
    this.deps.getCellVisualRuntime().updateVisibility({
      camera: this.deps.getCamera(),
      viewportWidth: GAME_WIDTH,
      viewportHeight: GAME_HEIGHT,
      spawnForCell: (col, row) => this.deps.getRuntimeCellSpawner().spawnForCell(col, row),
      onWindowChanged: () => {
        if (!this.deps.isFluidSystemReady()) return;
        this.deps.getFluidSystem().refreshFromGrid(
          this.deps.getFullGrid(),
          this.deps.getTileHazardRuntime().getActiveTileBounds(),
        );
      },
    });
  }
}
