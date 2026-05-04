import { Container, Graphics } from 'pixi.js';
import type { UnifiedGridData, UnifiedRoomCell } from '@level/RoomGrid';
import type { ItemWorldProgress } from '@items/ItemInstance';
import type { LdtkLevel } from '@level/LdtkLoader';

// Shared constants for Item World room geometry
export const TILE_SIZE = 16;
export const IW_GRID_W = 4;
export const IW_GRID_H = 4;
export const IW_ROOM_W_TILES = 48;
export const IW_ROOM_H_TILES = 32;
export const IW_ROOM_W_PX = IW_ROOM_W_TILES * TILE_SIZE;
export const IW_ROOM_H_PX = IW_ROOM_H_TILES * TILE_SIZE;
export const IW_FULL_W_TILES = IW_GRID_W * IW_ROOM_W_TILES;
export const IW_FULL_H_TILES = IW_GRID_H * IW_ROOM_H_TILES;
// Door geometry constants — MUST match LDtk corridor templates' paint exactly.
// Audit (2026-05-04): all Item_corridor_* templates paint:
//   - L/R doors at cols 0-3 / 44-47 (4 cells deep), rows 14-17 (4 rows tall)
//   - U/D doors at cols 22-25 (4 cells wide), rows 0-3 / 28-31
//   - Solid floor begins at row 18 (FLOOR_ROW)
// Mismatch here produces collision holes at door seams (LDtk air not sealed,
// or solid wall mistakenly carved).
export const IW_DOOR_DEPTH = 4;
export const IW_DOOR_H_HEIGHT = 4;
export const IW_DOOR_V_WIDTH = 4;
export const IW_DOOR_FLOOR_ROW = 18;
/** Outer boundary wall thickness around the unified grid. Independent of
 *  IW_DOOR_DEPTH — this controls the world frame, not door geometry. */
export const IW_BOUNDARY_THICKNESS = 3;
export const SEAL_DEPTH = 2;

export interface DoorMask {
  carveRectsLocal: Array<{ c0: number; r0: number; cN: number; rN: number }>;
  sealRectsLocal: Array<{ c0: number; r0: number; cN: number; rN: number }>;
}

interface RestoreResult {
  roomsCleared: number;
}

export class ItemWorldMapController {
  // ---------------------------------------------------------------------------
  // Room state persistence (existing)
  // ---------------------------------------------------------------------------

  restoreRoomState(
    unifiedGrid: UnifiedGridData,
    progress: ItemWorldProgress,
    spawnedRooms: Set<string>,
  ): RestoreResult {
    const visited = new Set(progress.visitedRooms);
    const cleared = new Set(progress.clearedRooms);
    const bossPortals = progress.bossPortals ?? {};

    let roomsCleared = 0;
    for (let r = 0; r < unifiedGrid.totalHeight; r++) {
      for (let c = 0; c < unifiedGrid.totalWidth; c++) {
        const cell = unifiedGrid.cells[r][c];
        if (!cell) continue;
        const key = `${c},${r}`;
        cell.visited = visited.has(key);
        cell.cleared = cleared.has(key);
        const portal = bossPortals[String(cell.stratumIndex ?? 0)];
        if (portal) {
          cell.bossPortalX = portal.x;
          cell.bossPortalY = portal.y;
        }
        if (cell.cleared) roomsCleared++;
      }
    }

    spawnedRooms.clear();
    for (const key of progress.spawnedRooms ?? []) {
      spawnedRooms.add(key);
    }

    return { roomsCleared };
  }

  persistRoomState(
    unifiedGrid: UnifiedGridData,
    progress: ItemWorldProgress,
    spawnedRooms: Set<string>,
  ): void {
    const visited: string[] = [];
    const cleared: string[] = [];
    const bossPortals: Record<string, { x: number; y: number }> = {
      ...(progress.bossPortals ?? {}),
    };

    for (let r = 0; r < unifiedGrid.totalHeight; r++) {
      for (let c = 0; c < unifiedGrid.totalWidth; c++) {
        const cell = unifiedGrid.cells[r][c];
        if (!cell) continue;
        const key = `${c},${r}`;
        if (cell.visited) visited.push(key);
        if (cell.cleared) cleared.push(key);
        if (cell.bossPortalX != null && cell.bossPortalY != null) {
          bossPortals[String(cell.stratumIndex ?? 0)] = {
            x: cell.bossPortalX,
            y: cell.bossPortalY,
          };
        }
      }
    }

    progress.visitedRooms = visited;
    progress.clearedRooms = cleared;
    progress.spawnedRooms = Array.from(spawnedRooms);
    progress.bossPortals = bossPortals;
  }

  getCell(unifiedGrid: UnifiedGridData, col: number, row: number): UnifiedRoomCell | null {
    if (row < 0 || row >= unifiedGrid.totalHeight) return null;
    if (col < 0 || col >= unifiedGrid.totalWidth) return null;
    return unifiedGrid.cells[row][col];
  }

  getCurrentCell(unifiedGrid: UnifiedGridData, currentCol: number, currentRow: number): UnifiedRoomCell {
    const row = unifiedGrid.cells[currentRow];
    if (!row) return unifiedGrid.cells[0][0]!;
    return row[currentCol] ?? unifiedGrid.cells[0][0]!;
  }

  // ---------------------------------------------------------------------------
  // Full grid initialization
  // ---------------------------------------------------------------------------

  /** Create a solid (all 1) collision grid sized to the active stratum. */
  initFullGrid(widthRooms: number = IW_GRID_W, heightRooms: number = IW_GRID_H): number[][] {
    const grid: number[][] = [];
    const widthTiles = Math.max(1, widthRooms) * IW_ROOM_W_TILES;
    const heightTiles = Math.max(1, heightRooms) * IW_ROOM_H_TILES;
    for (let r = 0; r < heightTiles; r++) {
      grid[r] = new Array(widthTiles).fill(1);
    }
    return grid;
  }

  /** Count non-empty rooms in the unified grid. */
  countTotalRooms(unifiedGrid: UnifiedGridData): number {
    let total = 0;
    for (let r = 0; r < unifiedGrid.totalHeight; r++) {
      for (let c = 0; c < unifiedGrid.totalWidth; c++) {
        const cell = unifiedGrid.cells[r][c];
        if (cell && cell.type !== 0) total++;
      }
    }
    return total;
  }

  // ---------------------------------------------------------------------------
  // Door mask: compute which edges to carve / seal
  // ---------------------------------------------------------------------------

  computeDoorMask(cell: UnifiedRoomCell | null, _ldtkLevel: LdtkLevel): DoorMask {
    const carveRectsLocal: DoorMask['carveRectsLocal'] = [];
    const sealRectsLocal: DoorMask['sealRectsLocal'] = [];

    if (!cell) return { carveRectsLocal, sealRectsLocal };

    void _ldtkLevel;

    const W = IW_ROOM_W_TILES;
    const H = IW_ROOM_H_TILES;
    const D = IW_DOOR_DEPTH;
    const DH = IW_DOOR_H_HEIGHT;
    const DV = IW_DOOR_V_WIDTH;

    const hDoorR0 = Math.max(0, IW_DOOR_FLOOR_ROW - DH);
    const midC = Math.floor(W / 2);
    const vDoorC0 = Math.max(0, midC - Math.floor(DV / 2));

    // Trust LDtk IntGrid as authoritative. Don't add seal walls — LDtk
    // templates already paint walls at non-exit edges, and what looks like
    // an "air pocket near a non-exit edge" (e.g. Level_20 cols 22-25 rows
    // 28-29) is intentional interior layout (vertical drop ending on the
    // solid floor at row 30), not a ghost door to seal.
    //
    // Carve still runs on exit sides as a safety net — if the picked
    // template doesn't already have air at the door position, this opens
    // it. With strict tag-match picking this is a no-op in the happy path.
    if (cell.exits.left) {
      carveRectsLocal.push({ c0: 0, r0: hDoorR0, cN: D, rN: hDoorR0 + DH });
    }
    if (cell.exits.right) {
      carveRectsLocal.push({ c0: W - D, r0: hDoorR0, cN: W, rN: hDoorR0 + DH });
    }
    if (cell.exits.up) {
      carveRectsLocal.push({ c0: vDoorC0, r0: 0, cN: vDoorC0 + DV, rN: D });
    }
    if (cell.exits.down) {
      carveRectsLocal.push({ c0: vDoorC0, r0: H - D, cN: vDoorC0 + DV, rN: H });
    }

    return { carveRectsLocal, sealRectsLocal };
  }

  /** Write the door mask into fullGrid at a given room offset. */
  applyDoorMaskToFullGrid(
    mask: DoorMask,
    fullGrid: number[][],
    sealedCells: Set<string>,
    offR: number,
    offC: number,
  ): void {
    const H = fullGrid.length;
    const W = fullGrid[0]?.length ?? 0;
    // Seals first (solid), then carves (passable) — carves win on overlap.
    //
    // Tag-match invariant (pickTemplate exact=true): the template's outer
    // border is already solid on faces the cell doesn't expose, so writing
    // 1 there is a no-op and we should NOT mark sealedCells. Visual brick
    // overlay is reserved for genuinely sealed ghost doors (coverage gap
    // fallback or mistagged template).
    for (const rect of mask.sealRectsLocal) {
      for (let r = rect.r0; r < rect.rN; r++) {
        for (let c = rect.c0; c < rect.cN; c++) {
          const gr = offR + r, gc = offC + c;
          if (gr >= 0 && gr < H && gc >= 0 && gc < W) {
            if (fullGrid[gr][gc] !== 1) {
              fullGrid[gr][gc] = 1;
              sealedCells.add(`${gr},${gc}`);
            }
          }
        }
      }
    }
    // Carves: only overwrite SOLID tiles (wall/ice/breakable) to air.
    for (const rect of mask.carveRectsLocal) {
      for (let r = rect.r0; r < rect.rN; r++) {
        for (let c = rect.c0; c < rect.cN; c++) {
          const gr = offR + r, gc = offC + c;
          if (gr >= 0 && gr < H && gc >= 0 && gc < W) {
            const v = fullGrid[gr][gc];
            if (v === 1 || v === 7 || v === 9) fullGrid[gr][gc] = 0;
          }
        }
      }
    }
  }

  /**
   * Remove wall tiles whose pixel position falls inside any carve rect — but
   * only when the underlying IntGrid value would actually be carved by
   * `applyDoorMaskToFullGrid` (v1/v7/v9). Platform (v3) and water (v2) survive
   * carve rects so collision and visuals stay in sync. Without this guard the
   * visual was dropped while the platform collision lived on, producing an
   * invisible-but-solid platform at door seams.
   */
  filterWallTilesByCarves<T extends { px: [number, number] }>(
    wallTiles: T[],
    carveRectsLocal: DoorMask['carveRectsLocal'],
    collisionGrid?: number[][],
  ): T[] {
    if (carveRectsLocal.length === 0) return wallTiles;
    return wallTiles.filter(t => {
      const tc = Math.floor(t.px[0] / TILE_SIZE);
      const tr = Math.floor(t.px[1] / TILE_SIZE);
      for (const rect of carveRectsLocal) {
        if (tr >= rect.r0 && tr < rect.rN && tc >= rect.c0 && tc < rect.cN) {
          const v = collisionGrid?.[tr]?.[tc] ?? 1;
          if (v === 1 || v === 7 || v === 9) return false;
          return true;
        }
      }
      return true;
    });
  }

  // ---------------------------------------------------------------------------
  // Seal visuals: code-generated brick walls for sealed passages
  // ---------------------------------------------------------------------------

  /**
   * Paint code-generated seal walls with a mortar + 4x4 brick pattern per
   * sealed cell. The luma variation feeds the palette filter so each brick
   * maps to a different palette position, producing a natural wall silhouette.
   */
  drawUniformWalls(
    roomContainer: Container,
    sealedCells: Set<string>,
    offR: number,
    offC: number,
  ): void {
    const gfx = new Graphics();
    const T = TILE_SIZE;
    const BRICK_W = 4;
    const BRICK_H = 4;
    const brickColors = [0x6a6a80, 0x5c5c74, 0x727288, 0x64647c];
    const mortar = 0x33334a;

    for (let lr = 0; lr < IW_ROOM_H_TILES; lr++) {
      for (let lc = 0; lc < IW_ROOM_W_TILES; lc++) {
        const gr = offR + lr;
        const gc = offC + lc;
        if (!sealedCells.has(`${gr},${gc}`)) continue;

        const x = lc * T;
        const y = lr * T;
        gfx.rect(x, y, T, T).fill(mortar);
        for (let by = 0; by < 4; by++) {
          const offset = (by + lr) % 2 === 0 ? 0 : 2;
          for (let bx = 0; bx < 4; bx++) {
            const bxPos = x + ((bx * BRICK_W + offset) % T);
            const byPos = y + by * BRICK_H;
            const colorIdx = (lc * 7 + lr * 13 + bx * 3 + by) % brickColors.length;
            gfx.rect(bxPos + 1, byPos + 1, BRICK_W - 1, BRICK_H - 1)
               .fill(brickColors[colorIdx]);
          }
        }
      }
    }
    roomContainer.addChild(gfx);
  }

  /**
   * Draw stone-brick blocks over sealed edge strips so players read them as
   * solid walls, not holes.
   */
  drawSealOverlays(
    roomContainer: Container,
    sealRectsLocal: DoorMask['sealRectsLocal'],
  ): void {
    if (sealRectsLocal.length === 0) return;
    const gfx = new Graphics();
    const T = TILE_SIZE;
    const BRICK_W = 4;
    const BRICK_H = 4;
    const colors = [0x6a6a80, 0x5c5c74, 0x727288, 0x64647c];
    const mortar = 0x33334a;

    for (const rect of sealRectsLocal) {
      for (let r = rect.r0; r < rect.rN; r++) {
        for (let c = rect.c0; c < rect.cN; c++) {
          const x = c * T;
          const y = r * T;
          gfx.rect(x, y, T, T).fill(mortar);
          for (let by = 0; by < 4; by++) {
            const offset = (by + r) % 2 === 0 ? 0 : 2;
            for (let bx = 0; bx < 4; bx++) {
              const brickX = x + ((bx * BRICK_W + offset * (BRICK_W / 2)) % T);
              const brickY = y + by * BRICK_H;
              const color = colors[(bx + by + c + r) % colors.length];
              gfx.rect(brickX, brickY, BRICK_W - 1, BRICK_H - 1).fill(color);
            }
          }
        }
      }
    }
    roomContainer.addChild(gfx);
  }

  /**
   * Seal passages on edges that don't connect to a neighbor cell.
   * Writes solid tiles (1) over the passage area.
   */
  sealUnusedExits(
    cell: UnifiedRoomCell,
    grid: number[][],
  ): Array<[number, number]> {
    const h = grid.length;
    const w = grid[0]?.length ?? 0;
    const D = SEAL_DEPTH;
    const changed: Array<[number, number]> = [];

    const seal = (r: number, c: number) => {
      if (r >= 0 && r < h && c >= 0 && c < w && grid[r][c] === 0) {
        grid[r][c] = 1;
        changed.push([c, r]);
      }
    };

    if (!cell.exits.left) {
      for (let r = 0; r < h; r++) for (let c = 0; c < D; c++) seal(r, c);
    }
    if (!cell.exits.right) {
      for (let r = 0; r < h; r++) for (let c = w - D; c < w; c++) seal(r, c);
    }
    if (!cell.exits.up) {
      for (let r = 0; r < D; r++) for (let c = 0; c < w; c++) seal(r, c);
    }
    if (!cell.exits.down) {
      for (let r = h - D; r < h; r++) for (let c = 0; c < w; c++) seal(r, c);
    }

    return changed;
  }

  /** Render seal brick sprites for changed tiles. */
  addSealSprites(changed: Array<[number, number]>): Container | null {
    if (changed.length === 0) return null;
    const T = TILE_SIZE;
    const sealContainer = new Container();
    const gfx = new Graphics();
    const BRICK_W = 4;
    const BRICK_H = 4;
    const colors = [0x3a3a4a, 0x33334a, 0x404050, 0x383848];
    const mortar = 0x222233;

    for (const [c, r] of changed) {
      const x = c * T;
      const y = r * T;
      gfx.rect(x, y, T, T).fill(mortar);
      for (let by = 0; by < 4; by++) {
        const offset = (by + r) % 2 === 0 ? 0 : 2;
        for (let bx = 0; bx < 4; bx++) {
          const brickX = x + ((bx * BRICK_W + offset * (BRICK_W / 2)) % T);
          const brickY = y + by * BRICK_H;
          const color = colors[(bx + by + c + r) % colors.length];
          gfx.rect(brickX, brickY, BRICK_W - 1, BRICK_H - 1).fill(color);
        }
      }
    }
    sealContainer.addChild(gfx);
    return sealContainer;
  }

  /** Find open tile (0) on a room edge closest to hint position. */
  findEdgeOpen(grid: number[][], edge: 'left' | 'right' | 'up' | 'down', hint = -1): number {
    const h = grid.length;
    const w = grid[0]?.length ?? 0;
    const openTiles: number[] = [];

    switch (edge) {
      case 'left':
        for (let r = 0; r < h; r++) if (grid[r][0] === 0) openTiles.push(r);
        break;
      case 'right':
        for (let r = 0; r < h; r++) if (grid[r][w - 1] === 0) openTiles.push(r);
        break;
      case 'up':
        for (let c = 0; c < w; c++) if (grid[0][c] === 0) openTiles.push(c);
        break;
      case 'down':
        for (let c = 0; c < w; c++) if (grid[h - 1]?.[c] === 0) openTiles.push(c);
        break;
    }

    if (openTiles.length === 0) {
      return edge === 'left' || edge === 'right' ? Math.floor(h / 2) : Math.floor(w / 2);
    }
    if (hint < 0) return openTiles[Math.floor(openTiles.length / 2)];
    let best = openTiles[0];
    let bestDist = Math.abs(openTiles[0] - hint);
    for (let i = 1; i < openTiles.length; i++) {
      const d = Math.abs(openTiles[i] - hint);
      if (d < bestDist) { best = openTiles[i]; bestDist = d; }
    }
    return best;
  }

  /** Scan downward from startRow to find the first solid tile. */
  findFloorY(grid: number[][], col: number, startRow: number): number {
    const h = grid.length;
    for (let r = startRow; r < h; r++) {
      if ((grid[r]?.[col] ?? 1) >= 1) return r * TILE_SIZE;
    }
    return (h - 1) * TILE_SIZE;
  }
}
