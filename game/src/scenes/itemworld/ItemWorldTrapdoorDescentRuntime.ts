import { Container, Graphics } from 'pixi.js';
import { Debug } from '@core/Debug';
import {
  IW_DOOR_DEPTH,
  IW_DOOR_V_WIDTH,
  IW_ROOM_H_TILES,
  TILE_SIZE,
} from './ItemWorldMapController';

interface TrapdoorHoleAggregates {
  wall: Container | null;
  shadow: Container | null;
  naturalDeco: Container | null;
  artificialDeco: Container | null;
  structure: Container | null;
  background: Container | null;
  seal: Container | null;
}

interface PunchBossFloorHoleOptions {
  fullGrid: number[][];
  trapdoorX: number;
  trapdoorY: number;
  bossCellRow: number;
  aggregates: TrapdoorHoleAggregates;
}

export class ItemWorldTrapdoorDescentRuntime {
  punchBossFloorHole(options: PunchBossFloorHoleOptions): void {
    const fullGrid = options.fullGrid;
    if (!fullGrid || fullGrid.length === 0) return;

    const fullW = fullGrid[0]?.length ?? 0;
    const fullH = fullGrid.length;
    const trapdoorTileX = Math.floor(options.trapdoorX / TILE_SIZE);
    const halfW = Math.ceil(IW_DOOR_V_WIDTH / 2) + 1;
    const c0 = Math.max(0, trapdoorTileX - halfW);
    const cN = Math.min(fullW, trapdoorTileX + halfW);
    const r0 = Math.max(0, Math.floor(options.trapdoorY / TILE_SIZE));
    const nextCellTopRow = (options.bossCellRow + 1) * IW_ROOM_H_TILES;
    const rN = Math.min(fullH, nextCellTopRow + IW_DOOR_DEPTH);

    for (let r = r0; r < rN; r++) {
      for (let c = c0; c < cN; c++) {
        fullGrid[r][c] = 0;
      }
    }

    const holePxX = c0 * TILE_SIZE;
    const holePxY = r0 * TILE_SIZE;
    const holePxW = (cN - c0) * TILE_SIZE;
    const holePxH = (rN - r0) * TILE_SIZE;
    this.eraseAt(options.aggregates.wall, holePxX, holePxY, holePxW, holePxH);
    this.eraseAt(options.aggregates.shadow, holePxX, holePxY, holePxW, holePxH);
    this.eraseAt(options.aggregates.naturalDeco, holePxX, holePxY, holePxW, holePxH);
    this.eraseAt(options.aggregates.artificialDeco, holePxX, holePxY, holePxW, holePxH);
    this.eraseAt(options.aggregates.structure, holePxX, holePxY, holePxW, holePxH);
    this.eraseAt(options.aggregates.background, holePxX, holePxY, holePxW, holePxH);
    this.eraseAt(options.aggregates.seal, holePxX, holePxY, holePxW, holePxH);

    Debug.log(
      `[Trapdoor] hole punched: cols ${c0}..${cN} rows ${r0}..${rN} `
      + `bossCellRow=${options.bossCellRow} nextCellTop=${nextCellTopRow}`,
    );
  }

  private eraseAt(parent: Container | null | undefined, x: number, y: number, w: number, h: number): void {
    if (!parent) return;
    const gfx = new Graphics();
    gfx.rect(x, y, w, h).fill(0xffffff);
    gfx.blendMode = 'erase';
    parent.addChild(gfx);
  }
}
