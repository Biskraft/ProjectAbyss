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
import { BURNABLE_CATALOG, pickPropForZone, type BurnablePropId, type BurnableAnchor } from '../entities/BurnableProp';

export type BurnableZoneType = 'Grass' | 'Wood' | 'Mixed';

interface ZoneConfig {
  type: BurnableZoneType;
  density: number;
  seed: number;
}

/** Procedural spec the scene uses to instantiate BurnableProp entities. */
export interface BurnableEntitySpec {
  id: BurnablePropId;
  /** Top-left cell of footprint, in fullGrid coordinates. */
  gx: number;
  gy: number;
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
/**
 * Apply burnable population to `collisionGrid` and collect entity spawn specs.
 * Mutates the grid in place and returns the list of BurnableProp entity specs
 * the caller (scene) should instantiate and register.
 *
 * @returns Array of entity specs to spawn. Empty if no zones / no entities.
 */
export function applyBurnableZones(
  collisionGrid: number[][],
  entities: LdtkEntity[],
  tileSize = 16,
  offsetCellX = 0,
  offsetCellY = 0,
): BurnableEntitySpec[] {
  const specs: BurnableEntitySpec[] = [];
  if (!collisionGrid?.length) return specs;
  const rows = collisionGrid.length;
  const cols = collisionGrid[0]?.length ?? 0;
  if (!cols) return specs;

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

    // ENTITIES FIRST so they claim wall-top AIR cells before grass occupies them.
    // Without this ordering, floor-anchored props (Bush, Bush, BranchPile, WoodCrate)
    // never spawn because grass fills the only valid air-above-wall slot.
    const occupied = new Set<number>();
    populateZoneEntities(collisionGrid, cellX0, cellY0, cellX1, cellY1, cfg, rng, specs, occupied);
    populateZone(collisionGrid, cellX0, cellY0, cellX1, cellY1, cfg, rng, occupied);
  }
  return specs;
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
  occupied: Set<number>,
): void {
  const pack = (gx: number, gy: number) => gy * 4096 + gx;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const row = grid[y];
      if (!row || row[x] !== TILE_WALL) continue;

      // Skip if this WALL cell is reserved for a wood-replacement by an entity,
      // or its air-above slot is occupied by an entity footprint.
      if (occupied.has(pack(x, y))) continue;

      // Need AIR above to place a 1-tile cover (grass) or to keep wood readable.
      if (y - 1 < 0) continue;
      const above = grid[y - 1]?.[x] ?? TILE_AIR;
      if (above !== TILE_AIR) continue;
      if (occupied.has(pack(x, y - 1))) continue;

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

/**
 * Tier B — sparse BurnableProp placement inside a zone rect.
 *
 * Walks the rect; at each candidate cell with appropriate anchor (floor cell
 * has WALL below + AIR self, ceiling cell has WALL above + AIR self), rolls
 * `density * 0.15` to spawn an entity (~6.7% of grass cell rate).
 *
 * Footprint validation: ensures the prop's cells × anchor neighbours are all
 * AIR (or already entity-occupied skip) before committing. Avoids hazard
 * blacklist within 1 cell of any footprint cell.
 */
/**
 * Count-based candidate model:
 *   1. Walk the rect collecting valid anchor cells (floor + ceiling).
 *   2. Compute target = max(1, floor(candidateCount × density × ENTITY_DENSITY_MUL)).
 *   3. Shuffle candidates with the same RNG, then commit until target reached
 *      (or all candidates exhausted via footprint validation).
 *
 * Guarantees ≥1 spawn whenever the zone has any valid anchor cell, which
 * solves the "small zone gets 0 entities by bad luck" problem.
 */
function populateZoneEntities(
  grid: number[][], x0: number, y0: number, x1: number, y1: number,
  cfg: ZoneConfig, rng: () => number,
  specs: BurnableEntitySpec[],
  occupied: Set<number>,
): void {
  const pack = (gx: number, gy: number) => gy * 4096 + gx;

  interface Candidate { x: number; y: number; anchor: BurnableAnchor; }
  const candidates: Candidate[] = [];
  const seen = new Set<number>();
  const addCandidate = (x: number, y: number, anchor: BurnableAnchor) => {
    const key = pack(x, y);
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push({ x, y, anchor });
  };

  // Phase 1 — collect candidates supporting BOTH user conventions:
  //   (A) BurnableZone rect painted OVER the AIR cells above the floor
  //   (B) BurnableZone rect painted ON the WALL/floor cells themselves
  // grass placement (populateZone) walks WALL cells in rect and places grass
  // at (x, y-1); entity scan does the same here so the conventions match.
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const cell = grid[y]?.[x];
      if (cell === undefined) continue;

      // (A) AIR cell in rect — check 4-anchor
      if (cell === TILE_AIR) {
        if (hasHazardNearby(grid, x, y, 1)) continue;
        const wallBelow = (grid[y + 1]?.[x] ?? TILE_AIR) === TILE_WALL;
        const wallAbove = (grid[y - 1]?.[x] ?? TILE_AIR) === TILE_WALL;
        let anchor: BurnableAnchor;
        if (wallBelow && !wallAbove) anchor = 'floor';
        else if (wallAbove && !wallBelow) anchor = 'ceiling';
        else continue;
        addCandidate(x, y, anchor);
      }
      // (B) WALL cell in rect — the AIR cell above is a floor-anchor candidate
      else if (cell === TILE_WALL) {
        const cy = y - 1;
        if (cy < 0) continue;
        if ((grid[cy]?.[x] ?? -1) !== TILE_AIR) continue;
        if (hasHazardNearby(grid, x, cy, 1)) continue;
        addCandidate(x, cy, 'floor');
      }
    }
  }
  if (candidates.length === 0) return;

  // Phase 2 — shuffle (Fisher-Yates with our rng)
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = candidates[i]; candidates[i] = candidates[j]; candidates[j] = tmp;
  }

  // Phase 3 — commit up to target count.
  // density 1.0 → fill 100% of valid candidates (clamped by footprint validation).
  // density 0.5 → fill ~50%. Min 1 spawn when zone has any candidate.
  const target = Math.max(1, Math.floor(candidates.length * cfg.density));
  let placed = 0;
  for (const c of candidates) {
    if (placed >= target) break;
    if (occupied.has(pack(c.x, c.y))) continue;

    const id = pickPropForZone(cfg.type, rng, c.anchor);
    if (!id) continue;
    const spec = BURNABLE_CATALOG[id];
    const cellW = spec.cells[0], cellH = spec.cells[1];

    let topLeftY: number;
    if (c.anchor === 'floor') topLeftY = c.y - (cellH - 1);
    else topLeftY = c.y;
    if (topLeftY < 0 || topLeftY + cellH > grid.length) continue;

    let ok = true;
    for (let dy = 0; dy < cellH && ok; dy++) {
      for (let dx = 0; dx < cellW && ok; dx++) {
        const fx = c.x + dx, fy = topLeftY + dy;
        if ((grid[fy]?.[fx] ?? -1) !== TILE_AIR) { ok = false; break; }
        if (occupied.has(pack(fx, fy))) { ok = false; break; }
        if (hasHazardNearby(grid, fx, fy, 1)) { ok = false; break; }
      }
    }
    if (!ok) continue;

    for (let dy = 0; dy < cellH; dy++) {
      for (let dx = 0; dx < cellW; dx++) {
        occupied.add(pack(c.x + dx, topLeftY + dy));
      }
    }
    specs.push({ id, gx: c.x, gy: topLeftY });
    placed++;
  }
}
