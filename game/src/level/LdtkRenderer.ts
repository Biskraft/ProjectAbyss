/**
 * LdtkRenderer — renders parsed LDtk level data using PixiJS v8 sprites.
 */

import { Container, Sprite, Texture, Rectangle, Graphics } from 'pixi.js';
import { TILE_SIZE, type LdtkTile, type LdtkEntity } from './LdtkLoader';

const DEFAULT_SHADOW_OPACITY = 0.53;

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
  /** Root container — add this to your scene. */
  readonly container: Container;

  /** Background autoLayer tiles (rendered first / bottom). */
  readonly bgLayer: Container;

  /** Wall/terrain tiles from Collisions IntGrid autoLayerTiles (100% opacity). */
  readonly wallLayer: Container;

  /** Wall_shadows autoLayer tiles (rendered above walls, reduced opacity). */
  readonly shadowLayer: Container;

  /** Optional debug markers for entity positions. */
  private entityMarkers: Container;

  constructor() {
    this.container = new Container();

    this.bgLayer = new Container();
    this.wallLayer = new Container();
    this.shadowLayer = new Container();
    this.entityMarkers = new Container();

    // Render order: bg → walls → shadows → entity markers
    this.container.addChild(this.bgLayer);
    this.container.addChild(this.wallLayer);
    this.container.addChild(this.shadowLayer);
    this.container.addChild(this.entityMarkers);
  }

  /**
   * Render a complete LDtk level.
   *
   * @param bgTiles       - Tiles from the Background autoLayer.
   * @param shadowTiles   - Tiles from the Wall_shadows autoLayer.
   * @param atlases        - Either a single atlas Texture (legacy — applied to
   *                         every tile) or a map keyed by the tileset's
   *                         __tilesetRelPath. Per-tile tilesetPath (set by
   *                         LdtkLoader from __tilesetRelPath) picks the
   *                         matching atlas; tiles whose tileset isn't in the
   *                         map are silently skipped.
   * @param shadowOpacity  - Opacity for the shadow layer (default 0.53, from LDtk).
   */
  renderLevel(
    bgTiles: LdtkTile[],
    wallTiles: LdtkTile[],
    shadowTiles: LdtkTile[],
    atlases: Texture | Record<string, Texture>,
    shadowOpacity: number = DEFAULT_SHADOW_OPACITY,
  ): void {
    this.clear();

    for (const tile of bgTiles) {
      const sprite = this.buildSprite(tile, atlases);
      if (sprite) this.bgLayer.addChild(sprite);
    }

    // Wall/terrain tiles at full opacity
    for (const tile of wallTiles) {
      const sprite = this.buildSprite(tile, atlases);
      if (sprite) this.wallLayer.addChild(sprite);
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
    this.entityMarkers.removeChildren();

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

  /** Rebuild only the wall layer (leaves background and shadows untouched). */
  rebuildWallLayer(wallTiles: LdtkTile[], atlases: Texture | Record<string, Texture>): void {
    this.wallLayer.removeChildren();
    for (const tile of wallTiles) {
      const sprite = this.buildSprite(tile, atlases);
      if (sprite) this.wallLayer.addChild(sprite);
    }
  }

  /** Remove all rendered tiles and markers. */
  clear(): void {
    this.bgLayer.removeChildren();
    this.wallLayer.removeChildren();
    this.shadowLayer.removeChildren();
    this.entityMarkers.removeChildren();
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Build a Sprite for one LDtk tile entry.
   *
   * Flip is encoded in the `f` bitmask:
   *   bit 0 (f & 1) → horizontal flip: scale.x = -1, anchor.x = 1
   *   bit 1 (f & 2) → vertical flip:   scale.y = -1, anchor.y = 1
   *
   * Returns null when `atlases` is a map and the tile's tileset is absent —
   * caller should skip the tile (e.g. scene didn't load that atlas yet).
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
        // Tileset was referenced but not loaded — skip rather than miscolor.
        return null;
      }
    }

    const frame = new Rectangle(tile.src[0], tile.src[1], TILE_SIZE, TILE_SIZE);
    // Reuse the atlas GPU source; only the frame rect differs per tile.
    const texture = new Texture({ source: atlas.source, frame });

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
