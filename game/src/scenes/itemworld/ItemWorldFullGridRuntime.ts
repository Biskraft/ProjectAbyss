import type { UnifiedRoomCell } from '@level/RoomGrid';
import type { LdtkLevel } from '@level/LdtkLoader';
import {
  IW_BOUNDARY_THICKNESS,
  IW_GRID_H,
  IW_GRID_W,
  IW_ROOM_H_TILES,
  IW_ROOM_W_TILES,
} from './ItemWorldMapController';

const TILE_SOLID = 1;
const CLOSED_VERTICAL_EXIT_SEAL_TILES = 2;

export class ItemWorldFullGridRuntime {
  createInitialGrid(widthRooms: number = IW_GRID_W, heightRooms: number = IW_GRID_H): number[][] {
    const grid: number[][] = [];
    const widthTiles = Math.max(1, widthRooms) * IW_ROOM_W_TILES;
    const heightTiles = Math.max(1, heightRooms) * IW_ROOM_H_TILES;
    for (let r = 0; r < heightTiles; r++) {
      grid[r] = new Array(widthTiles).fill(TILE_SOLID);
    }
    return grid;
  }

  applyRoomCollision(
    fullGrid: number[][],
    cell: UnifiedRoomCell,
    ldtkLevel: LdtkLevel,
    col: number,
    absRow: number,
  ): void {
    const offR = absRow * IW_ROOM_H_TILES;
    const offC = col * IW_ROOM_W_TILES;
    this.copyRoomCollision(fullGrid, ldtkLevel.collisionGrid, offR, offC);
    this.sealClosedVerticalExits(fullGrid, cell, offR, offC);
  }

  addBoundaryCollision(fullGrid: number[][], gridW: number, gridH: number): void {
    const widthTiles = gridW * IW_ROOM_W_TILES;
    const heightTiles = gridH * IW_ROOM_H_TILES;
    const thickness = IW_BOUNDARY_THICKNESS;
    for (let r = 0; r < heightTiles; r++) {
      for (let c = 0; c < widthTiles; c++) {
        const onBoundary = r < thickness
          || r >= heightTiles - thickness
          || c < thickness
          || c >= widthTiles - thickness;
        if (onBoundary && fullGrid[r]?.[c] !== undefined) {
          fullGrid[r][c] = TILE_SOLID;
        }
      }
    }
  }

  private copyRoomCollision(
    fullGrid: number[][],
    roomGrid: number[][],
    offR: number,
    offC: number,
  ): void {
    const roomH = roomGrid.length;
    const roomW = roomGrid[0]?.length ?? 0;
    for (let tr = 0; tr < roomH && tr < IW_ROOM_H_TILES; tr++) {
      for (let tc = 0; tc < roomW && tc < IW_ROOM_W_TILES; tc++) {
        fullGrid[offR + tr][offC + tc] = roomGrid[tr][tc];
      }
    }
  }

  private sealClosedVerticalExits(
    fullGrid: number[][],
    cell: UnifiedRoomCell,
    offR: number,
    offC: number,
  ): void {
    if (!cell.exits.up) {
      this.fillRoomRect(
        fullGrid,
        offR,
        offR + CLOSED_VERTICAL_EXIT_SEAL_TILES,
        offC,
        offC + IW_ROOM_W_TILES,
      );
    }
    if (!cell.exits.down) {
      this.fillRoomRect(
        fullGrid,
        offR + IW_ROOM_H_TILES - CLOSED_VERTICAL_EXIT_SEAL_TILES,
        offR + IW_ROOM_H_TILES,
        offC,
        offC + IW_ROOM_W_TILES,
      );
    }
  }

  private fillRoomRect(
    fullGrid: number[][],
    rowStart: number,
    rowEnd: number,
    colStart: number,
    colEnd: number,
  ): void {
    const fullH = fullGrid.length;
    const fullW = fullGrid[0]?.length ?? 0;
    for (let r = rowStart; r < rowEnd; r++) {
      for (let c = colStart; c < colEnd; c++) {
        if (r >= 0 && r < fullH && c >= 0 && c < fullW) {
          fullGrid[r][c] = TILE_SOLID;
        }
      }
    }
  }
}
