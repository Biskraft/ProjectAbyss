/**
 * LdtkLoader.ts
 *
 * Parses a LDtk JSON project file into typed data structures for use with
 * the ECHORIS world (3-Space model — World space hand-crafted levels).
 *
 * Implements: System_World_ProcGen (hand-crafted room loading path)
 *
 * Expected .ldtk layer order per level:
 *   [0] Entities     (type "Entities")  → entityInstances[]
 *   [1] Wall_shadows (type "AutoLayer") → autoLayerTiles[]
 *   [2] Collisions   (type "IntGrid")   → intGridCsv[], autoLayerTiles[]
 *   [3] Background   (type "AutoLayer") → autoLayerTiles[]
 *
 * Collision grid values (IntGrid):
 *   0 = empty / passable
 *   1 = solid wall
 *   2 = water
 *   3 = one-way platform
 *   4 = updraft (strong upward wind)
 *
 * No external dependencies beyond the TypeScript standard library.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Tile size in pixels — matches TILE_SIZE used across the codebase. */
export const TILE_SIZE = 16;

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

/** Root LDtk project file shape (only the fields we care about). */
export interface LdtkProject {
  /** LDtk format version string, e.g. "1.5.3". */
  ldtkVersion: string;
  /** All levels defined in the world. */
  levels: LdtkLevel[];
}

/**
 * A single room/level extracted from LDtk.
 * Pixel coordinates are relative to the world origin (worldX / worldY).
 * All tile positions inside a level are relative to the level's top-left corner.
 */
export interface LdtkLevel {
  /** LDtk identifier string, e.g. "Entrance", "Cross_roads". */
  identifier: string;
  /** World-space X position of the level's top-left corner, in pixels. */
  worldX: number;
  /** World-space Y position of the level's top-left corner, in pixels. */
  worldY: number;
  /** Level width in pixels. */
  pxWid: number;
  /** Level height in pixels. */
  pxHei: number;
  /** Level width in tiles (pxWid / TILE_SIZE). */
  gridW: number;
  /** Level height in tiles (pxHei / TILE_SIZE). */
  gridH: number;
  /**
   * Value of the "roomType" custom field, or null if not set.
   * Corresponds to the RoomType enum defined in the LDtk project.
   */
  roomType: string | null;
  /**
   * 2D collision grid derived from the Collisions IntGrid layer.
   * Access: collisionGrid[y][x]
   * Values: 0 = empty, 1 = solid, 2 = water
   */
  collisionGrid: number[][];
  /** Visual tiles from the Background AutoLayer. */
  backgroundTiles: LdtkTile[];
  /** Wall/terrain tiles from Collisions IntGrid autoLayerTiles (full opacity). */
  wallTiles: LdtkTile[];
  /** Visual tiles from the Wall_shadows AutoLayer (reduced opacity overlay). */
  shadowTiles: LdtkTile[];
  /** Entities placed in the Entities layer. */
  entities: LdtkEntity[];
  /**
   * Identifiers of adjacent levels that share an edge with this level.
   * Populated after all levels are parsed via computeNeighbors().
   */
  neighbors: string[];
  /**
   * Directional neighbor map from LDtk's __neighbours data.
   * Keys: 'n', 's', 'e', 'w' (cardinal), '>', '<' (depth).
   * Values: level identifiers.
   */
  dirNeighbors: Record<string, string[]>;
  /**
   * Auto-detected door anchor rows/cols for runtime door carving.
   * See ItemWorldScene door-mask logic. Values are local tile coords.
   */
  doorAnchors: {
    /** Row on col 0 where air meets floor (player walk-through row). */
    leftFloorRow: number;
    /** Row on col (gridW-1) where air meets floor. */
    rightFloorRow: number;
    /** Middle column for vertical doors (up/down). */
    midCol: number;
  };
}

/**
 * A single visual tile from an AutoLayer.
 * Pixel positions are relative to the containing level's top-left corner.
 */
export interface LdtkTile {
  /** Destination position [x, y] in pixels, relative to level origin. */
  px: [number, number];
  /** Source position [x, y] in pixels within the tileset atlas. */
  src: [number, number];
  /**
   * Flip bits:
   *   0 = no flip
   *   1 = flip X (horizontal mirror)
   *   2 = flip Y (vertical mirror)
   *   3 = flip both axes
   */
  f: number;
  /** Alpha value (0.0 – 1.0). */
  a: number;
}

/** An entity instance placed in the Entities layer. */
export interface LdtkEntity {
  /** Entity type identifier, e.g. "Item", "SpawnPoint", "Door". */
  type: string;
  /** Instance unique ID (UUID). Used for entity references. */
  iid: string;
  /** Pixel position [x, y] of the entity's pivot, relative to level origin. */
  px: [number, number];
  /** Grid cell position [gx, gy] of the entity. */
  grid: [number, number];
  /** Entity width in pixels (from LDtk entity definition). */
  width: number;
  /** Entity height in pixels (from LDtk entity definition). */
  height: number;
  /**
   * Custom field values, keyed by their __identifier.
   * e.g. { type: "Gold", price: 0, count: 100 }
   */
  fields: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Internal raw LDtk JSON shapes (not exported — implementation detail)
// ---------------------------------------------------------------------------

interface RawLdtkLayer {
  __identifier: string;
  __type: string;
  __cWid: number;
  __cHei: number;
  intGridCsv: number[];
  autoLayerTiles: RawLdtkAutoTile[];
  entityInstances: RawLdtkEntityInstance[];
}

interface RawLdtkAutoTile {
  px: [number, number];
  src: [number, number];
  f: number;
  t: number;
  a: number;
  // d: [layerDefUid, coordId] — present in file but not used by loader
}

interface RawLdtkEntityInstance {
  __identifier: string;
  __grid: [number, number];
  iid: string;
  px: [number, number];
  width: number;
  height: number;
  fieldInstances: RawLdtkFieldInstance[];
}

interface RawLdtkFieldInstance {
  __identifier: string;
  __value: unknown;
}

interface RawLdtkLevel {
  identifier: string;
  iid: string;
  worldX: number;
  worldY: number;
  pxWid: number;
  pxHei: number;
  fieldInstances: RawLdtkFieldInstance[];
  layerInstances: RawLdtkLayer[] | null;
  __neighbours?: Array<{ levelIid: string; dir: string }>;
}

interface RawLdtkWorld {
  iid: string;
  identifier: string;
  defaultLevelWidth?: number;
  defaultLevelHeight?: number;
  worldGridWidth?: number;
  worldGridHeight?: number;
  worldLayout?: string;
  levels: RawLdtkLevel[];
}

// ---------------------------------------------------------------------------
// LdtkLoader
// ---------------------------------------------------------------------------

/**
 * Loads and parses a LDtk JSON project into typed LdtkLevel structures.
 *
 * Usage:
 *   const loader = new LdtkLoader();
 *   const json = await fetch('/assets/World_ProjectAbyss_Layout.ldtk').then(r => r.json());
 *   loader.load(json);
 *   const entrance = loader.getLevel('Entrance');
 */
export class LdtkLoader {
  private project!: LdtkProject;
  private levels: Map<string, LdtkLevel> = new Map();

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Parse a raw LDtk JSON object (already fetched/imported) into LdtkLevel
   * structures. Call this once; results are cached in the internal map.
   *
   * Supports both single-world (legacy) and multi-world LDtk projects.
   * For multi-world projects, pass `worldId` (or an array of worldIds to merge
   * levels from multiple worlds into a single loader). If omitted, the first
   * world is used.
   *
   * @param json - The parsed JSON object from a .ldtk file.
   * @param worldId - Optional world identifier, or array of identifiers.
   */
  load(json: Record<string, unknown>, worldId?: string | string[]): void {
    this.levels.clear();

    let rawLevels: RawLdtkLevel[];

    const worlds = json['worlds'] as RawLdtkWorld[] | undefined;
    if (Array.isArray(worlds) && worlds.length > 0) {
      // Multi-world project: pick matching world(s) or the first one.
      if (Array.isArray(worldId)) {
        // Merge levels from multiple worlds
        const merged: RawLdtkLevel[] = [];
        for (const wid of worldId) {
          const w = worlds.find((x) => x.identifier === wid);
          if (!w) {
            const available = worlds.map((x) => x.identifier).join(', ');
            throw new Error(
              `[LdtkLoader] World "${wid}" not found. Available: [${available}]`,
            );
          }
          merged.push(...w.levels);
        }
        rawLevels = merged;
      } else {
        let world: RawLdtkWorld | undefined;
        if (worldId) {
          world = worlds.find((w) => w.identifier === worldId);
          if (!world) {
            const available = worlds.map((w) => w.identifier).join(', ');
            throw new Error(
              `[LdtkLoader] World "${worldId}" not found. Available: [${available}]`,
            );
          }
        } else {
          world = worlds[0];
        }
        rawLevels = world.levels;
      }
    } else {
      // Single-world (legacy) project: root-level `levels`.
      rawLevels = json['levels'] as RawLdtkLevel[];
    }

    if (!Array.isArray(rawLevels)) {
      throw new Error('[LdtkLoader] JSON is missing "levels" array. Is this a valid .ldtk file?');
    }

    // Build iid → identifier map for resolving __neighbours references.
    const iidToId = new Map<string, string>();
    for (const raw of rawLevels) {
      iidToId.set(raw.iid as string, raw.identifier as string);
    }

    // Parse every level into typed structures.
    for (const raw of rawLevels) {
      const level = this.parseLevel(raw);
      this.levels.set(level.identifier, level);
    }

    // Use LDtk's __neighbours data for accurate directional neighbor info.
    for (const raw of rawLevels) {
      const level = this.levels.get(raw.identifier as string);
      if (!level) continue;
      const rawNeighbours = raw.__neighbours;
      if (rawNeighbours) {
        for (const nb of rawNeighbours) {
          const nbId = iidToId.get(nb.levelIid);
          if (!nbId) continue;
          // Add to flat neighbors list
          if (!level.neighbors.includes(nbId)) level.neighbors.push(nbId);
          // Add to directional map
          if (!level.dirNeighbors[nb.dir]) level.dirNeighbors[nb.dir] = [];
          if (!level.dirNeighbors[nb.dir].includes(nbId)) level.dirNeighbors[nb.dir].push(nbId);
        }
      }
    }

    // Also run geometric neighbor detection as fallback.
    this.computeNeighbors();

    // Validate passages: warn if a neighbor direction has no open edge tiles
    this.validatePassages();

    this.project = {
      ldtkVersion: (json['ldtkVersion'] as string) ?? 'unknown',
      levels: Array.from(this.levels.values()),
    };
  }

  /**
   * Retrieve a parsed level by its LDtk identifier (case-sensitive).
   * Returns undefined if the identifier is not found.
   */
  getLevel(identifier: string): LdtkLevel | undefined {
    return this.levels.get(identifier);
  }

  /**
   * Return all level identifiers in the order they were parsed from the file.
   */
  getLevelIds(): string[] {
    return Array.from(this.levels.keys());
  }

  /**
   * Return a lightweight world map array — useful for minimap rendering or
   * spatial queries. Each entry contains the level id and its world-space
   * bounding rectangle.
   */
  getWorldMap(): { id: string; x: number; y: number; w: number; h: number }[] {
    return Array.from(this.levels.values()).map((lvl) => ({
      id: lvl.identifier,
      x: lvl.worldX,
      y: lvl.worldY,
      w: lvl.pxWid,
      h: lvl.pxHei,
    }));
  }

  // ---------------------------------------------------------------------------
  // Private parsing helpers
  // ---------------------------------------------------------------------------

  /**
   * Parse a single raw level object from the LDtk JSON into an LdtkLevel.
   */
  private parseLevel(raw: RawLdtkLevel): LdtkLevel {
    const gridW = Math.round(raw.pxWid / TILE_SIZE);
    const gridH = Math.round(raw.pxHei / TILE_SIZE);

    // Extract the RoomType custom field (Array<LocalEnum.RoomType> — take first value).
    const rawRoomType = this.extractFieldValue(raw.fieldInstances, 'RoomType');
    const roomType = Array.isArray(rawRoomType) ? (rawRoomType[0] as string ?? null) : (rawRoomType as string | null);

    // Default empty structures — used when a layer is absent or has no data.
    let collisionGrid: number[][] = this.emptyGrid(gridW, gridH);
    let backgroundTiles: LdtkTile[] = [];
    let wallTiles: LdtkTile[] = [];
    let shadowTiles: LdtkTile[] = [];
    let entities: LdtkEntity[] = [];

    const layers = raw.layerInstances ?? [];

    for (const layer of layers) {
      switch (layer.__identifier) {
        case 'Collisions':
          // IntGrid layer — convert 1D csv to 2D grid.
          if (layer.intGridCsv.length > 0) {
            collisionGrid = this.parseIntGrid(layer.intGridCsv, layer.__cWid, layer.__cHei);
          }
          // IntGrid layers carry autoLayerTiles (auto-rule visuals) — these
          // are the primary wall/terrain tiles. Render at FULL opacity.
          if (layer.autoLayerTiles.length > 0) {
            wallTiles = this.parseAutoLayerTiles(layer.autoLayerTiles);
          }
          break;

        case 'Background':
          backgroundTiles = this.parseAutoLayerTiles(layer.autoLayerTiles);
          break;

        case 'Wall_shadows':
          // Overlay shadows at reduced opacity.
          shadowTiles = this.parseAutoLayerTiles(layer.autoLayerTiles);
          break;

        case 'Entities':
          // Entity placement layer.
          entities = this.parseEntities(layer.entityInstances);
          break;

        default:
          // Unknown layer — silently skip so future LDtk layers don't break loading.
          break;
      }
    }

    const doorAnchors = this.computeDoorAnchors(collisionGrid, gridW, gridH);

    return {
      identifier: raw.identifier,
      worldX: raw.worldX,
      worldY: raw.worldY,
      pxWid: raw.pxWid,
      pxHei: raw.pxHei,
      gridW,
      gridH,
      roomType,
      collisionGrid,
      backgroundTiles,
      wallTiles,
      shadowTiles,
      entities,
      neighbors: [], // populated later from __neighbours + computeNeighbors()
      dirNeighbors: {}, // populated later from __neighbours
      doorAnchors,
    };
  }

  /**
   * Scan the collision grid to find natural door anchor rows/cols.
   * For horizontal exits (left/right), we look for the highest row on each
   * vertical edge where an air tile sits directly above a solid tile (floor).
   * For vertical exits (up/down) we just pick the horizontal midpoint.
   *
   * This lets the door-carving logic in ItemWorldScene align with the
   * template's actual floor level instead of using a fixed magic row.
   */
  private computeDoorAnchors(grid: number[][], gridW: number, gridH: number): LdtkLevel['doorAnchors'] {
    const findFloorRow = (col: number): number => {
      if (col < 0 || col >= gridW) return Math.max(0, gridH - 4);
      for (let r = gridH - 2; r >= 0; r--) {
        const here = grid[r]?.[col] ?? 1;
        const below = grid[r + 1]?.[col] ?? 1;
        if (here === 0 && below >= 1) return r;
      }
      return Math.max(0, gridH - 4);
    };
    // Look at the first INSIDE column (col 1) not the outer wall (col 0),
    // since outer walls are often solid and won't yield a floor hit.
    const leftFloorRow = findFloorRow(Math.min(1, gridW - 1));
    const rightFloorRow = findFloorRow(Math.max(0, gridW - 2));
    const midCol = Math.floor(gridW / 2);
    return { leftFloorRow, rightFloorRow, midCol };
  }

  /**
   * Convert a flat 1D IntGrid CSV (row-major) into a 2D array.
   * Access pattern: grid[y][x]
   *
   * The CSV index formula: index = y * cWid + x
   * Values: 0 = empty, 1 = solid wall, 2 = water
   */
  private parseIntGrid(csv: number[], cWid: number, cHei: number): number[][] {
    const grid: number[][] = [];

    for (let y = 0; y < cHei; y++) {
      const row: number[] = [];
      for (let x = 0; x < cWid; x++) {
        const index = y * cWid + x;
        // Guard against malformed CSV arrays that are shorter than expected.
        row.push(index < csv.length ? csv[index] : 0);
      }
      grid.push(row);
    }

    return grid;
  }

  /**
   * Convert raw AutoLayer tile objects into typed LdtkTile structures.
   * Drops the LDtk-internal "t" (tileId) and "d" (destination indices) fields
   * since rendering only needs destination pixel coords, source coords, flip, and alpha.
   */
  private parseAutoLayerTiles(rawTiles: RawLdtkAutoTile[]): LdtkTile[] {
    return rawTiles.map((t) => ({
      px: [t.px[0], t.px[1]],
      src: [t.src[0], t.src[1]],
      f: t.f,
      a: t.a,
    }));
  }

  /**
   * Convert raw entity instance objects into typed LdtkEntity structures.
   * fieldInstances are flattened from [{ __identifier, __value }, ...] into
   * a plain Record<string, unknown> keyed by identifier.
   *
   * Example output:
   *   { type: "Gold", price: 0, count: 100 }
   */
  private parseEntities(instances: RawLdtkEntityInstance[]): LdtkEntity[] {
    return instances.map((inst) => ({
      type: inst.__identifier,
      iid: inst.iid ?? '',
      px: [inst.px[0], inst.px[1]],
      grid: [inst.__grid[0], inst.__grid[1]],
      width: inst.width,
      height: inst.height,
      fields: this.flattenFields(inst.fieldInstances),
    }));
  }

  /**
   * Flatten LDtk fieldInstances array into a plain key-value record.
   * __identifier becomes the key; __value becomes the value.
   */
  private flattenFields(fieldInstances: RawLdtkFieldInstance[]): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const field of fieldInstances) {
      result[field.__identifier] = field.__value;
    }
    return result;
  }

  /**
   * Extract a single named field value from a fieldInstances array.
   * Returns null if the field is not present.
   */
  private extractFieldValue(
    fieldInstances: RawLdtkFieldInstance[],
    key: string,
  ): unknown {
    const field = fieldInstances.find((f) => f.__identifier === key);
    return field?.__value ?? null;
  }

  /**
   * Build an all-zero 2D grid of the given dimensions.
   * Used as a fallback when a level has no Collisions layer.
   */
  private emptyGrid(width: number, height: number): number[][] {
    return Array.from({ length: height }, () => Array<number>(width).fill(0));
  }

  /**
   * Compute the neighbor list for every loaded level.
   *
   * Two levels are considered neighbors if their world-space bounding
   * rectangles share an edge (they touch without overlapping).
   *
   * The touching condition for axis A is:
   *   (aLeft == bRight) || (aRight == bLeft)   — X axis
   *   (aTop  == bBottom) || (aBottom == bTop)  — Y axis
   *
   * Along the perpendicular axis the rectangles must overlap (not just touch)
   * so that diagonal corners do not count as shared edges.
   */
  private computeNeighbors(): void {
    const all = Array.from(this.levels.values());

    for (const a of all) {
      for (const b of all) {
        if (a.identifier === b.identifier) continue;
        if (this.shareEdge(a, b)) {
          if (!a.neighbors.includes(b.identifier)) {
            a.neighbors.push(b.identifier);
          }
        }
      }
    }
  }

  /**
   * Return true if level `a` and level `b` share an axis-aligned edge.
   *
   * Sharing an edge means:
   *   - On one axis: the far boundary of one equals the near boundary of the other.
   *   - On the other axis: the intervals overlap (strictly, not just touch).
   */
  /**
   * Validate that every directional neighbor has at least one open tile (0)
   * on the matching edge. Logs warnings for blocked passages.
   */
  private validatePassages(): void {
    const dirToEdge: Record<string, 'right' | 'left' | 'top' | 'bottom'> = {
      e: 'right', w: 'left', n: 'top', s: 'bottom',
    };
    let ok = 0;
    let blocked = 0;

    for (const level of this.levels.values()) {
      for (const [dir, nIds] of Object.entries(level.dirNeighbors)) {
        const edge = dirToEdge[dir];
        if (!edge) continue; // skip diagonal/depth neighbors

        const hasOpen = this.hasOpenEdgeTile(level, edge);
        if (hasOpen) {
          ok++;
        } else {
          blocked++;
          const nbNames = nIds.join(', ');
          console.warn(`[LDtk] ⚠ ${level.identifier} → ${dir}(${edge}) → [${nbNames}]: edge is ALL WALLS — passage blocked`);
        }
      }
    }

    if (blocked > 0) {
      console.warn(`[LDtk] Passage check: ${ok} ok, ${blocked} blocked. Open walls in LDtk editor.`);
    } else {
      console.log(`[LDtk] ✓ All ${ok} passages verified open.`);
    }
  }

  /** Check if a level has at least one open tile (0) on the given edge. */
  private hasOpenEdgeTile(level: LdtkLevel, edge: 'right' | 'left' | 'top' | 'bottom'): boolean {
    const grid = level.collisionGrid;
    const h = grid.length;
    const w = grid[0]?.length ?? 0;

    switch (edge) {
      case 'right':
        for (let row = 0; row < h; row++) { if (grid[row][w - 1] === 0) return true; }
        return false;
      case 'left':
        for (let row = 0; row < h; row++) { if (grid[row][0] === 0) return true; }
        return false;
      case 'bottom':
        for (let col = 0; col < w; col++) { if (grid[h - 1][col] === 0) return true; }
        return false;
      case 'top':
        for (let col = 0; col < w; col++) { if (grid[0][col] === 0) return true; }
        return false;
    }
  }

  private shareEdge(a: LdtkLevel, b: LdtkLevel): boolean {
    const aRight  = a.worldX + a.pxWid;
    const aBottom = a.worldY + a.pxHei;
    const bRight  = b.worldX + b.pxWid;
    const bBottom = b.worldY + b.pxHei;

    // Check horizontal edge sharing (left/right sides touching).
    const touchesHorizontally =
      (aRight === b.worldX || a.worldX === bRight);

    // Check vertical edge sharing (top/bottom sides touching).
    const touchesVertically =
      (aBottom === b.worldY || a.worldY === bBottom);

    // When touching horizontally, the Y intervals must strictly overlap.
    if (touchesHorizontally) {
      const overlapY = a.worldY < bBottom && aBottom > b.worldY;
      return overlapY;
    }

    // When touching vertically, the X intervals must strictly overlap.
    if (touchesVertically) {
      const overlapX = a.worldX < bRight && aRight > b.worldX;
      return overlapX;
    }

    return false;
  }
}
