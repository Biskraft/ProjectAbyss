import { ColorMatrixFilter, Container, Graphics, type Texture } from 'pixi.js';
import { isSolid } from '@core/Physics';
import { substituteSolidGenericSprites } from '@data/ItemWorldFluidMapping';
import { LdtkRenderer } from '@level/LdtkRenderer';
import type { LdtkTile } from '@level/LdtkLoader';
import { addLdtkVisualBoundsBleed } from '@level/VisualBoundsBleed';
import { destroyDisplayObject } from '@scenes/shared/DisplayObjectLifecycleHelpers';
import type { EntryCorridorComposite } from './ItemWorldEntryCorridorLayout';
import { ItemWorldEntryCorridorRevealRuntime } from './ItemWorldEntryCorridorRevealRuntime';

interface ItemWorldEntryCorridorVisualRuntimeOptions {
  atlases: Record<string, Texture>;
  revealRuntime: ItemWorldEntryCorridorRevealRuntime;
  tileSize: number;
  getTemperament: () => string | null | undefined;
}

const ENTRY_CORRIDOR_CONTRAST = 0.5;

export class ItemWorldEntryCorridorVisualRuntime {
  private container: Container | null = null;

  constructor(private readonly options: ItemWorldEntryCorridorVisualRuntimeOptions) {}

  create(composite: EntryCorridorComposite): Container {
    this.destroy();
    this.options.revealRuntime.clear();

    const root = new Container();
    root.eventMode = 'none';
    root.zIndex = -0.5;

    const renderer = new LdtkRenderer();
    const wallTiles = composite.levels.flatMap((level, i) =>
      this.offsetTiles(level.wallTiles, composite.offsetsPx[i] ?? 0));
    const wallTilesSub = substituteSolidGenericSprites(
      wallTiles,
      composite.grid,
      this.options.getTemperament(),
    );

    renderer.renderLevel([], wallTilesSub, [], this.options.atlases, undefined, composite.grid, []);
    addLdtkVisualBoundsBleed({
      target: {
        wallLayer: renderer.wallLayer,
        specialLayer: renderer.specialLayer,
      },
      atlases: this.options.atlases,
      boundsWidth: composite.widthPx,
      boundsHeight: composite.heightPx,
      wallTiles: wallTilesSub,
      collisionGrid: composite.grid,
    });
    root.addChild(renderer.container);

    for (const child of renderer.wallLayer.children) {
      this.options.revealRuntime.registerRenderedTileNode(child as Container);
    }
    for (const child of renderer.specialLayer.children) {
      this.options.revealRuntime.registerRenderedTileNode(child as Container);
    }

    if (!this.options.revealRuntime.hasTiles) {
      this.addFallbackPlatforms(root, composite.grid);
    }

    const filter = new ColorMatrixFilter();
    filter.desaturate();
    filter.contrast(ENTRY_CORRIDOR_CONTRAST, true);
    root.filters = [filter];

    this.container = root;
    return root;
  }

  destroy(): void {
    if (this.container) {
      destroyDisplayObject(this.container, { children: true });
      this.container = null;
    }
    this.options.revealRuntime.clear();
  }

  private offsetTiles(tiles: LdtkTile[], offsetX: number): LdtkTile[] {
    return tiles.map(tile => ({
      ...tile,
      px: [tile.px[0] + offsetX, tile.px[1]],
      src: [tile.src[0], tile.src[1]],
    }));
  }

  private addFallbackPlatforms(root: Container, grid: number[][]): void {
    const tileLayer = new Container();
    root.addChild(tileLayer);
    for (let rowIndex = 0; rowIndex < grid.length; rowIndex++) {
      const row = grid[rowIndex];
      for (let col = 0; col < row.length; col++) {
        if (!isSolid(row[col])) continue;
        const gfx = new Graphics();
        gfx.rect(
          -this.options.tileSize / 2,
          -this.options.tileSize / 2,
          this.options.tileSize,
          this.options.tileSize,
        ).fill({ color: 0x000000, alpha: 1 });
        gfx.position.set(
          col * this.options.tileSize + this.options.tileSize / 2,
          rowIndex * this.options.tileSize + this.options.tileSize / 2,
        );
        gfx.scale.set(0);
        tileLayer.addChild(gfx);
        this.options.revealRuntime.registerCenteredTileNode(gfx, gfx.x, gfx.y);
      }
    }
  }
}
