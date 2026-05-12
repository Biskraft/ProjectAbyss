/**
 * BurnableZonePass — hybrid procedural population of grass/wood within LDtk-painted intent zones.
 *
 * Workflow:
 *   1. Level designer paints `BurnableZone` rect entities in LDtk Editor
 *      with `Type` (Grass | Wood | Mixed) and `Density` (0..1) fields.
 *   2. Scene calls applyBurnableZones(collisionGrid, level.entities) after the
 *      collisionGrid is materialised but before the IntGrid is consumed for
 *      rendering / TileMutator.
 *   3. This pass fills grass cells (passable, in AIR slots above WALL) and
 *      wood planks (solid, replacing WALL surface) per density + cluster rules.
 *
 * LDtk Editor 측 정의 (사용자 작업):
 *   Identifier: BurnableZone
 *   Resizable: true (rect)
 *   Pivot: 0, 0 (top-left)
 *   Fields:
 *     - Type: Enum (Grass | Wood | Mixed)  default = Grass
 *     - Density: Float (0..1)              default = 0.4
 *     - Seed: Int                          default = 0  (0 = non-deterministic)
 *
 * GDD: Documents/System/System_World_TileSystem.md §7 (LDtk 설정 가이드)
 */

import {
  TILE_AIR, TILE_WALL, TILE_GRASS, TILE_WOOD,
  TILE_MAGMA, TILE_CHARGED, TILE_SPIKE, TILE_WATER, TILE_ACID,
} from '../core/Physics';
import type { LdtkEntity } from './LdtkLoader';

export type BurnableZoneType = 'Grass' | 'Wood' | 'Mixed';

interface ZoneConfig {
  type: BurnableZoneType;
  density: number;
  seed: number;
}

/** Mulberry32 — deterministic PRNG for Seed-based generation. */
function mulberry32(seed: number): () => number {
  let t = seed | 0;
  return () => {
    t = (t + 0x6D2B79F5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Apply burnable population to `collisionGrid`. Mutates the grid in place.
 *
 * @param collisionGrid IntGrid (rows × cols) to mutate
 * @param entities LDtk entities — only `BurnableZone` is processed
 * @param tileSize LDtk grid cell size in px (default 16)
 * @param offsetCellX horizontal cell offset (for ItemWorld fullGrid concat)
 * @param offsetCellY vertical cell offset
 */
export function applyBurnableZones(
  collisionGrid: number[][],
  entities: LdtkEntity[],
  tileSize = 16,
  offsetCellX = 0,
  offsetCellY = 0,
): void {
  if (!collisionGrid?.length) return;
  const rows = collisionGrid.length;
  const cols = collisionGrid[0]?.length ?? 0;
  if (!cols) return;

  for (const ent of entities) {
    if (ent.type !== 'BurnableZone') continue;
    const cfg = readZoneConfig(ent);
    if (cfg.density <= 0) continue;

    const px0 = (ent.px?.[0] ?? 0) + offsetCellX * tileSize;
    const py0 = (ent.px?.[1] ?? 0) + offsetCellY * tileSize;
    const cellX0 = Math.floor(px0 / tileSize);
    const cellY0 = Math.floor(py0 / tileSize);
    const wCells = Math.ceil((ent.width ?? tileSize) / tileSize);
    const hCells = Math.ceil((ent.height ?? tileSize) / tileSize);
    const cellX1 = Math.min(cols, cellX0 + wCells);
    const cellY1 = Math.min(rows, cellY0 + hCells);

    const rng = cfg.seed > 0 ? mulberry32(cfg.seed) : Math.random;

    populateZone(collisionGrid, cellX0, cellY0, cellX1, cellY1, cfg, rng);
  }
}

function readZoneConfig(ent: LdtkEntity): ZoneConfig {
  const raw = ent.fields ?? {};
  const typeRaw = (raw['Type'] ?? raw['type'] ?? 'Grass') as string;
  const type: BurnableZoneType =
    typeRaw === 'Wood' || typeRaw === 'Mixed' ? (typeRaw as BurnableZoneType) : 'Grass';
  let density = Number(raw['Density'] ?? raw['density'] ?? 0.4);
  if (!isFinite(density) || density < 0) density = 0;
  if (density > 1) density = 1;
  let seed = Number(raw['Seed'] ?? raw['seed'] ?? 0);
  if (!isFinite(seed)) seed = 0;
  return { type, density, seed };
}

/**
 * Procedural rules:
 *   - GRASS: place in AIR cell directly above a WALL cell (1-tile cover)
 *   - WOOD:  replace WALL with WOOD when ground forms a horizontal run of 3+
 *     (planks need length to read visually). Single-cell wall tops stay WALL.
 *   - Blacklist 4-neighbours containing MAGMA/CHARGED/SPIKE/WATER/ACID
 *     (식생/목재가 그 근처에 자라거나 남지 않음 — ECHORIS 톤)
 *   - Cluster bias: a grass cell with a grass 4-neighbour gets +0.20 chance
 *     so foliage forms patches rather than isolated dots.
 */
function populateZone(
  grid: number[][], x0: number, y0: number, x1: number, y1: number,
  cfg: ZoneConfig, rng: () => number,
): void {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const row = grid[y];
      if (!row || row[x] !== TILE_WALL) continue;

      // Need AIR above to place a 1-tile cover (grass) or to keep wood readable.
      if (y - 1 < 0) continue;
      const above = grid[y - 1]?.[x] ?? TILE_AIR;
      if (above !== TILE_AIR) continue;

      // Hazard blacklist within 1 cell radius
      if (hasHazardNearby(grid, x, y - 1, 1)) continue;

      const wantWood = cfg.type === 'Wood' ||
        (cfg.type === 'Mixed' && rng() < 0.5);

      if (wantWood) {
        // Only place wood when this cell is part of a horizontal run of 3+ walls.
        if (!isInHorizontalWallRun(grid, x, y, 3)) continue;
        const base = cfg.density;
        if (rng() < base) row[x] = TILE_WOOD;
      } else {
        // Grass — place in AIR above wall, cluster bias.
        const cluster = grassNeighbourCount(grid, x, y - 1) > 0 ? 0.20 : 0;
        if (rng() < cfg.density + cluster) {
          if (grid[y - 1]) grid[y - 1][x] = TILE_GRASS;
        }
      }
    }
  }
}

function hasHazardNearby(grid: number[][], cx: number, cy: number, radius: number): boolean {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const t = grid[cy + dy]?.[cx + dx];
      if (t === undefined) continue;
      if (t === TILE_MAGMA || t === TILE_CHARGED || t === TILE_SPIKE ||
          t === TILE_WATER || t === TILE_ACID) return true;
    }
  }
  return false;
}

function isInHorizontalWallRun(grid: number[][], x: number, y: number, minLength: number): boolean {
  const row = grid[y]; if (!row) return false;
  let len = 1;
  for (let dx = 1; dx < minLength; dx++) {
    if (row[x + dx] === TILE_WALL && (grid[y - 1]?.[x + dx] ?? TILE_AIR) === TILE_AIR) len++;
    else break;
  }
  for (let dx = 1; dx < minLength; dx++) {
    if (row[x - dx] === TILE_WALL && (grid[y - 1]?.[x - dx] ?? TILE_AIR) === TILE_AIR) len++;
    else break;
  }
  return len >= minLength;
}

function grassNeighbourCount(grid: number[][], x: number, y: number): number {
  let n = 0;
  if (grid[y]?.[x - 1] === TILE_GRASS) n++;
  if (grid[y]?.[x + 1] === TILE_GRASS) n++;
  if (grid[y - 1]?.[x] === TILE_GRASS) n++;
  if (grid[y + 1]?.[x] === TILE_GRASS) n++;
  return n;
}
