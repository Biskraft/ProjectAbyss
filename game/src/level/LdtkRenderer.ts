/**
 * LdtkRenderer — renders parsed LDtk level data using PixiJS v8 sprites.
 */

import { Container, Sprite, Texture, Rectangle, Graphics } from 'pixi.js';
import { TILE_SIZE, type LdtkTile, type LdtkEntity } from './LdtkLoader';
import { isSpecialVisualTile } from '@core/Physics';

const DEFAULT_SHADOW_OPACITY = 0.53;

/**
 * Atlas 원색 보존 영역 (src 좌표, px 기준).
 *
 * 아틀라스 오른쪽 하단 구역에 배치된 해저드/신호 타일들(물/가시/바람/불 등)은
 * 색상 자체가 플레이어 커뮤니케이션 역할을 하므로 biome PaletteSwapFilter 에
 * 물들지 않도록 `specialLayer` 로 우회시킨다.
 *
 * IntGrid 값이 특수(2/4/5/6/8)가 아니더라도, tile.src 가 이 사각형 안에 들면
 * 무조건 specialLayer 로 간주. 아틀라스마다 색상 영역이 달라지면 이 상수만
 * 조정하면 된다.
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
  /** Root container — add this to your scene. */
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

  /** Optional debug markers for entity positions. */
  private entityMarkers: Container;

  constructor() {
    this.container = new Container();

    this.bgLayer = new Container();
    this.wallLayer = new Container();
    this.specialLayer = new Container();
    this.interiorLayer = new Container();
    this.shadowLayer = new Container();
    this.entityMarkers = new Container();

    // Render order: bg → interior → walls → special (hazards) → shadows → entity markers
    this.container.addChild(this.bgLayer);
    this.container.addChild(this.interiorLayer);
    this.container.addChild(this.wallLayer);
    this.container.addChild(this.specialLayer);
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

    for (const tile of bgTiles) {
      const sprite = this.buildSprite(tile, atlases);
      if (sprite) this.bgLayer.addChild(sprite);
    }

    // Wall/terrain tiles at full opacity. Hazards routed to specialLayer.
    for (const tile of wallTiles) {
      const sprite = this.buildSprite(tile, atlases);
      if (!sprite) continue;
      if (this.isSpecialTile(tile, collisionGrid)) {
        this.specialLayer.addChild(sprite);
      } else {
        this.wallLayer.addChild(sprite);
      }
    }

    // Interior decoration (no collision, between walls and shadows)
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

  /** Rebuild only the wall + special layers (leaves background and shadows untouched). */
  rebuildWallLayer(
    wallTiles: LdtkTile[],
    atlases: Texture | Record<string, Texture>,
    collisionGrid?: number[][],
  ): void {
    this.wallLayer.removeChildren();
    this.specialLayer.removeChildren();
    for (const tile of wallTiles) {
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
  clearTilesInRect(x: number, y: number, w: number, h: number): void {
    const remove = (layer: Container) => {
      for (let i = layer.children.length - 1; i >= 0; i--) {
        const child = layer.children[i];
        if (
          child.x >= x - TILE_SIZE && child.x < x + w &&
          child.y >= y - TILE_SIZE && child.y < y + h
        ) {
          layer.removeChildAt(i);
        }
      }
    };
    remove(this.wallLayer);
    remove(this.shadowLayer);
  }

  /** Remove all rendered tiles and markers. */
  clear(): void {
    this.bgLayer.removeChildren();
    this.wallLayer.removeChildren();
    this.specialLayer.removeChildren();
    this.interiorLayer.removeChildren();
    this.shadowLayer.removeChildren();
    this.entityMarkers.removeChildren();
  }

  /**
   * Decide if a tile should live on specialLayer instead of wallLayer.
   *
   * 두 가지 조건 중 하나라도 true 면 specialLayer 로:
   *   1) tile.src 가 아틀라스 컬러 영역(오른쪽 하단) 안에 있을 때 — 원색 보존
   *   2) IntGrid 값이 특수 해저드(water/spike/updraft/magma/charged)일 때
   *
   * (1)은 IntGrid 정보가 없어도 동작하므로, 해저드가 아닌 장식용 컬러 타일도
   * 팔레트 스왑에 물들지 않는다.
   */
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
