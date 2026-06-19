import type { UnifiedRoomCell } from '@level/RoomGrid';
import type { LdtkLevel } from '@level/LdtkLoader';
import {
  IW_BOUNDARY_THICKNESS,
  IW_GRID_H,
  IW_GRID_W,
  IW_ROOM_H_TILES,
  IW_ROOM_SOCKET_TILES,
  IW_ROOM_W_TILES,
} from './ItemWorldMapController';

const TILE_SOLID = 1;
const TILE_AIR = 0;
const CLOSED_VERTICAL_EXIT_SEAL_TILES = 2;
const OPEN_VERTICAL_EXIT_CARVE_TILES = 4;

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
    const offR = cell.tileRect?.y ?? absRow * IW_ROOM_H_TILES;
    const offC = cell.tileRect?.x ?? col * IW_ROOM_W_TILES;
    const roomW = cell.tileRect?.w ?? ldtkLevel.collisionGrid[0]?.length ?? IW_ROOM_W_TILES;
    const roomH = cell.tileRect?.h ?? (ldtkLevel.collisionGrid.length || IW_ROOM_H_TILES);
    this.copyRoomCollision(fullGrid, ldtkLevel.collisionGrid, offR, offC);
    if (cell.templateId) return;
    this.openVerticalExits(fullGrid, cell, offR, offC, roomW, roomH);
    this.sealClosedVerticalExits(
      fullGrid,
      cell,
      offR,
      offC,
      roomW,
      roomH,
    );
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
    for (let tr = 0; tr < roomH; tr++) {
      for (let tc = 0; tc < roomW; tc++) {
        if (fullGrid[offR + tr]?.[offC + tc] !== undefined) {
          fullGrid[offR + tr][offC + tc] = roomGrid[tr][tc];
        }
      }
    }
  }

  private sealClosedVerticalExits(
    fullGrid: number[][],
    cell: UnifiedRoomCell,
    offR: number,
    offC: number,
    roomW: number,
    roomH: number,
  ): void {
    if (!cell.exits.down) {
      this.fillRoomRect(
        fullGrid,
        offR + roomH - CLOSED_VERTICAL_EXIT_SEAL_TILES,
        offR + roomH,
        offC,
        offC + roomW,
      );
    }
  }

  private openVerticalExits(
    fullGrid: number[][],
    cell: UnifiedRoomCell,
    offR: number,
    offC: number,
    roomW: number,
    roomH: number,
  ): void {
    const socketW = Math.min(roomW, IW_ROOM_SOCKET_TILES);
    const socketC0 = offC + Math.floor((roomW - socketW) / 2);
    const socketC1 = socketC0 + socketW;
    if (cell.exits.up) {
      this.clearRoomRect(
        fullGrid,
        offR,
        offR + OPEN_VERTICAL_EXIT_CARVE_TILES,
        socketC0,
        socketC1,
      );
    }
    if (cell.exits.down) {
      this.clearRoomRect(
        fullGrid,
        offR + roomH - OPEN_VERTICAL_EXIT_CARVE_TILES,
        offR + roomH,
        socketC0,
        socketC1,
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

  private clearRoomRect(
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
          fullGrid[r][c] = TILE_AIR;
        }
      }
    }
  }
}
