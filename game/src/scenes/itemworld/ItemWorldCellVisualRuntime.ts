import { Container, Rectangle, type Texture } from 'pixi.js';
import { TILE_AIR, TILE_WALL } from '@core/Physics';
import { substituteSolidGenericSprites } from '@data/ItemWorldFluidMapping';
import { applyAreaTilesetToLdtkTiles, resolveAreaPaletteId } from '@data/areaPalettes';
import { LdtkRenderer } from '@level/LdtkRenderer';
import { isLdtkWallSlope2x1Tile, type LdtkLevel, type LdtkTile } from '@level/LdtkLoader';
import { addLdtkVisualBoundsBleed } from '@level/VisualBoundsBleed';
import { destroyDisplayObject } from '@scenes/shared/DisplayObjectLifecycleHelpers';
import {
  IW_ROOM_H_PX,
  IW_ROOM_H_TILES,
  IW_ROOM_W_PX,
  IW_ROOM_W_TILES,
  TILE_SIZE,
} from './ItemWorldMapController';

const ITEM_WORLD_DEFAULT_LDTK_TILESET = 'atlas/world_01.png';
const VISIBLE_CELL_BUFFER_ROOMS = 2;
const DESTROY_CELL_BUFFER_ROOMS = 4;
const CULL_WINDOW_QUANTIZE_PX = 128;

export interface ItemWorldCellVisualRecord {
  col: number;
  row: number;
  ldtkLevel: LdtkLevel;
  roomX: number;
  roomY: number;
  roomW: number;
  roomH: number;
  tileX: number;
  tileY: number;
}

interface RenderedCellVisual {
  col: number;
  row: number;
  x: number;
  y: number;
  w: number;
  h: number;
  layers: Container[];
}

interface CameraLike {
  renderX: number;
  renderY: number;
  zoom: number;
}

interface ItemWorldCellVisualRuntimeDeps {
  getCollisionGrid: () => number[][];
  getAtlases: () => Record<string, Texture>;
  getThemeSlug: () => string;
  getTemperament: () => string | undefined;
  getMapSize: () => { totalCols: number; totalRows: number };
  getAggregates: () => {
    bg: Container | null;
    interior: Container | null;
    wall: Container | null;
    special: Container | null;
    shadow: Container | null;
    seal?: Container | null;
  };
}

interface UpdateVisibilityOptions {
  camera: CameraLike;
  viewportWidth: number;
  viewportHeight: number;
  spawnForCell: (col: number, row: number) => void;
  onWindowChanged?: () => void;
}

export class ItemWorldCellVisualRuntime {
  private readonly records = new Map<string, ItemWorldCellVisualRecord>();
  private readonly rendered = new Map<string, RenderedCellVisual>();
  private cellLayerGroups: Array<{ col: number; row: number; layers: Container[] }> = [];
  private visibleWindowKey = '';
  private readonly viewportFilterArea = new Rectangle(0, 0, 1, 1);

  constructor(private readonly deps: ItemWorldCellVisualRuntimeDeps) {}

  clearRecords(): void {
    this.records.clear();
  }

  setRecord(record: ItemWorldCellVisualRecord): void {
    this.records.set(`${record.col}:${record.row}`, record);
  }

  getRecord(key: string): ItemWorldCellVisualRecord | undefined {
    return this.records.get(key);
  }

  resetRenderedState(): void {
    this.rendered.clear();
    this.cellLayerGroups = [];
    this.visibleWindowKey = '';
  }

  updateVisibility(options: UpdateVisibilityOptions): void {
    const halfW = (options.viewportWidth / options.camera.zoom) * 0.5;
    const halfH = (options.viewportHeight / options.camera.zoom) * 0.5;
    const baseL = options.camera.renderX - halfW;
    const baseR = options.camera.renderX + halfW;
    const baseT = options.camera.renderY - halfH;
    const baseB = options.camera.renderY + halfH;
    const visiblePadX = IW_ROOM_W_PX * VISIBLE_CELL_BUFFER_ROOMS;
    const visiblePadY = IW_ROOM_H_PX * VISIBLE_CELL_BUFFER_ROOMS;
    const destroyPadX = IW_ROOM_W_PX * DESTROY_CELL_BUFFER_ROOMS;
    const destroyPadY = IW_ROOM_H_PX * DESTROY_CELL_BUFFER_ROOMS;
    const viewL = baseL - visiblePadX;
    const viewR = baseR + visiblePadX;
    const viewT = baseT - visiblePadY;
    const viewB = baseB + visiblePadY;
    const destroyL = baseL - destroyPadX;
    const destroyR = baseR + destroyPadX;
    const destroyT = baseT - destroyPadY;
    const destroyB = baseB + destroyPadY;
    const windowKey = [
      Math.floor(viewL / CULL_WINDOW_QUANTIZE_PX),
      Math.floor(viewR / CULL_WINDOW_QUANTIZE_PX),
      Math.floor(viewT / CULL_WINDOW_QUANTIZE_PX),
      Math.floor(viewB / CULL_WINDOW_QUANTIZE_PX),
    ].join(',');

    if (windowKey !== this.visibleWindowKey) {
      this.visibleWindowKey = windowKey;
      this.renderVisibleWindow(
        viewL,
        viewR,
        viewT,
        viewB,
        destroyL,
        destroyR,
        destroyT,
        destroyB,
        options.spawnForCell,
      );
      options.onWindowChanged?.();
    }

    this.updateFilterArea(this.viewportFilterArea, viewL, viewR, viewT, viewB);
  }

  renderCellVisual(key: string): void {
    if (this.rendered.has(key)) return;

    const aggregates = this.deps.getAggregates();
    if (!aggregates.bg || !aggregates.interior || !aggregates.wall || !aggregates.special || !aggregates.shadow) {
      return;
    }

    const rec = this.records.get(key);
    if (!rec) return;

    const { ldtkLevel, roomX, roomY, roomW, roomH, tileX, tileY } = rec;
    const inBounds = (tile: { px: [number, number] }) =>
      tile.px[0] >= 0 && tile.px[0] < roomW &&
      tile.px[1] >= 0 && tile.px[1] < roomH;
    const bgTiles = ldtkLevel.backgroundTiles.filter(inBounds);
    const wallTiles = ldtkLevel.wallTiles.filter((tile) => {
      if (!inBounds(tile)) return false;
      const tr = Math.floor(tile.px[1] / TILE_SIZE);
      const tc = Math.floor(tile.px[0] / TILE_SIZE);
      if (isLdtkWallSlope2x1Tile(tile)) return true;
      return (this.deps.getCollisionGrid()[tileY + tr]?.[tileX + tc] ?? TILE_WALL) !== TILE_AIR;
    });
    const shadowTiles = ldtkLevel.shadowTiles.filter(inBounds);
    const interiorTiles = this.getInteriorTilesForRoom(ldtkLevel, inBounds);
    const wallTilesSub = substituteSolidGenericSprites(
      wallTiles,
      ldtkLevel.collisionGrid,
      this.deps.getTemperament(),
    );

    const bgAreaId = resolveAreaPaletteId(`iw_${this.deps.getThemeSlug()}_bg`, 'iw_foundry_bg');
    const wallAreaId = resolveAreaPaletteId(`iw_${this.deps.getThemeSlug()}_wall`, 'iw_foundry_wall');
    this.applyItemWorldAreaTileset(bgAreaId, bgTiles);
    this.applyItemWorldAreaTileset(wallAreaId, wallTilesSub);
    this.applyItemWorldAreaTileset(wallAreaId, shadowTiles);

    const renderer = new LdtkRenderer();
    renderer.renderLevel(
      bgTiles,
      wallTilesSub,
      shadowTiles,
      this.deps.getAtlases(),
      undefined,
      ldtkLevel.collisionGrid,
      interiorTiles,
    );
    renderer.bgLayer.position.set(roomX, roomY);
    renderer.interiorLayer.position.set(roomX, roomY);
    renderer.wallLayer.position.set(roomX, roomY);
    renderer.specialLayer.position.set(roomX, roomY);
    renderer.shadowLayer.position.set(roomX, roomY);

    const cellRect = new Rectangle(0, 0, roomW, roomH);
    renderer.bgLayer.cullable = true;
    renderer.bgLayer.cullArea = cellRect;
    renderer.interiorLayer.cullable = true;
    renderer.interiorLayer.cullArea = cellRect;
    renderer.wallLayer.cullable = true;
    renderer.wallLayer.cullArea = cellRect;
    renderer.specialLayer.cullable = true;
    renderer.specialLayer.cullArea = cellRect;
    renderer.shadowLayer.cullable = true;
    renderer.shadowLayer.cullArea = cellRect;

    aggregates.bg.addChild(renderer.bgLayer);
    aggregates.interior.addChild(renderer.interiorLayer);
    aggregates.wall.addChild(renderer.wallLayer);
    aggregates.special.addChild(renderer.specialLayer);
    aggregates.shadow.addChild(renderer.shadowLayer);

    const mapSize = this.deps.getMapSize();
    const bleedLayers = addLdtkVisualBoundsBleed({
      target: {
        bgLayer: aggregates.bg,
        interiorLayer: aggregates.interior,
        wallLayer: aggregates.wall,
        specialLayer: aggregates.special,
        shadowLayer: aggregates.shadow,
      },
      atlases: this.deps.getAtlases(),
      boundsWidth: mapSize.totalCols * IW_ROOM_W_PX,
      boundsHeight: mapSize.totalRows * IW_ROOM_H_PX,
      bgTiles,
      wallTiles: wallTilesSub,
      shadowTiles,
      interiorTiles,
      collisionGrid: ldtkLevel.collisionGrid,
      offsetX: roomX,
      offsetY: roomY,
    });

    const layers = [
      renderer.bgLayer,
      renderer.interiorLayer,
      renderer.wallLayer,
      renderer.specialLayer,
      renderer.shadowLayer,
      ...bleedLayers,
    ];
    this.rendered.set(key, { col: rec.col, row: rec.row, x: roomX, y: roomY, w: roomW, h: roomH, layers });
    this.cellLayerGroups.push({ col: rec.col, row: rec.row, layers });
  }

  private destroyCellVisual(key: string): void {
    const rendered = this.rendered.get(key);
    if (!rendered) return;
    for (const layer of rendered.layers) {
      destroyDisplayObject(layer, {
        children: true,
        texture: false,
        textureSource: false,
        context: true,
      });
    }
    this.rendered.delete(key);
    this.cellLayerGroups = this.cellLayerGroups.filter(group => group.layers !== rendered.layers);
  }

  private getInteriorTilesForRoom(
    ldtkLevel: LdtkLevel,
    filter?: (tile: LdtkTile) => boolean,
  ): LdtkTile[] {
    const tiles = [
      ...ldtkLevel.interiorTiles,
      ...Object.values(ldtkLevel.extraTileLayers).flat(),
    ];
    return filter ? tiles.filter(filter) : tiles;
  }

  private renderVisibleWindow(
    viewL: number,
    viewR: number,
    viewT: number,
    viewB: number,
    destroyL: number,
    destroyR: number,
    destroyT: number,
    destroyB: number,
    spawnForCell: (col: number, row: number) => void,
  ): void {
    for (const [key, rec] of this.records) {
      if (!this.rectsIntersect(viewL, viewR, viewT, viewB, rec.roomX, rec.roomX + rec.roomW, rec.roomY, rec.roomY + rec.roomH)) {
        continue;
      }
      spawnForCell(rec.col, rec.row);
      this.renderCellVisual(key);
    }

    for (const [key, rendered] of Array.from(this.rendered)) {
      const roomL = rendered.x;
      const roomR = rendered.x + rendered.w;
      const roomT = rendered.y;
      const roomB = rendered.y + rendered.h;
      const visible = this.rectsIntersect(viewL, viewR, viewT, viewB, roomL, roomR, roomT, roomB);
      const keep = this.rectsIntersect(destroyL, destroyR, destroyT, destroyB, roomL, roomR, roomT, roomB);
      if (!keep) {
        this.destroyCellVisual(key);
      } else {
        for (const layer of rendered.layers) layer.visible = visible;
      }
    }
  }

  private rectsIntersect(
    aL: number,
    aR: number,
    aT: number,
    aB: number,
    bL: number,
    bR: number,
    bT: number,
    bB: number,
  ): boolean {
    return aL < bR && aR > bL && aT < bB && aB > bT;
  }

  private updateFilterArea(filterArea: Rectangle, viewL: number, viewR: number, viewT: number, viewB: number): void {
    filterArea.x = viewL;
    filterArea.y = viewT;
    filterArea.width = viewR - viewL;
    filterArea.height = viewB - viewT;

    const aggregates = this.deps.getAggregates();
    if (aggregates.bg) aggregates.bg.filterArea = filterArea;
    if (aggregates.interior) aggregates.interior.filterArea = filterArea;
    if (aggregates.wall) aggregates.wall.filterArea = filterArea;
    if (aggregates.shadow) aggregates.shadow.filterArea = filterArea;
    if (aggregates.seal) aggregates.seal.filterArea = filterArea;
  }

  private applyItemWorldAreaTileset(areaId: string, tiles: LdtkTile[]): void {
    const defaultAuthoredTiles = tiles.filter(tile =>
      !tile.tilesetPath || tile.tilesetPath === ITEM_WORLD_DEFAULT_LDTK_TILESET);
    applyAreaTilesetToLdtkTiles(areaId, defaultAuthoredTiles);
  }
}
