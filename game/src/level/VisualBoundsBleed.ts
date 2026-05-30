import { Container, Rectangle, Sprite, Texture } from 'pixi.js';
import { isSpecialVisualTile, TILE_ACID, TILE_CYRO, TILE_MAGMA, TILE_OIL, TILE_UPDRAFT, TILE_WATER } from '@core/Physics';
import { TILE_SIZE, type LdtkTile } from './LdtkLoader';

export const VISUAL_BOUNDS_BLEED_PX = TILE_SIZE * 4;

type AtlasSource = Texture | Record<string, Texture>;

interface TargetLayers {
  bgLayer?: Container | null;
  interiorLayer?: Container | null;
  wallLayer?: Container | null;
  specialLayer?: Container | null;
  shadowLayer?: Container | null;
}

interface AddVisualBoundsBleedOptions {
  target: TargetLayers;
  atlases: AtlasSource;
  boundsWidth: number;
  boundsHeight: number;
  bgTiles?: LdtkTile[];
  interiorTiles?: LdtkTile[];
  wallTiles?: LdtkTile[];
  shadowTiles?: LdtkTile[];
  collisionGrid?: number[][];
  offsetX?: number;
  offsetY?: number;
  bleedPx?: number;
}

const COLOR_TILE_MIN_SRC_X = 160;
const COLOR_TILE_MIN_SRC_Y = 208;

export function visualBoundsBleedArea(width: number, height: number, bleedPx = VISUAL_BOUNDS_BLEED_PX): Rectangle {
  return new Rectangle(-bleedPx, -bleedPx, width + bleedPx * 2, height + bleedPx * 2);
}

export function addLdtkVisualBoundsBleed(opts: AddVisualBoundsBleedOptions): Container[] {
  const bleedPx = opts.bleedPx ?? VISUAL_BOUNDS_BLEED_PX;
  if (bleedPx <= 0 || opts.boundsWidth <= 0 || opts.boundsHeight <= 0) return [];

  const added: Container[] = [];
  const bg = addTileSet(opts.bgTiles, opts.target.bgLayer, opts, bleedPx);
  const interior = addTileSet(opts.interiorTiles, opts.target.interiorLayer, opts, bleedPx);
  const shadow = addTileSet(opts.shadowTiles, opts.target.shadowLayer, opts, bleedPx);
  if (bg) added.push(bg);
  if (interior) added.push(interior);
  if (shadow) added.push(shadow);
  added.push(...addWallTileSet(opts.wallTiles, opts, bleedPx));

  return added;
}

function addTileSet(
  tiles: LdtkTile[] | undefined,
  target: Container | null | undefined,
  opts: AddVisualBoundsBleedOptions,
  bleedPx: number,
): Container | null {
  if (!tiles?.length || !target) return null;
  const layer = new Container();
  for (const tile of tiles) {
    addBleedSpritesForTile(layer, tile, opts, bleedPx);
  }
  if (layer.children.length === 0) return null;
  target.addChild(layer);
  return layer;
}

function addWallTileSet(
  tiles: LdtkTile[] | undefined,
  opts: AddVisualBoundsBleedOptions,
  bleedPx: number,
): Container[] {
  if (!tiles?.length || !opts.target.wallLayer) return [];

  const wallLayer = new Container();
  const specialLayer = new Container();

  for (const tile of tiles) {
    if (isFluidHiddenTile(tile, opts.collisionGrid)) continue;
    const target = isSpecialTile(tile, opts.collisionGrid) && opts.target.specialLayer ? specialLayer : wallLayer;
    addBleedSpritesForTile(target, tile, opts, bleedPx);
  }

  const added: Container[] = [];
  if (wallLayer.children.length > 0) opts.target.wallLayer.addChild(wallLayer);
  if (wallLayer.children.length > 0) added.push(wallLayer);
  if (specialLayer.children.length > 0) {
    opts.target.specialLayer?.addChild(specialLayer);
    if (opts.target.specialLayer) added.push(specialLayer);
  }
  return added;
}

function addBleedSpritesForTile(
  target: Container,
  tile: LdtkTile,
  opts: AddVisualBoundsBleedOptions,
  bleedPx: number,
): void {
  const baseX = (opts.offsetX ?? 0) + tile.px[0];
  const baseY = (opts.offsetY ?? 0) + tile.px[1];
  const xPositions = [baseX];
  const yPositions = [baseY];

  if (baseX < bleedPx) xPositions.push(-TILE_SIZE - baseX);
  if (baseX >= opts.boundsWidth - bleedPx) xPositions.push(opts.boundsWidth + (opts.boundsWidth - TILE_SIZE - baseX));
  if (baseY < bleedPx) yPositions.push(-TILE_SIZE - baseY);
  if (baseY >= opts.boundsHeight - bleedPx) yPositions.push(opts.boundsHeight + (opts.boundsHeight - TILE_SIZE - baseY));

  if (xPositions.length === 1 && yPositions.length === 1) return;

  for (const x of xPositions) {
    for (const y of yPositions) {
      if (x === baseX && y === baseY) continue;
      const sprite = buildSprite(tile, opts.atlases);
      if (!sprite) continue;
      sprite.x = x;
      sprite.y = y;
      target.addChild(sprite);
    }
  }
}

const textureSourceIds = new WeakMap<object, number>();
let nextTextureSourceId = 1;
const tileTextureCache = new Map<string, Texture>();

function getTextureSourceId(source: object): number {
  let id = textureSourceIds.get(source);
  if (!id) {
    id = nextTextureSourceId++;
    textureSourceIds.set(source, id);
  }
  return id;
}

function getTileTexture(atlas: Texture, tile: LdtkTile): Texture {
  const sourceId = getTextureSourceId(atlas.source as object);
  const key = `${sourceId}:${tile.src[0]}:${tile.src[1]}:${TILE_SIZE}:${TILE_SIZE}`;
  let texture = tileTextureCache.get(key);
  if (!texture) {
    const frame = new Rectangle(tile.src[0], tile.src[1], TILE_SIZE, TILE_SIZE);
    texture = new Texture({ source: atlas.source, frame });
    tileTextureCache.set(key, texture);
  }
  return texture;
}

function resolveAtlas(atlases: AtlasSource, tile: LdtkTile): Texture | null {
  if (atlases instanceof Texture) return atlases;
  if (tile.tilesetPath && atlases[tile.tilesetPath]) return atlases[tile.tilesetPath];
  const firstKey = Object.keys(atlases)[0];
  if (!firstKey) return null;
  if (tile.tilesetPath && !atlases[tile.tilesetPath]) return null;
  return atlases[firstKey] ?? null;
}

function buildSprite(tile: LdtkTile, atlases: AtlasSource): Sprite | null {
  const atlas = resolveAtlas(atlases, tile);
  if (!atlas) return null;

  const sprite = new Sprite(getTileTexture(atlas, tile));
  sprite.alpha = tile.a;
  if (tile.f & 1) {
    sprite.scale.x = -1;
    sprite.anchor.x = 1;
  }
  if (tile.f & 2) {
    sprite.scale.y = -1;
    sprite.anchor.y = 1;
  }
  return sprite;
}

function isFluidHiddenTile(tile: LdtkTile, collisionGrid?: number[][]): boolean {
  if (!collisionGrid) return false;
  const col = Math.floor(tile.px[0] / TILE_SIZE);
  const row = Math.floor(tile.px[1] / TILE_SIZE);
  const v = collisionGrid[row]?.[col] ?? 0;
  return (
    v === TILE_WATER ||
    v === TILE_OIL ||
    v === TILE_ACID ||
    v === TILE_MAGMA ||
    v === TILE_CYRO ||
    v === TILE_UPDRAFT ||
    v === 17 ||
    v === 18 ||
    v === 19
  );
}

function isSpecialTile(tile: LdtkTile, collisionGrid?: number[][]): boolean {
  if (tile.src[0] >= COLOR_TILE_MIN_SRC_X && tile.src[1] >= COLOR_TILE_MIN_SRC_Y) return true;
  if (!collisionGrid) return false;
  const col = Math.floor(tile.px[0] / TILE_SIZE);
  const row = Math.floor(tile.px[1] / TILE_SIZE);
  return isSpecialVisualTile(collisionGrid[row]?.[col] ?? 0);
}
