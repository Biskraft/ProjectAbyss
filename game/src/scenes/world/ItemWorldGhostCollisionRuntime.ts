import type { Camera } from '@core/Camera';
import { TILE_AIR } from '@core/Physics';
import type { RuntimeCollisionScope } from '@level/RuntimeCollisionScope';
import type { ItemWorldGhostOverlay } from '@effects/ItemWorldGhostOverlay';

interface StreamRestoreState {
  rowLengths: number[];
  rowCount: number;
  cameraBounds: { left: number; top: number; right: number; bottom: number } | null;
}

export interface ItemWorldGhostCollisionRuntimeDeps {
  getCollisionGrid: () => number[][];
  setPlayerRoomData: (grid: number[][]) => void;
  camera: Camera;
  getCurrentLevelSize: () => { pxWid: number; pxHei: number };
  tileSize: number;
  visualBoundsBleedPx: number;
}

export class ItemWorldGhostCollisionRuntime {
  private restoreCells: Array<{ row: number; col: number; value: number }> = [];
  private streamRestore: StreamRestoreState | null = null;

  constructor(private readonly deps: ItemWorldGhostCollisionRuntimeDeps) {}

  extendWorldForGhostStream(ghost: ItemWorldGhostOverlay, scope: RuntimeCollisionScope | null): void {
    if (this.streamRestore) return;

    const collisionGrid = this.deps.getCollisionGrid();
    const tile = this.deps.tileSize;
    const rightPx = Math.ceil(ghost.container.x + ghost.builtPxW + tile * 2);
    const bottomPx = Math.ceil(ghost.container.y + ghost.builtPxH + tile * 2);
    const requiredCols = Math.max(collisionGrid[0]?.length ?? 0, Math.ceil(rightPx / tile));
    const requiredRows = Math.max(collisionGrid.length, Math.ceil(bottomPx / tile));

    this.streamRestore = {
      rowLengths: collisionGrid.map(row => row.length),
      rowCount: collisionGrid.length,
      cameraBounds: this.deps.camera.bounds ? { ...this.deps.camera.bounds } : null,
    };

    if (scope) {
      scope.ensureSize(requiredCols, requiredRows, TILE_AIR);
    } else {
      for (let row = 0; row < requiredRows; row++) {
        if (!collisionGrid[row]) collisionGrid[row] = [];
        while (collisionGrid[row].length < requiredCols) {
          collisionGrid[row].push(TILE_AIR);
        }
      }
    }

    this.deps.setPlayerRoomData(collisionGrid);
    const levelSize = this.deps.getCurrentLevelSize();
    const streamRight = Math.max(levelSize.pxWid, requiredCols * tile);
    const streamBottom = Math.max(levelSize.pxHei, requiredRows * tile);
    this.deps.camera.setBounds(0, 0, streamRight, streamBottom, this.deps.visualBoundsBleedPx);
  }

  prepareGhostWorldCollision(ghost: ItemWorldGhostOverlay, scope: RuntimeCollisionScope | null): void {
    const collisionGrid = this.deps.getCollisionGrid();
    const sourceGrid = ghost.getCollisionGrid();
    const gx0 = Math.floor(ghost.container.x / this.deps.tileSize);
    const gy0 = Math.floor(ghost.container.y / this.deps.tileSize);

    for (let r = 0; r < sourceGrid.length; r++) {
      const worldRowIndex = gy0 + r;
      const worldRow = collisionGrid[worldRowIndex];
      if (!worldRow) continue;
      const sourceRow = sourceGrid[r] ?? [];
      for (let c = 0; c < sourceRow.length; c++) {
        const gc = gx0 + c;
        if (gc < 0 || gc >= worldRow.length) continue;
        const value = sourceRow[c] ?? TILE_AIR;
        if (scope) {
          scope.setCell(worldRowIndex, gc, value);
        } else {
          if (!this.isStreamExtendedCell(worldRowIndex, gc)) {
            this.restoreCells.push({ row: worldRowIndex, col: gc, value: worldRow[gc] });
          }
          worldRow[gc] = value;
        }
      }
    }
    ghost.setTileBuildCallback(null);
    this.deps.setPlayerRoomData(collisionGrid);
  }

  restore(restoreGrid: boolean, restoreStampedCells: boolean): void {
    const collisionGrid = this.deps.getCollisionGrid();
    if (restoreStampedCells && this.restoreCells.length > 0) {
      for (let i = this.restoreCells.length - 1; i >= 0; i--) {
        const cell = this.restoreCells[i];
        const row = collisionGrid[cell.row];
        if (!row || cell.col < 0 || cell.col >= row.length) continue;
        row[cell.col] = cell.value;
      }
    }
    this.restoreCells = [];
    this.clearStreamState(restoreGrid);
  }

  clearStreamState(restoreGrid: boolean): void {
    const restore = this.streamRestore;
    if (!restore) return;

    const collisionGrid = this.deps.getCollisionGrid();
    if (restoreGrid) {
      collisionGrid.length = restore.rowCount;
      for (let row = 0; row < restore.rowCount; row++) {
        const length = restore.rowLengths[row] ?? collisionGrid[row]?.length ?? 0;
        if (collisionGrid[row]) collisionGrid[row].length = length;
      }
      this.deps.setPlayerRoomData(collisionGrid);
    }

    if (restore.cameraBounds) {
      this.deps.camera.setBounds(
        restore.cameraBounds.left,
        restore.cameraBounds.top,
        restore.cameraBounds.right,
        restore.cameraBounds.bottom,
        this.deps.visualBoundsBleedPx,
      );
    } else {
      this.deps.camera.clearBounds();
    }
    this.streamRestore = null;
  }

  private isStreamExtendedCell(row: number, col: number): boolean {
    const restore = this.streamRestore;
    if (!restore) return false;
    if (row >= restore.rowCount) return true;
    return col >= (restore.rowLengths[row] ?? 0);
  }
}
