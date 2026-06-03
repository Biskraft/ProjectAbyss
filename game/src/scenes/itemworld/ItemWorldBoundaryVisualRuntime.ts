import { Container, Graphics } from 'pixi.js';
import {
  IW_BOUNDARY_THICKNESS,
  IW_ROOM_H_PX,
  IW_ROOM_W_PX,
  TILE_SIZE,
} from './ItemWorldMapController';

export class ItemWorldBoundaryVisualRuntime {
  addBoundaryFrame(sealAggregate: Container | null, gridW: number, gridH: number): void {
    if (!sealAggregate) return;

    const layer = new Container();
    const fullW = gridW * IW_ROOM_W_PX;
    const fullH = gridH * IW_ROOM_H_PX;
    const thickness = IW_BOUNDARY_THICKNESS * TILE_SIZE;
    const frame = new Graphics();
    this.drawBoundaryWall(frame, 0, 0, fullW, thickness);
    this.drawBoundaryWall(frame, 0, fullH - thickness, fullW, thickness);
    this.drawBoundaryWall(frame, 0, 0, thickness, fullH);
    this.drawBoundaryWall(frame, fullW - thickness, 0, thickness, fullH);
    layer.addChild(frame);

    sealAggregate.addChild(layer);
  }

  private drawBoundaryWall(gfx: Graphics, x: number, y: number, w: number, h: number): void {
    const mortar = 0x3f4148;
    const colors = [0x5c6068, 0x686c74, 0x52565f, 0x747881];
    gfx.rect(x, y, w, h).fill(mortar);
    for (let py = y; py < y + h; py += 8) {
      const row = Math.floor((py - y) / 8);
      const offset = row % 2 === 0 ? 0 : 8;
      for (let px = x - offset; px < x + w; px += 16) {
        const bx = Math.max(x, px + 1);
        const bw = Math.min(px + 15, x + w) - bx;
        if (bw <= 0) continue;
        const color = colors[(row * 5 + Math.floor(px / 16)) % colors.length];
        gfx.rect(bx, py + 1, bw, 6).fill(color);
      }
    }
  }
}
