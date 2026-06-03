import { Container, Rectangle, type Texture } from 'pixi.js';
import { TILE_AIR, TILE_WALL } from '@core/Physics';
import { substituteSolidGenericSprites } from '@data/ItemWorldFluidMapping';
import { applyAreaTilesetToLdtkTiles } from '@data/areaPalettes';
import { LdtkRenderer } from '@level/LdtkRenderer';
import { isLdtkWallSlope2x1Tile, type LdtkLevel, type LdtkTile } from '@level/LdtkLoader';
import { addLdtkVisualBoundsBleed } from '@level/VisualBoundsBleed';
import {
  IW_ROOM_H_PX,
  IW_ROOM_H_TILES,
  IW_ROOM_W_PX,
  IW_ROOM_W_TILES,
  TILE_SIZE,
} from './ItemWorldMapController';

const ITEM_WORLD_DEFAULT_LDTK_TILESET = 'atlas/world_01.png';

export interface ItemWorldCellVisualRecord {
  col: number;
  row: number;
  ldtkLevel: LdtkLevel;
  roomX: number;
  roomY: number;
}

interface RenderedCellVisual {
  col: number;
  row: number;
  layers: Container[];
}

interface CameraLike {
  renderX: number;
  renderY: number;
  zoom: number;
}

interface ItemWorldCellVisualRuntimeDeps {
  getFullGrid: () => number[][];
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
    const viewL = options.camera.renderX - halfW - IW_ROOM_W_PX;
    const viewR = options.camera.renderX + halfW + IW_ROOM_W_PX;
    const viewT = options.camera.renderY - halfH - IW_ROOM_H_PX;
    const viewB = options.camera.renderY + halfH + IW_ROOM_H_PX;
    const minCol = Math.floor(viewL / IW_ROOM_W_PX);
    const maxCol = Math.floor(viewR / IW_ROOM_W_PX);
    const minRow = Math.floor(viewT / IW_ROOM_H_PX);
    const maxRow = Math.floor(viewB / IW_ROOM_H_PX);
    const windowKey = `${minCol},${maxCol},${minRow},${maxRow}`;

    if (windowKey !== this.visibleWindowKey) {
      this.visibleWindowKey = windowKey;
      this.renderVisibleWindow(minCol, maxCol, minRow, maxRow, options.spawnForCell);
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

    const { col, row: absRow, ldtkLevel, roomX, roomY } = rec;
    const inBounds = (tile: { px: [number, number] }) =>
      tile.px[0] >= 0 && tile.px[0] < IW_ROOM_W_PX &&
      tile.px[1] >= 0 && tile.px[1] < IW_ROOM_H_PX;
    const bgTiles = ldtkLevel.backgroundTiles.filter(inBounds);
    const wallTiles = ldtkLevel.wallTiles.filter((tile) => {
      if (!inBounds(tile)) return false;
      const tr = Math.floor(tile.px[1] / TILE_SIZE);
      const tc = Math.floor(tile.px[0] / TILE_SIZE);
      if (isLdtkWallSlope2x1Tile(tile)) return true;
      return (this.deps.getFullGrid()[absRow * IW_ROOM_H_TILES + tr]?.[col * IW_ROOM_W_TILES + tc] ?? TILE_WALL) !== TILE_AIR;
    });
    const shadowTiles = ldtkLevel.shadowTiles.filter(inBounds);
    const interiorTiles = this.getInteriorTilesForRoom(ldtkLevel, inBounds);
    const wallTilesSub = substituteSolidGenericSprites(
      wallTiles,
      ldtkLevel.collisionGrid,
      this.deps.getTemperament(),
    );

    const bgAreaId = `iw_${this.deps.getThemeSlug()}_bg`;
    const wallAreaId = `iw_${this.deps.getThemeSlug()}_wall`;
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

    const cellRect = new Rectangle(0, 0, IW_ROOM_W_PX, IW_ROOM_H_PX);
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
    this.rendered.set(key, { col, row: absRow, layers });
    this.cellLayerGroups.push({ col, row: absRow, layers });
  }

  private renderedEntries(): Array<[string, RenderedCellVisual]> {
    return Array.from(this.rendered);
  }

  private destroyCellVisual(key: string): void {
    const rendered = this.rendered.get(key);
    if (!rendered) return;
    for (const layer of rendered.layers) {
      if (layer.parent) layer.parent.removeChild(layer);
      layer.destroy({ children: true, texture: false, textureSource: false, context: true });
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
    minCol: number,
    maxCol: number,
    minRow: number,
    maxRow: number,
    spawnForCell: (col: number, row: number) => void,
  ): void {
    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        spawnForCell(col, row);
        this.renderCellVisual(`${col}:${row}`);
      }
    }

    const destroyMinCol = minCol - 1;
    const destroyMaxCol = maxCol + 1;
    const destroyMinRow = minRow - 1;
    const destroyMaxRow = maxRow + 1;
    for (const [key, rendered] of this.renderedEntries()) {
      const visible =
        rendered.col >= minCol &&
        rendered.col <= maxCol &&
        rendered.row >= minRow &&
        rendered.row <= maxRow;
      if (
        rendered.col < destroyMinCol ||
        rendered.col > destroyMaxCol ||
        rendered.row < destroyMinRow ||
        rendered.row > destroyMaxRow
      ) {
        this.destroyCellVisual(key);
      } else {
        for (const layer of rendered.layers) layer.visible = visible;
      }
    }
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
