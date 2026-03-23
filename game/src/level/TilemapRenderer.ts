import { Container, Graphics, type Texture, Sprite, Texture as PixiTexture, Rectangle } from 'pixi.js';

const TILE_SIZE = 16;

export class TilemapRenderer {
  container: Container;
  private tileSize: number;

  constructor(tileSize = TILE_SIZE) {
    this.container = new Container();
    this.tileSize = tileSize;
  }

  loadRoom(roomData: number[][], tileset?: Texture): void {
    this.container.removeChildren();

    const height = roomData.length;
    const width = roomData[0]?.length ?? 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tileId = roomData[y][x];
        if (tileId === 0) continue; // empty

        if (tileset) {
          this.renderTileFromTileset(x, y, tileId, tileset);
        } else {
          this.renderPlaceholderTile(x, y, tileId);
        }
      }
    }
  }

  private renderTileFromTileset(x: number, y: number, tileId: number, tileset: Texture): void {
    const cols = Math.floor(tileset.width / this.tileSize);
    const tx = ((tileId - 1) % cols) * this.tileSize;
    const ty = Math.floor((tileId - 1) / cols) * this.tileSize;

    const frame = new Rectangle(tx, ty, this.tileSize, this.tileSize);
    const tileTexture = new PixiTexture({ source: tileset.source, frame });
    const sprite = new Sprite(tileTexture);
    sprite.x = x * this.tileSize;
    sprite.y = y * this.tileSize;
    this.container.addChild(sprite);
  }

  private renderPlaceholderTile(x: number, y: number, tileId: number): void {
    const colors: Record<number, number> = {
      1: 0x4a4a6a, // floor
      2: 0x2a2a4a, // wall
      3: 0x6a4a2a, // platform
    };
    const color = colors[tileId] ?? 0x333333;

    const gfx = new Graphics();
    gfx.rect(0, 0, this.tileSize, this.tileSize).fill(color);
    gfx.rect(0, 0, this.tileSize, this.tileSize).stroke({ color: 0x222222, width: 0.5 });
    gfx.x = x * this.tileSize;
    gfx.y = y * this.tileSize;
    this.container.addChild(gfx);
  }

  getTileAt(roomData: number[][], worldX: number, worldY: number): number {
    const tx = Math.floor(worldX / this.tileSize);
    const ty = Math.floor(worldY / this.tileSize);
    if (ty < 0 || ty >= roomData.length || tx < 0 || tx >= (roomData[0]?.length ?? 0)) {
      return 2; // out of bounds = solid
    }
    return roomData[ty][tx];
  }

  get tileWidth(): number {
    return this.tileSize;
  }
}
