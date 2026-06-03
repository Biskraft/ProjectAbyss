import { Container, Graphics } from 'pixi.js';
import { TILE_WALL } from '@core/Physics';

export class WorldSolidifiedWallOverlay {
  readonly graphics = new Graphics();
  private readonly cells = new Set<string>();

  constructor(private readonly tileSize: number) {}

  attach(parent: Container): void {
    if (!this.graphics.parent) parent.addChild(this.graphics);
  }

  addCell(gx: number, gy: number, collisionGrid: number[][]): void {
    this.cells.add(`${gx},${gy}`);
    this.redraw(collisionGrid);
  }

  clear(): void {
    this.cells.clear();
    this.graphics.clear();
  }

  redraw(collisionGrid: number[][]): void {
    const g = this.graphics;
    g.clear();
    for (const key of this.cells) {
      const ix = key.indexOf(',');
      const gx = +key.slice(0, ix);
      const gy = +key.slice(ix + 1);
      if (collisionGrid[gy]?.[gx] !== TILE_WALL) continue;
      const x = gx * this.tileSize;
      const y = gy * this.tileSize;
      g.rect(x, y, this.tileSize, this.tileSize).fill({ color: 0x2b2520, alpha: 1 });
      g.rect(x, y, this.tileSize, 2).fill({ color: 0x8a4c2b, alpha: 1 });
      g.rect(x + 2, y + 4, this.tileSize - 4, 1).fill({ color: 0x4d382c, alpha: 0.9 });
      g.rect(x + 1, y + this.tileSize - 2, this.tileSize - 2, 1).fill({ color: 0x171310, alpha: 0.85 });
    }
  }
}
