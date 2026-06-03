import { TILE_UPDRAFT } from '@core/Physics';
import type { GiantBuilder } from '@entities/GiantBuilder';
import type { Player } from '@entities/Player';

export class WorldBuilderStampRuntime {
  private stamps: number[] = [];
  private readonly stampSet = new Set<number>();
  private originX: number | null = null;
  private originY: number | null = null;

  get activeStampSet(): Set<number> {
    return this.stampSet;
  }

  hasOriginChanged(builder: GiantBuilder): boolean {
    return this.originX !== Math.round(builder.container.x / 16)
      || this.originY !== Math.round(builder.container.y / 16);
  }

  stamp(builder: GiantBuilder | null, hostGrid: number[][]): void {
    if (!builder) return;

    const tileOriginX = Math.round(builder.container.x / 16);
    const tileOriginY = Math.round(builder.container.y / 16);
    const gridH = hostGrid.length;
    const gridW = gridH > 0 ? hostGrid[0].length : 0;

    for (let br = 0; br < builder.heightTiles; br++) {
      const r = tileOriginY + br;
      if (r < 0 || r >= gridH) continue;
      const builderRow = builder.collisionGrid[br];
      const hostRow = hostGrid[r];
      if (!builderRow || !hostRow) continue;

      for (let bc = 0; bc < builder.widthTiles; bc++) {
        const v = builderRow[bc];
        if (!v || v === TILE_UPDRAFT) continue;

        const c = tileOriginX + bc;
        if (c < 0 || c >= gridW) continue;
        if (hostRow[c] !== 0) continue;

        hostRow[c] = v;
        const stamp = r * gridW + c;
        this.stamps.push(stamp);
        this.stampSet.add(stamp);
      }
    }

    this.originX = tileOriginX;
    this.originY = tileOriginY;
  }

  unstamp(hostGrid: number[][]): void {
    const gridW = hostGrid[0]?.length ?? 0;
    for (const stamp of this.stamps) {
      const r = gridW > 0 ? Math.floor(stamp / gridW) : 0;
      const c = gridW > 0 ? stamp - r * gridW : 0;
      const row = hostGrid[r];
      if (row) row[c] = 0;
    }

    this.stamps.length = 0;
    this.stampSet.clear();
    this.originX = null;
    this.originY = null;
  }

  restamp(builder: GiantBuilder | null, hostGrid: number[][]): void {
    this.unstamp(hostGrid);
    this.stamp(builder, hostGrid);
  }

  refreshIfBuilderGrid(builder: GiantBuilder | null, changedGrid: number[][], hostGrid: number[][]): void {
    if (!builder || changedGrid !== builder.collisionGrid) return;
    this.restamp(builder, hostGrid);
  }

  isStampedCell(col: number, row: number, hostGrid: number[][]): boolean {
    const gridW = hostGrid[0]?.length ?? 0;
    return gridW > 0 && this.stampSet.has(row * gridW + col);
  }

  isPlayerOnStamp(player: Player, hostGrid: number[][]): boolean {
    if (this.stamps.length === 0) return false;
    if (!player.isGrounded()) return false;

    const feetY = player.y + player.height;
    const footRow = Math.floor((feetY + 1) / 16);
    const leftCol = Math.floor(player.x / 16);
    const rightCol = Math.floor((player.x + player.width - 1) / 16);
    const gridW = hostGrid[0]?.length ?? 0;
    if (gridW <= 0) return false;

    for (const stamp of this.stamps) {
      const r = Math.floor(stamp / gridW);
      const c = stamp - r * gridW;
      if (r === footRow && c >= leftCol && c <= rightCol) return true;
    }
    return false;
  }
}
