/**
 * LdtkRenderer — renders parsed LDtk level data using PixiJS v8 sprites.
 *
 * Implements: LDtk auto-layer tile rendering for the World space (3-Space model).
 * When LdtkLoader.ts is created, import LdtkTile from there and remove the
 * local definition below.
 */

import { Container, Sprite, Texture, Rectangle, Graphics } from 'pixi.js';

const TILE_SIZE = 16;

/** Tile entry from an LDtk autoLayerTiles or gridTiles array. */
export interface LdtkTile {
  /** Destination position in level space (pixels): [x, y] */
  px: [number, number];
  /** Source position in the tileset atlas (pixels): [x, y] */
  src: [number, number];
  /** Flip flags: 0 = none, 1 = flipX, 2 = flipY, 3 = both */
  f: number;
  /** Alpha (0–1) */
  a: number;
}

/** Entity data extracted from an LDtk level for optional debug rendering. */
export interface LdtkEntity {
  /** Entity identifier (e.g. "Player", "Item", "Exit", "Teleport") */
  id: string;
  /** Position in level space (pixels) */
  px: [number, number];
}

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
  private bgLayer: Container;

  /** Wall_shadows autoLayer tiles (rendered above bg). */
  private shadowLayer: Container;

  /** Optional debug markers for entity positions. */
  private entityMarkers: Container;

  constructor() {
    this.container = new Container();

    this.bgLayer = new Container();
    this.shadowLayer = new Container();
    this.entityMarkers = new Container();

    // Render order: bg → shadows → entity markers (debug only)
    this.container.addChild(this.bgLayer);
    this.container.addChild(this.shadowLayer);
    this.container.addChild(this.entityMarkers);
  }

  /**
   * Render a complete LDtk level.
   *
   * @param bgTiles       - Tiles from the Background autoLayer.
   * @param shadowTiles   - Tiles from the Wall_shadows autoLayer.
   * @param atlas          - The full tileset atlas texture (e.g. SunnyLand).
   * @param shadowOpacity  - Opacity for the shadow layer (default 0.53, from LDtk).
   */
  renderLevel(
    bgTiles: LdtkTile[],
    shadowTiles: LdtkTile[],
    atlas: Texture,
    shadowOpacity: number = DEFAULT_SHADOW_OPACITY,
  ): void {
    this.clear();

    for (const tile of bgTiles) {
      this.bgLayer.addChild(this.buildSprite(tile, atlas));
    }

    this.shadowLayer.alpha = shadowOpacity;
    for (const tile of shadowTiles) {
      this.shadowLayer.addChild(this.buildSprite(tile, atlas));
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
      const color = ENTITY_COLORS[entity.id] ?? ENTITY_COLOR_FALLBACK;
      const half = ENTITY_MARKER_SIZE / 2;

      const marker = new Graphics();
      marker.rect(-half, -half, ENTITY_MARKER_SIZE, ENTITY_MARKER_SIZE).fill(color);
      marker.x = entity.px[0] + TILE_SIZE / 2;
      marker.y = entity.px[1] + TILE_SIZE / 2;
      this.entityMarkers.addChild(marker);
    }
  }

  /** Remove all rendered tiles and markers. */
  clear(): void {
    this.bgLayer.removeChildren();
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
   */
  private buildSprite(tile: LdtkTile, atlas: Texture): Sprite {
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
