import type { Container } from 'pixi.js';
import type { Player } from '@entities/Player';
import { bindPlayerCollisionGrid } from '@scenes/shared/PlayerPlacementHelpers';

interface CameraBoundsLike {
  setBounds(x: number, y: number, width: number, height: number, bleedPx?: number): void;
}

export interface ItemWorldFullMapAttachRuntimeDeps {
  getSceneContainer: () => Container;
  getFullMapContainer: () => Container | null;
  getPlayer: () => Player;
  setRoomData: (grid: number[][]) => void;
  spawnCurrentCell: () => void;
  updateCellVisibility: () => void;
  getCamera: () => CameraBoundsLike;
}

export interface AttachBuiltFullMapOptions {
  fullGrid: number[][];
  totalCols: number;
  totalRows: number;
  roomWidthPx: number;
  roomHeightPx: number;
  visualBoundsBleedPx: number;
}

export class ItemWorldFullMapAttachRuntime {
  constructor(private readonly deps: ItemWorldFullMapAttachRuntimeDeps) {}

  attachBuiltFullMap(options: AttachBuiltFullMapOptions): void {
    const fullMapContainer = this.deps.getFullMapContainer();
    if (!fullMapContainer) {
      throw new Error('ItemWorldFullMapAttachRuntime.attachBuiltFullMap called before fullMapContainer rebuild');
    }

    this.deps.getSceneContainer().addChildAt(fullMapContainer, 0);
    this.deps.spawnCurrentCell();
    this.deps.updateCellVisibility();

    this.deps.setRoomData(options.fullGrid);
    bindPlayerCollisionGrid(this.deps.getPlayer(), options.fullGrid);
    this.deps.getCamera().setBounds(
      0,
      0,
      options.totalCols * options.roomWidthPx,
      options.totalRows * options.roomHeightPx,
      options.visualBoundsBleedPx,
    );
  }
}
