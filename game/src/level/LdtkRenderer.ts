/**
 * LdtkRenderer ??renders parsed LDtk level data using PixiJS v8 sprites.
 */

import { Container, Sprite, Texture, Rectangle, Graphics } from 'pixi.js';
import { TILE_SIZE, type LdtkTile, type LdtkEntity } from './LdtkLoader';
import { isSpecialVisualTile, TILE_OIL, TILE_ACID, TILE_MAGMA, TILE_WATER, TILE_CYRO, TILE_UPDRAFT } from '@core/Physics';

const DEFAULT_SHADOW_OPACITY = 0.53;

/**
 * Atlas ?먯깋 蹂댁〈 ?곸뿭 (src 醫뚰몴, px 湲곗?).
 *
 * ?꾪??쇱뒪 ?ㅻⅨ履??섎떒 援ъ뿭??諛곗튂???댁????좏샇 ??쇰뱾(臾?媛??諛붾엺/遺????
 * ?됱긽 ?먯껜媛 ?뚮젅?댁뼱 而ㅻ??덉??댁뀡 ??븷???섎?濡?biome PaletteSwapFilter ?? * 臾쇰뱾吏 ?딅룄濡?`specialLayer` 濡??고쉶?쒗궓??
 *
 * IntGrid 媛믪씠 ?뱀닔(2/4/5/6/8)媛 ?꾨땲?붾씪?? tile.src 媛 ???ш컖???덉뿉 ?ㅻ㈃
 * 臾댁“嫄?specialLayer 濡?媛꾩＜. ?꾪??쇱뒪留덈떎 ?됱긽 ?곸뿭???щ씪吏硫????곸닔留? * 議곗젙?섎㈃ ?쒕떎.
 */
const COLOR_TILE_MIN_SRC_X = 160;
const COLOR_TILE_MIN_SRC_Y = 208;

/** Color used per entity type for debug markers. */
const ENTITY_COLORS: Record<string, number> = {
  Player: 0x00ff00,
  Item: 0xffff00,
  Exit: 0xff0000,
  Teleport: 0x4488ff,
};
const ENTITY_COLOR_FALLBACK = 0xffffff;
const ENTITY_MARKER_SIZE = 6;

export class LdtkRenderer {
  private static readonly textureSourceIds = new WeakMap<object, number>();
  private static nextTextureSourceId = 1;
  private static readonly tileTextureCache = new Map<string, Texture>();

  /** Root container ??add this to your scene. */
  readonly container: Container;

  /** Background autoLayer tiles (rendered first / bottom). */
  readonly bgLayer: Container;

  /** Wall/terrain tiles from Collisions IntGrid autoLayerTiles (100% opacity). */
  readonly wallLayer: Container;

  /**
   * Hazard/signal tiles (water/spike/updraft/magma/charged) separated from
   * wallLayer so callers can skip PaletteSwapFilter on this layer and keep
   * the load-bearing original colors. Populated only when collisionGrid is
   * supplied to renderLevel/rebuildWallLayer.
   */
  readonly specialLayer: Container;

  /** Wall_shadows autoLayer tiles (rendered above walls, reduced opacity). */
  readonly shadowLayer: Container;

  /** Interior decoration tiles (no collision, rendered between walls and shadows). */
  readonly interiorLayer: Container;

  /**
   * BuilderInterior layer ??populated by renderBuilderInteriorLayer().
   * The host scene renders it as an occluder and fades the whole layer out
   * when the player overlaps BuilderInterior IntGrid cells.
   */
  readonly builderInteriorLayer: Container;

  /** BuilderOutside decoration layer, rendered above BuilderInterior and below special/shadow overlays. */
  readonly builderOutsideLayer: Container;

  /** Optional debug markers for entity positions. */
  private entityMarkers: Container;

  constructor() {
    this.container = new Container();

    this.bgLayer = new Container();
    this.wallLayer = new Container();
    this.specialLayer = new Container();
    this.interiorLayer = new Container();
    this.shadowLayer = new Container();
    this.builderInteriorLayer = new Container();
    this.builderOutsideLayer = new Container();
    this.entityMarkers = new Container();

    // Render order: bg -> interior -> walls/IntGrid -> BuilderOutside -> special -> shadows -> entity markers
    // NOTE: builderInteriorLayer is intentionally NOT added here. The host scene
    // attaches it above the entityLayer so the dissolved interior tiles render
    // *in front of* the player/enemies (revealing internal builder detail by
    // occluding entities, rather than entities occluding the interior).
    this.container.addChild(this.bgLayer);
    this.container.addChild(this.interiorLayer);
    this.container.addChild(this.wallLayer);
    this.container.addChild(this.builderOutsideLayer);
    this.container.addChild(this.specialLayer);
    this.container.addChild(this.shadowLayer);
    this.container.addChild(this.entityMarkers);
  }

  /**
   * Render a complete LDtk level.
   *
   * @param bgTiles       - Tiles from the Background autoLayer.
   * @param shadowTiles   - Tiles from the Wall_shadows autoLayer.
   * @param atlases        - Either a single atlas Texture (legacy ??applied to
   *                         every tile) or a map keyed by the tileset's
   *                         __tilesetRelPath. Per-tile tilesetPath (set by
   *                         LdtkLoader from __tilesetRelPath) picks the
   *                         matching atlas; tiles whose tileset isn't in the
   *                         map are silently skipped.
   * @param shadowOpacity  - Opacity for the shadow layer (default 0.53, from LDtk).
   * @param collisionGrid  - Optional IntGrid used to route hazard tiles
   *                         (water/spike/updraft/magma/charged) to specialLayer
   *                         instead of wallLayer so the caller can skip palette
   *                         swap on them. When absent, every wall tile goes to
   *                         wallLayer (legacy behavior).
   */
  renderLevel(
    bgTiles: LdtkTile[],
    wallTiles: LdtkTile[],
    shadowTiles: LdtkTile[],
    atlases: Texture | Record<string, Texture>,
    shadowOpacity: number = DEFAULT_SHADOW_OPACITY,
    collisionGrid?: number[][],
    interiorTiles: LdtkTile[] = [],
  ): void {
    this.clear();

    // Background tiles stay visible under fluid cells too ??they sit far
    // enough behind the fluid mesh that the translucent water/oil/etc.
    // simply tints them rather than erasing them. Only wall auto-tiles
    // are skipped (the auto-tile would clash with the fluid surface).
    for (const tile of bgTiles) {
      const sprite = this.buildSprite(tile, atlases);
      if (sprite) this.bgLayer.addChild(sprite);
    }

    // Wall/terrain tiles at full opacity. Hazards routed to specialLayer.
    // Oil/Acid cells are skipped entirely ??FluidSystem draws them as fluid
    // bodies, so the underlying auto-tile sprite would just be hidden noise.
    for (const tile of wallTiles) {
      if (this.isFluidHiddenTile(tile, collisionGrid)) continue;
      const sprite = this.buildSprite(tile, atlases);
      if (!sprite) continue;
      if (this.isSpecialTile(tile, collisionGrid)) {
        this.specialLayer.addChild(sprite);
      } else {
        this.wallLayer.addChild(sprite);
      }
    }

    // Interior decoration (no collision, between walls and shadows).
    // Interior sprites stay visible under fluid cells ??the FluidSystem
    // polygon overlay sits on top with translucent alpha, so the interior
    // detail (vines, drips, wiring) reads through. Skipping these here was
    // the bug that made water-filled rooms look like empty black boxes.
    for (const tile of interiorTiles) {
      const sprite = this.buildSprite(tile, atlases);
      if (sprite) this.interiorLayer.addChild(sprite);
    }

    // Shadow overlay at reduced opacity
    this.shadowLayer.alpha = shadowOpacity;
    for (const tile of shadowTiles) {
      const sprite = this.buildSprite(tile, atlases);
      if (sprite) this.shadowLayer.addChild(sprite);
    }
  }

  /**
   * Render debug markers at entity positions.
   * Call after renderLevel() if you want entity overlays visible.
   *
   * @param entities - Entity list from the LDtk level.
   */
  renderEntityMarkers(entities: LdtkEntity[]): void {
    this.destroyLayerChildren(this.entityMarkers);

    for (const entity of entities) {
      const color = ENTITY_COLORS[entity.type] ?? ENTITY_COLOR_FALLBACK;
      const half = ENTITY_MARKER_SIZE / 2;

      const marker = new Graphics();
      marker.rect(-half, -half, ENTITY_MARKER_SIZE, ENTITY_MARKER_SIZE).fill(color);
      marker.x = entity.px[0] + TILE_SIZE / 2;
      marker.y = entity.px[1] + TILE_SIZE / 2;
      this.entityMarkers.addChild(marker);
    }
  }

  /**
   * Populate the BuilderInterior layer with tiles from the LDtk BuilderInterior
   * IntGrid. Call this once after renderLevel(). The layer starts at alpha=0;
   * the scene controls visibility via dissolve.
   */
  renderBuilderInteriorLayer(
    tiles: LdtkTile[],
    atlases: Texture | Record<string, Texture>,
  ): void {
    this.destroyLayerChildren(this.builderInteriorLayer);
    for (const tile of tiles) {
      const sprite = this.buildSprite(tile, atlases);
      if (sprite) this.builderInteriorLayer.addChild(sprite);
    }
  }

  /** Populate the BuilderOutside layer from the LDtk BuilderOutside tile layer. */
  renderBuilderOutsideLayer(
    tiles: LdtkTile[],
    atlases: Texture | Record<string, Texture>,
  ): void {
    this.destroyLayerChildren(this.builderOutsideLayer);
    for (const tile of tiles) {
      const sprite = this.buildSprite(tile, atlases);
      if (sprite) this.builderOutsideLayer.addChild(sprite);
    }
  }

  /** Rebuild only the wall + special layers (leaves background and shadows untouched). */
  rebuildWallLayer(
    wallTiles: LdtkTile[],
    atlases: Texture | Record<string, Texture>,
    collisionGrid?: number[][],
  ): void {
    this.destroyLayerChildren(this.wallLayer);
    this.destroyLayerChildren(this.specialLayer);
    for (const tile of wallTiles) {
      if (this.isFluidHiddenTile(tile, collisionGrid)) continue;
      const sprite = this.buildSprite(tile, atlases);
      if (!sprite) continue;
      if (this.isSpecialTile(tile, collisionGrid)) {
        this.specialLayer.addChild(sprite);
      } else {
        this.wallLayer.addChild(sprite);
      }
    }
  }

  /**
   * Remove wall/shadow tiles that overlap a pixel-space AABB.
   * Used by SecretWall to erase the AutoTile visuals when broken.
   */
  clearTilesInRect(
    x: number,
    y: number,
    w: number,
    h: number,
    opts: { preserveInterior?: boolean } = {},
  ): void {
    // Tile children are anchored at top-left, so a child whose top-left lies
    // within [x, x+w) 횞 [y, y+h) is inside the rect. No margin: extending the
    // bounds upward/leftward would erase neighbouring cells (e.g. the cell
    // above a SecretWall when it's broken).
    const remove = (layer: Container) => {
      for (let i = layer.children.length - 1; i >= 0; i--) {
        const child = layer.children[i];
        if (
          child.x >= x && child.x < x + w &&
          child.y >= y && child.y < y + h
        ) {
          const child = layer.removeChildAt(i);
          child.destroy({ children: true, texture: false, textureSource: false, context: true });
        }
      }
    };
    remove(this.bgLayer);
    remove(this.wallLayer);
    remove(this.specialLayer);
    if (!opts.preserveInterior) remove(this.interiorLayer);
    remove(this.shadowLayer);
    if (!opts.preserveInterior) remove(this.builderInteriorLayer);
    remove(this.builderOutsideLayer);
  }

  /** Remove all rendered tiles and markers. */
  clear(): void {
    this.destroyLayerChildren(this.bgLayer);
    this.destroyLayerChildren(this.wallLayer);
    this.destroyLayerChildren(this.specialLayer);
    this.destroyLayerChildren(this.interiorLayer);
    this.destroyLayerChildren(this.shadowLayer);
    this.destroyLayerChildren(this.builderInteriorLayer);
    this.destroyLayerChildren(this.builderOutsideLayer);
    this.destroyLayerChildren(this.entityMarkers);
  }

  destroy(): void {
    this.clear();
    if (this.container.parent) this.container.parent.removeChild(this.container);
    this.container.destroy({ children: true, context: true });
  }

  private destroyLayerChildren(layer: Container): void {
    const children = layer.removeChildren();
    for (const child of children) {
      child.destroy({ children: true, texture: false, textureSource: false, context: true });
    }
  }

  private static getTextureSourceId(source: object): number {
    let id = LdtkRenderer.textureSourceIds.get(source);
    if (!id) {
      id = LdtkRenderer.nextTextureSourceId++;
      LdtkRenderer.textureSourceIds.set(source, id);
    }
    return id;
  }

  private static getTileTexture(atlas: Texture, tile: LdtkTile): Texture {
    const sourceId = LdtkRenderer.getTextureSourceId(atlas.source as object);
    const key = `${sourceId}:${tile.src[0]}:${tile.src[1]}:${TILE_SIZE}:${TILE_SIZE}`;
    let texture = LdtkRenderer.tileTextureCache.get(key);
    if (!texture) {
      const frame = new Rectangle(tile.src[0], tile.src[1], TILE_SIZE, TILE_SIZE);
      texture = new Texture({ source: atlas.source, frame });
      LdtkRenderer.tileTextureCache.set(key, texture);
    }
    return texture;
  }

  /**
   * Decide if a tile should live on specialLayer instead of wallLayer.
   *
   * ??媛吏 議곌굔 以??섎굹?쇰룄 true 硫?specialLayer 濡?
   *   1) tile.src 媛 ?꾪??쇱뒪 而щ윭 ?곸뿭(?ㅻⅨ履??섎떒) ?덉뿉 ?덉쓣 ?????먯깋 蹂댁〈
   *   2) IntGrid 媛믪씠 ?뱀닔 ?댁???water/spike/updraft/magma/charged)????   *
   * (1)? IntGrid ?뺣낫媛 ?놁뼱???숈옉?섎?濡? ?댁??쒓? ?꾨땶 ?μ떇??而щ윭 ??쇰룄
   * ?붾젅???ㅼ솑??臾쇰뱾吏 ?딅뒗??
   */
  /**
   * Cells whose IntGrid value is WATER / OIL / ACID / MAGMA are drawn by
   * FluidSystem as dynamic fluid bodies (polygon + animated surface). The
   * LDtk auto-tile sprite underneath would just be hidden noise, so we
   * suppress it.
   *
   * UPDRAFT is drawn by UpdraftSystem (sandbox 짠13 demo K: tile suppression +
   * dynamic K layers) and follows the same pattern ??suppress the static
   * sprite so the system has full control of the channel visual.
   *
   * WATER is included here primarily to clean up obsolete tiles after a
   * runtime mutation (ice ??water on fire). LDtk auto-rules typically don't
   * paint water tiles, so this rarely fires on static data.
   */
  private isFluidHiddenTile(tile: LdtkTile, collisionGrid?: number[][]): boolean {
    if (!collisionGrid) return false;
    const col = Math.floor(tile.px[0] / TILE_SIZE);
    const row = Math.floor(tile.px[1] / TILE_SIZE);
    const rowData = collisionGrid[row];
    if (!rowData) return false;
    const v = rowData[col] ?? 0;
    // Fluid values (water/oil/acid/magma) ??surface drawn by FluidSystem polygon.
    // Updraft ??drawn by UpdraftSystem (K-style channel takeover, 2026-05-20).
    // Generic fluid markers (FluidGeneric_A/B/C = 17/18/19) ??used by ItemWorld
    // room templates; resolved to concrete fluid values at dive entry but the
    // LDtk wallTiles still reference the generic-cell auto-rule sprites, so we
    // suppress them here regardless of whether resolution ran.
    return (
      v === TILE_WATER || v === TILE_OIL || v === TILE_ACID || v === TILE_MAGMA ||
      v === TILE_CYRO ||
      v === TILE_UPDRAFT ||
      // Fluid generic markers (17/18/19) ??FluidSystem ??dynamic ?쇰줈 洹몃━誘濡?hidden.
      v === 17 || v === 18 || v === 19
      // Solid generic markers (20/21) ??*hidden ?섏? ?딅뒗?? ??LDtk ??auto-tile
      // rule ??媛??붾━????낆뿉 留욌뒗 sprite 瑜??섏씤?명븯?꾨줉 ?꾩엫 (2026-05-18).
    );
  }

  private isSpecialTile(tile: LdtkTile, collisionGrid?: number[][]): boolean {
    if (tile.src[0] >= COLOR_TILE_MIN_SRC_X && tile.src[1] >= COLOR_TILE_MIN_SRC_Y) {
      return true;
    }
    if (!collisionGrid) return false;
    const col = Math.floor(tile.px[0] / TILE_SIZE);
    const row = Math.floor(tile.px[1] / TILE_SIZE);
    const rowData = collisionGrid[row];
    if (!rowData) return false;
    return isSpecialVisualTile(rowData[col] ?? 0);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Build a Sprite for one LDtk tile entry.
   *
   * Flip is encoded in the `f` bitmask:
   *   bit 0 (f & 1) ??horizontal flip: scale.x = -1, anchor.x = 1
   *   bit 1 (f & 2) ??vertical flip:   scale.y = -1, anchor.y = 1
   *
   * Returns null when `atlases` is a map and the tile's tileset is absent ??   * caller should skip the tile (e.g. scene didn't load that atlas yet).
   */
  private buildSprite(
    tile: LdtkTile,
    atlases: Texture | Record<string, Texture>,
  ): Sprite | null {
    // Resolve the correct atlas for this tile's tileset.
    let atlas: Texture | undefined;
    if (atlases instanceof Texture) {
      atlas = atlases;
    } else if (tile.tilesetPath && atlases[tile.tilesetPath]) {
      atlas = atlases[tile.tilesetPath];
    } else {
      // Fallback: first atlas in the map so tiles without tilesetPath
      // metadata (legacy) still render if the scene supplied at least one.
      const firstKey = Object.keys(atlases)[0];
      atlas = firstKey ? atlases[firstKey] : undefined;
      if (!atlas) return null;
      if (tile.tilesetPath && !atlases[tile.tilesetPath]) {
        // Tileset was referenced but not loaded ??skip rather than miscolor.
        return null;
      }
    }

    // Reuse the atlas GPU source and the frame texture wrapper. ItemWorld
    // builds thousands of tile sprites across many room renderers; creating
    // one Texture wrapper per tile was a large avoidable JS memory cost.
    const texture = LdtkRenderer.getTileTexture(atlas, tile);

    const sprite = new Sprite(texture);
    sprite.x = tile.px[0];
    sprite.y = tile.px[1];
    sprite.alpha = tile.a;

    // Apply flip bits
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
}
