import { Graphics, type Container } from 'pixi.js';
import type { RoomGridData } from '@level/RoomGrid';

interface DrawMiniMapOptions {
  container: Container;
  gridData: RoomGridData;
  currentCol: number;
  currentRow: number;
  mapCols: number;
  mapRows: number;
  x?: number;
  y?: number;
  cellSize?: number;
  gap?: number;
  padding?: number;
}

export function drawLegacyWorldMiniMap({
  container,
  gridData,
  currentCol,
  currentRow,
  mapCols,
  mapRows,
  x = 4,
  y = 4,
  cellSize = 8,
  gap = 1,
  padding = 4,
}: DrawMiniMapOptions): void {
  container.removeChildren();

  const bgW = mapCols * (cellSize + gap) + gap + padding * 2;
  const bgH = mapRows * (cellSize + gap) + gap + padding * 2;
  const bg = new Graphics();
  bg.rect(0, 0, bgW, bgH).fill({ color: 0x000000, alpha: 0.6 });
  container.addChild(bg);

  for (let row = 0; row < gridData.height; row++) {
    for (let col = 0; col < gridData.width; col++) {
      const cell = gridData.cells[row][col];
      const cellX = padding + col * (cellSize + gap);
      const cellY = padding + row * (cellSize + gap);

      let color = 0x333333;
      let a = 0.3;
      if (cell.visited) {
        a = 1;
        if (cell.type === 0) color = 0x333333;
        else if (cell.cleared) color = 0x2a6a2a;
        else color = 0x4a4a6a;
      }
      if (col === currentCol && row === currentRow) {
        color = 0xe74c3c;
        a = 1;
      }

      const cellGfx = new Graphics();
      cellGfx.rect(0, 0, cellSize, cellSize).fill({ color, alpha: a });
      cellGfx.x = cellX;
      cellGfx.y = cellY;
      container.addChild(cellGfx);

      if (cell.visited && cell.type !== 0) {
        if (cell.exits.right && col < mapCols - 1) {
          const line = new Graphics();
          line.rect(0, 0, gap, 2).fill(0x666666);
          line.x = cellX + cellSize;
          line.y = cellY + cellSize / 2 - 1;
          container.addChild(line);
        }
        if (cell.exits.down && row < mapRows - 1) {
          const line = new Graphics();
          line.rect(0, 0, 2, gap).fill(0x666666);
          line.x = cellX + cellSize / 2 - 1;
          line.y = cellY + cellSize;
          container.addChild(line);
        }
      }
    }
  }

  container.x = x;
  container.y = y;
}

