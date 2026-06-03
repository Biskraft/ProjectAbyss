import type { GiantBuilder } from '@entities/GiantBuilder';
import type { LdtkRenderer } from '@level/LdtkRenderer';
import type { WorldBuilderStampRuntime } from './WorldBuilderStampRuntime';

interface ItemDeploymentTunnelRuntimeDeps {
  getCollisionGrid: () => number[][];
  getRenderer: () => LdtkRenderer | null | undefined;
  getActiveBuilder: () => GiantBuilder | null;
  builderStampRuntime: WorldBuilderStampRuntime;
  rerenderTilemap: () => void;
  tileSize: number;
}

interface ClearTunnelOptions {
  x: number;
  y: number;
  w: number;
  h: number;
  levelRightPx: number;
}

export class ItemDeploymentTunnelRuntime {
  private deploymentTunnelRestoreCells: Array<{ row: number; col: number; value: number }> = [];
  private builderTunnelRestoreCells: Array<{ row: number; col: number; value: number }> = [];

  constructor(private readonly deps: ItemDeploymentTunnelRuntimeDeps) {}

  clearTunnel({ x, y, w, h, levelRightPx }: ClearTunnelOptions): { clearW: number } {
    this.restore(false);

    const clearW = Math.max(w, levelRightPx - x);
    const tile = this.deps.tileSize;
    const col0 = Math.floor(x / tile);
    const col1 = Math.floor((x + clearW - 1) / tile);
    const row0 = Math.floor(y / tile);
    const row1 = Math.floor((y + h - 1) / tile);
    const collisionGrid = this.deps.getCollisionGrid();

    for (let row = row0; row <= row1; row++) {
      const gridRow = collisionGrid[row];
      if (!gridRow) continue;
      for (let col = col0; col <= col1; col++) {
        if (col < 0 || col >= gridRow.length) continue;
        if (gridRow[col] !== 0) {
          this.deploymentTunnelRestoreCells.push({ row, col, value: gridRow[col] });
          gridRow[col] = 0;
        }
      }
    }

    this.deps.getRenderer()?.clearTilesInRect(x, y, clearW, h, { preserveInterior: true });
    this.clearActiveBuilderTunnel(x, y, h);

    return { clearW };
  }

  restore(rerender = true): void {
    const collisionGrid = this.deps.getCollisionGrid();
    if (this.deploymentTunnelRestoreCells.length > 0) {
      for (let i = this.deploymentTunnelRestoreCells.length - 1; i >= 0; i--) {
        const cell = this.deploymentTunnelRestoreCells[i];
        const row = collisionGrid[cell.row];
        if (!row || cell.col < 0 || cell.col >= row.length) continue;
        row[cell.col] = cell.value;
      }
      this.deploymentTunnelRestoreCells = [];
      if (rerender) this.deps.rerenderTilemap();
    }

    const activeBuilder = this.deps.getActiveBuilder();
    if (activeBuilder && this.builderTunnelRestoreCells.length > 0) {
      activeBuilder.restoreTunnelCells(this.builderTunnelRestoreCells);
      this.builderTunnelRestoreCells = [];
      this.restampActiveBuilder();
    } else {
      this.builderTunnelRestoreCells = [];
    }
  }

  private clearActiveBuilderTunnel(x: number, y: number, h: number): void {
    const activeBuilder = this.deps.getActiveBuilder();
    if (!activeBuilder) return;

    const tile = this.deps.tileSize;
    const localX = x - activeBuilder.container.x;
    const localY = y - activeBuilder.container.y;
    const bCol0 = Math.max(0, Math.floor(localX / tile));
    const bCol1 = activeBuilder.widthTiles - 1;
    const bRow0 = Math.max(0, Math.floor(localY / tile));
    const bRow1 = Math.min(activeBuilder.heightTiles - 1, Math.floor((localY + h - 1) / tile));

    for (let row = bRow0; row <= bRow1; row++) {
      const gridRow = activeBuilder.collisionGrid[row];
      if (!gridRow) continue;
      for (let col = bCol0; col <= bCol1; col++) {
        if (col < 0 || col >= gridRow.length) continue;
        if (gridRow[col] !== 0) {
          this.builderTunnelRestoreCells.push({ row, col, value: gridRow[col] });
        }
      }
    }

    activeBuilder.digTunnel(x, y, h);
    this.restampActiveBuilder();
  }

  private restampActiveBuilder(): void {
    this.deps.builderStampRuntime.restamp(this.deps.getActiveBuilder(), this.deps.getCollisionGrid());
  }
}
