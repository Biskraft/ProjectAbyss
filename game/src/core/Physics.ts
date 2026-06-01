export interface AABB {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function aabbOverlap(a: AABB, b: AABB): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export const TILE_SIZE = 16;

/**
 * Tile types (shared by procedural + LDtk):
 *   0 = empty / passable
 *   1 = solid (wall/floor)
 *   2 = water (passable, applies water physics)
 *   3 = one-way platform
 *   4 = updraft (passable, applies strong upward wind)
 *   5 = spike (passable, contact = physical damage + respawn)
 *   6 = magma (passable, contact = Burn 3s + DoT) [Phase 1]
 *   7 = ice (solid, zero friction surface) [Phase 1]
 *   8 = charged (passable, contact = Shock DoT volumetric field) [Phase 1]
 *   9 = breakable (solid, 1-hit destroy → air) [Phase 0]
 *  10 = void (passable, contact = void drop sequence, no damage)
 *  11 = oil (passable, slight slip, ignites from Fire attack → fire spreads + air) [Phase 1]
 *  12 = metal (solid, Thunder flood-fill conductor, acid corrodes) [Phase 1]
 *  13 = acid (passable, DoT + corrodes adjacent metal + conducts thunder + vapor on magma) [Phase 1]
 *  20 = cyro (passable, light DoT + Frozen status: 이동 -75% / 3s) [V2.4 2026-05-18, Iron primary signature.
 *           LDtk Editor enum value: SSoT — Editor 재정렬 후 cyro=20 으로 고정.
 *           Spelled "cyro" not "cryo" — LDtk Cyro enum 표기와 코드베이스가 mirror.]
 *  15 = wood plank (solid, slow burn ~3s when fire spreads → air on consume) [Phase 1]
 *  16 = grass (passable thin cover sitting in air-cell above wall, fast burn ~0.6s → air) [Phase 1]
 *
 * GDD: Documents/System/System_World_TileSystem.md
 */
export const TILE_AIR = 0;
export const TILE_WALL = 1;
export const TILE_WATER = 2;
export const TILE_PLATFORM = 3;
export const TILE_UPDRAFT = 4;
export const TILE_SPIKE = 5;
export const TILE_MAGMA = 6;
export const TILE_ICE = 7;
export const TILE_CHARGED = 8;
export const TILE_BREAKABLE = 9;
export const TILE_VOID = 10;
export const TILE_OIL = 11;
export const TILE_METAL = 12;
export const TILE_ACID = 13;
export const TILE_WOOD = 15;
export const TILE_GRASS = 16;
// TILE_CYRO 2026-05-18: 14 → 20 (LDtk SSoT 와 정렬, Editor 재정렬 후 cyro=20).
export const TILE_CYRO = 20;

export function isSolid(tileId: number): boolean {
  return (
    tileId === TILE_WALL || tileId === TILE_ICE || tileId === TILE_BREAKABLE ||
    tileId === TILE_METAL || tileId === TILE_WOOD
  );
}

export function isOneWay(tileId: number): boolean {
  return tileId === 3;
}

export function isWater(tileId: number): boolean {
  return tileId === 2;
}

export function isUpdraft(tileId: number): boolean {
  return tileId === 4;
}

export function isSpike(tileId: number): boolean {
  return tileId === 5;
}

export function isBreakable(tileId: number): boolean {
  return tileId === 9;
}

export function isIce(tileId: number): boolean {
  return tileId === 7;
}

export function isVoid(tileId: number): boolean {
  return tileId === TILE_VOID;
}

export function isMagma(tileId: number): boolean {
  return tileId === TILE_MAGMA;
}

export function isCharged(tileId: number): boolean {
  return tileId === TILE_CHARGED;
}

export function isOil(tileId: number): boolean {
  return tileId === TILE_OIL;
}

export function isMetal(tileId: number): boolean {
  return tileId === TILE_METAL;
}

export function isAcid(tileId: number): boolean {
  return tileId === TILE_ACID;
}

export function isCyro(tileId: number): boolean {
  return tileId === TILE_CYRO;
}

export function isWood(tileId: number): boolean {
  return tileId === TILE_WOOD;
}

export function isGrass(tileId: number): boolean {
  return tileId === TILE_GRASS;
}

/** Cell types that flood-fill conduct Thunder (water + metal + acid). */
export function isConductor(tileId: number): boolean {
  return tileId === TILE_WATER || tileId === TILE_METAL || tileId === TILE_ACID;
}

/** Cell types that can ignite and propagate fire (Fire enchant seed or 4-neighbor spread). */
export function isFlammable(tileId: number): boolean {
  return tileId === TILE_OIL || tileId === TILE_WOOD || tileId === TILE_GRASS;
}

/**
 * Hazard/signal tiles whose original tileset color is load-bearing for
 * player communication (water blue, spike red/white, updraft upward wind,
 * magma orange, charged yellow). Rendered on a filter-free layer so the
 * PaletteSwapFilter does not wash them out into the biome palette.
 * Neutral structural tiles (solid wall, one-way, ice, breakable) stay on
 * the filtered wall layer.
 */
export function isSpecialVisualTile(tileId: number): boolean {
  return (
    tileId === TILE_WATER || tileId === TILE_UPDRAFT || tileId === TILE_SPIKE ||
    tileId === TILE_MAGMA || tileId === TILE_CHARGED || tileId === TILE_VOID ||
    tileId === TILE_OIL || tileId === TILE_ACID || tileId === TILE_CYRO ||
    tileId === TILE_GRASS
  );
}

/** Check if an entity is standing ON a one-way (drop-through) platform — for tutorial gating. */
export function isOnOneWay(x: number, y: number, width: number, height: number, roomData: number[][]): boolean {
  const feetRow = Math.floor((y + height) / TILE_SIZE);
  const leftCol = Math.floor(x / TILE_SIZE);
  const rightCol = Math.floor((x + width - 1) / TILE_SIZE);
  for (let col = leftCol; col <= rightCol; col++) {
    if (isOneWay(getTile(roomData, col, feetRow))) return true;
  }
  return false;
}

/** Check if an entity is standing ON an ice tile (feet on ice surface). */
export function isOnIce(x: number, y: number, width: number, height: number, roomData: number[][]): boolean {
  const feetRow = Math.floor((y + height) / TILE_SIZE);
  const leftCol = Math.floor(x / TILE_SIZE);
  const rightCol = Math.floor((x + width - 1) / TILE_SIZE);
  for (let col = leftCol; col <= rightCol; col++) {
    if (isIce(getTile(roomData, col, feetRow))) return true;
  }
  return false;
}

/** Check if an entity overlaps any spike tile (any corner touching spike = hit) */
export function isInSpike(x: number, y: number, width: number, height: number, roomData: number[][]): boolean {
  const l = Math.floor(x / TILE_SIZE);
  const r = Math.floor((x + width - 1) / TILE_SIZE);
  const t = Math.floor(y / TILE_SIZE);
  const b = Math.floor((y + height - 1) / TILE_SIZE);
  for (let row = t; row <= b; row++) {
    for (let col = l; col <= r; col++) {
      if (isSpike(getTile(roomData, col, row))) return true;
    }
  }
  return false;
}

/** Check if an entity overlaps any updraft tile */
export function isInUpdraft(x: number, y: number, width: number, height: number, roomData: number[][]): boolean {
  const midCol = Math.floor((x + width / 2) / TILE_SIZE);
  const midRow = Math.floor((y + height / 2) / TILE_SIZE);
  return isUpdraft(getTile(roomData, midCol, midRow));
}

/** Check if an entity overlaps any water tile */
export function isInWater(x: number, y: number, width: number, height: number, roomData: number[][]): boolean {
  const midCol = Math.floor((x + width / 2) / TILE_SIZE);
  const midRow = Math.floor((y + height / 2) / TILE_SIZE);
  return isWater(getTile(roomData, midCol, midRow));
}

/** Check if an entity overlaps any void tile (feet entering void = trigger) */
export function isInVoid(x: number, y: number, width: number, height: number, roomData: number[][]): boolean {
  const feetRow = Math.floor((y + height - 1) / TILE_SIZE);
  const leftCol = Math.floor(x / TILE_SIZE);
  const rightCol = Math.floor((x + width - 1) / TILE_SIZE);
  for (let col = leftCol; col <= rightCol; col++) {
    if (isVoid(getTile(roomData, col, feetRow))) return true;
  }
  return false;
}

/** AABB-overlap any-cell predicate factory for hazard tiles. */
function isInTile(
  pred: (t: number) => boolean,
): (x: number, y: number, w: number, h: number, roomData: number[][]) => boolean {
  return (x, y, w, h, roomData) => {
    const l = Math.floor(x / TILE_SIZE);
    const r = Math.floor((x + w - 1) / TILE_SIZE);
    const t = Math.floor(y / TILE_SIZE);
    const b = Math.floor((y + h - 1) / TILE_SIZE);
    for (let row = t; row <= b; row++) {
      for (let col = l; col <= r; col++) {
        if (pred(getTile(roomData, col, row))) return true;
      }
    }
    return false;
  };
}

/** Check if an entity AABB overlaps any magma tile (any cell touching = hit). */
export const isInMagma = isInTile(isMagma);

/** Check if an entity AABB overlaps any charged tile (any cell = hit). */
export const isInCharged = isInTile(isCharged);

/** Check if an entity AABB overlaps any oil tile (feet on oil = slip + fire vulnerability). */
export const isInOil = isInTile(isOil);

/** Check if an entity AABB overlaps any acid tile. */
export const isInAcid = isInTile(isAcid);

/** Check if an entity AABB overlaps any cryo tile (any cell = Frozen 상태이상 + light DOT). */
export const isInCyro = isInTile(isCyro);

/**
 * Enumerate AABB cells whose tile satisfies `pred`. For Thunder seed cell pick,
 * fire-source check, etc.
 */
export function findCellInAABB(
  x: number, y: number, w: number, h: number, roomData: number[][],
  pred: (t: number) => boolean,
): { gx: number; gy: number } | null {
  const l = Math.floor(x / TILE_SIZE);
  const r = Math.floor((x + w - 1) / TILE_SIZE);
  const t = Math.floor(y / TILE_SIZE);
  const b = Math.floor((y + h - 1) / TILE_SIZE);
  for (let row = t; row <= b; row++) {
    for (let col = l; col <= r; col++) {
      if (pred(getTile(roomData, col, row))) return { gx: col, gy: row };
    }
  }
  return null;
}

/**
 * Resolve X-axis collision against tilemap.
 * Returns corrected x position and whether a collision occurred.
 */
export function resolveX(
  x: number, y: number, width: number, height: number,
  vx: number, roomData: number[][]
): { x: number; collided: boolean } {
  if (vx === 0) return { x, collided: false };

  const newX = x + vx;

  // Check leading edge
  const leadX = vx > 0 ? newX + width : newX;
  const topTile = Math.floor(y / TILE_SIZE);
  const bottomTile = Math.floor((y + height - 1) / TILE_SIZE);
  const checkCol = Math.floor(leadX / TILE_SIZE);

  for (let row = topTile; row <= bottomTile; row++) {
    const tile = getTile(roomData, checkCol, row);
    if (isSolid(tile)) {
      // Push back
      if (vx > 0) {
        return { x: checkCol * TILE_SIZE - width, collided: true };
      } else {
        return { x: (checkCol + 1) * TILE_SIZE, collided: true };
      }
    }
  }

  return { x: newX, collided: false };
}

/**
 * Resolve Y-axis collision against tilemap.
 * Returns corrected y, whether grounded, and whether collision occurred.
 */
export function resolveY(
  x: number, y: number, width: number, height: number,
  vy: number, roomData: number[][], ignoreOneWay = false
): { y: number; grounded: boolean; collided: boolean } {
  if (vy === 0) {
    // Even when stationary, check if standing on a solid or one-way tile
    // so grounded state persists across frames (prevents one-way platform
    // flicker where player cycles ground→air→ground every frame).
    const feetRow = Math.floor((y + height) / TILE_SIZE);
    const leftCol = Math.floor(x / TILE_SIZE);
    const rightCol = Math.floor((x + width - 1) / TILE_SIZE);
    for (let col = leftCol; col <= rightCol; col++) {
      const tile = getTile(roomData, col, feetRow);
      if (isSolid(tile) || (isOneWay(tile) && !ignoreOneWay)) {
        return { y, grounded: true, collided: false };
      }
    }
    return { y, grounded: false, collided: false };
  }

  const newY = y + vy;

  // Check leading edge
  const leadY = vy > 0 ? newY + height : newY;
  const leftTile = Math.floor(x / TILE_SIZE);
  const rightTile = Math.floor((x + width - 1) / TILE_SIZE);
  const checkRow = Math.floor(leadY / TILE_SIZE);

  for (let col = leftTile; col <= rightTile; col++) {
    const tile = getTile(roomData, col, checkRow);

    if (isSolid(tile)) {
      if (vy > 0) {
        return { y: checkRow * TILE_SIZE - height, grounded: true, collided: true };
      } else {
        return { y: (checkRow + 1) * TILE_SIZE, grounded: false, collided: true };
      }
    }

    // One-way: only collide when falling and feet were above the platform
    if (isOneWay(tile) && vy > 0 && !ignoreOneWay) {
      const platformTop = checkRow * TILE_SIZE;
      const feetBefore = y + height;
      if (feetBefore <= platformTop + 1) {
        return { y: platformTop - height, grounded: true, collided: true };
      }
    }
  }

  return { y: newY, grounded: false, collided: false };
}

/**
 * Celeste/TowerFall-style integer pixel sweep for actor X movement.
 *
 * Callers can keep float velocity/acceleration, but should convert the
 * accumulated displacement to an integer pixel delta before calling this.
 * Sweeping one pixel at a time prevents jump/fall tunneling when frame time
 * spikes push a single-frame movement across more than one tile edge.
 */
export function resolveXPixelStep(
  x: number, y: number, width: number, height: number,
  dx: number, roomData: number[][],
): { x: number; collided: boolean; moved: number } {
  const move = Math.trunc(dx);
  if (move === 0) return { x, collided: false, moved: 0 };

  const sign = move > 0 ? 1 : -1;
  let curX = x;
  let remaining = Math.abs(move);

  while (remaining > 0) {
    const nextX = curX + sign;
    const leadX = sign > 0 ? nextX + width : nextX;
    const topTile = Math.floor(y / TILE_SIZE);
    const bottomTile = Math.floor((y + height - 1) / TILE_SIZE);
    const checkCol = Math.floor(leadX / TILE_SIZE);

    let blocked = false;
    for (let row = topTile; row <= bottomTile; row++) {
      if (isSolid(getTile(roomData, checkCol, row))) {
        blocked = true;
        break;
      }
    }
    if (blocked) {
      const hitX = sign > 0
        ? checkCol * TILE_SIZE - width
        : (checkCol + 1) * TILE_SIZE;
      return { x: hitX, collided: true, moved: hitX - x };
    }

    curX = nextX;
    remaining--;
  }

  return { x: curX, collided: false, moved: curX - x };
}

/**
 * Celeste/TowerFall-style integer pixel sweep for actor Y movement.
 * Keeps the existing one-way platform semantics while avoiding skipped floors
 * and ceilings during high fall speed or low frame-rate jump frames.
 */
export function resolveYPixelStep(
  x: number, y: number, width: number, height: number,
  dy: number, roomData: number[][], ignoreOneWay = false,
): { y: number; grounded: boolean; collided: boolean; moved: number } {
  const move = Math.trunc(dy);
  if (move === 0) {
    const grounded = resolveY(x, y, width, height, 0, roomData, ignoreOneWay).grounded;
    return { y, grounded, collided: false, moved: 0 };
  }

  const sign = move > 0 ? 1 : -1;
  let curY = y;
  let remaining = Math.abs(move);

  while (remaining > 0) {
    const nextY = curY + sign;
    const leadY = sign > 0 ? nextY + height : nextY;
    const leftTile = Math.floor(x / TILE_SIZE);
    const rightTile = Math.floor((x + width - 1) / TILE_SIZE);
    const checkRow = Math.floor(leadY / TILE_SIZE);

    for (let col = leftTile; col <= rightTile; col++) {
      const tile = getTile(roomData, col, checkRow);

      if (isSolid(tile)) {
        const hitY = sign > 0
          ? checkRow * TILE_SIZE - height
          : (checkRow + 1) * TILE_SIZE;
        return { y: hitY, grounded: sign > 0, collided: true, moved: hitY - y };
      }

      if (isOneWay(tile) && sign > 0 && !ignoreOneWay) {
        const platformTop = checkRow * TILE_SIZE;
        const feetBefore = curY + height;
        const feetAfter = nextY + height;
        if (feetBefore <= platformTop + 1 && feetAfter >= platformTop) {
          const landedY = platformTop - height;
          return { y: landedY, grounded: true, collided: true, moved: landedY - y };
        }
      }
    }

    curY = nextY;
    remaining--;
  }

  return { y: curY, grounded: false, collided: false, moved: curY - y };
}

/**
 * Corner correction for upward movement (vy<0) — "ledge grab" QoL helper.
 * When the player's head is about to clip a ceiling tile at a corner, and the
 * overlap with the obstacle is within `tolerance`, nudge the player
 * horizontally so they pass through instead of stopping.
 *
 * Only triggers when the head-row hit is caused by a solid column at exactly
 * one edge of the player's AABB (the "corner" condition). Wide ceilings with
 * fully-solid head rows are filtered out.
 *
 * Returns the corrected x, or null if no correction applies.
 */
export function tryCornerCorrectUp(
  x: number, y: number, width: number, height: number,
  vy: number, roomData: number[][], tolerance: number,
): number | null {
  if (vy >= 0) return null;
  const newY = y + vy;
  const headRow = Math.floor(newY / TILE_SIZE);
  const leftCol = Math.floor(x / TILE_SIZE);
  const rightCol = Math.floor((x + width - 1) / TILE_SIZE);

  // Need at least 2 columns spanned for corner logic to make sense.
  if (leftCol === rightCol) return null;

  const leftSolid = isSolid(getTile(roomData, leftCol, headRow));
  const rightSolid = isSolid(getTile(roomData, rightCol, headRow));

  // One side blocked, the other free — candidate for corner nudge.
  if (leftSolid && !rightSolid) {
    const obstacleRight = (leftCol + 1) * TILE_SIZE;
    const overlap = obstacleRight - x;
    if (overlap > 0 && overlap <= tolerance) {
      const nx = obstacleRight;
      // Verify head row is clear across the new AABB.
      const nl = Math.floor(nx / TILE_SIZE);
      const nr = Math.floor((nx + width - 1) / TILE_SIZE);
      for (let col = nl; col <= nr; col++) {
        if (isSolid(getTile(roomData, col, headRow))) return null;
      }
      return nx;
    }
  }
  if (rightSolid && !leftSolid) {
    const obstacleLeft = rightCol * TILE_SIZE;
    const overlap = (x + width) - obstacleLeft;
    if (overlap > 0 && overlap <= tolerance) {
      const nx = obstacleLeft - width;
      const nl = Math.floor(nx / TILE_SIZE);
      const nr = Math.floor((nx + width - 1) / TILE_SIZE);
      for (let col = nl; col <= nr; col++) {
        if (isSolid(getTile(roomData, col, headRow))) return null;
      }
      return nx;
    }
  }
  return null;
}

/**
 * Ledge snap for horizontal movement — "ledge grab" QoL helper.
 * When a horizontal move would hit a tile's side but the player is only
 * slightly below the top of that tile (overlap <= tolerance) AND the tile
 * above is empty, lift the player up onto the ledge.
 *
 * Ignores one-way platforms (they are passable from the side already).
 * Returns the corrected y, or null if no correction applies.
 */
export function tryLedgeSnap(
  x: number, y: number, width: number, height: number,
  vx: number, roomData: number[][], tolerance: number,
): number | null {
  if (vx === 0) return null;
  const newX = x + vx;
  const leadX = vx > 0 ? newX + width : newX;
  const checkCol = Math.floor(leadX / TILE_SIZE);
  const topRow = Math.floor(y / TILE_SIZE);
  const bottomRow = Math.floor((y + height - 1) / TILE_SIZE);

  // Topmost solid in the player's vertical sweep at the leading column.
  let topSolidRow = -1;
  for (let row = topRow; row <= bottomRow; row++) {
    if (isSolid(getTile(roomData, checkCol, row))) {
      topSolidRow = row;
      break;
    }
  }
  if (topSolidRow < 0) return null;

  // Must be a ledge — tile above must be empty (not solid).
  if (isSolid(getTile(roomData, checkCol, topSolidRow - 1))) return null;

  const tileTop = topSolidRow * TILE_SIZE;
  const overlap = (y + height) - tileTop;
  if (overlap <= 0 || overlap > tolerance) return null;

  const targetY = tileTop - height;
  // Verify rows between new top and old top are clear across the player's columns.
  const newTopRow = Math.floor(targetY / TILE_SIZE);
  const ocLeft = Math.floor(x / TILE_SIZE);
  const ocRight = Math.floor((x + width - 1) / TILE_SIZE);
  for (let row = newTopRow; row < topRow; row++) {
    for (let col = ocLeft; col <= ocRight; col++) {
      if (isSolid(getTile(roomData, col, row))) return null;
    }
  }
  return targetY;
}

export interface SlopeSegment2x1 {
  x0: number;
  x1: number;
  yLeft: number;
  yRight: number;
  dir: 'upRight' | 'upLeft';
}

function slopeFloorYAt(slope: SlopeSegment2x1, x: number): number {
  const t = Math.max(0, Math.min(1, (x - slope.x0) / (slope.x1 - slope.x0)));
  return slope.yLeft + (slope.yRight - slope.yLeft) * t;
}

function isSurfaceTile(roomData: number[][], col: number, row: number): boolean {
  return isSolid(getTile(roomData, col, row)) && !isSolid(getTile(roomData, col, row - 1));
}

function buildUpRightSlope(roomData: number[][], startCol: number, lowRow: number): SlopeSegment2x1 | null {
  const highRow = lowRow - 1;
  if (!isSurfaceTile(roomData, startCol, lowRow)) return null;
  if (!isSurfaceTile(roomData, startCol + 1, lowRow)) return null;
  if (!isSurfaceTile(roomData, startCol + 2, highRow)) return null;
  if (isSolid(getTile(roomData, startCol, highRow))) return null;
  if (isSolid(getTile(roomData, startCol + 1, highRow))) return null;
  return {
    x0: startCol * TILE_SIZE,
    x1: (startCol + 2) * TILE_SIZE,
    yLeft: lowRow * TILE_SIZE,
    yRight: highRow * TILE_SIZE,
    dir: 'upRight',
  };
}

function buildUpLeftSlope(roomData: number[][], startCol: number, lowRow: number): SlopeSegment2x1 | null {
  const highRow = lowRow - 1;
  if (!isSurfaceTile(roomData, startCol - 1, highRow)) return null;
  if (!isSurfaceTile(roomData, startCol, lowRow)) return null;
  if (!isSurfaceTile(roomData, startCol + 1, lowRow)) return null;
  if (isSolid(getTile(roomData, startCol, highRow))) return null;
  if (isSolid(getTile(roomData, startCol + 1, highRow))) return null;
  return {
    x0: startCol * TILE_SIZE,
    x1: (startCol + 2) * TILE_SIZE,
    yLeft: highRow * TILE_SIZE,
    yRight: lowRow * TILE_SIZE,
    dir: 'upLeft',
  };
}

/**
 * Finds a player-only virtual 2x1 slope under a foot sample.
 *
 * The source IntGrid stays unchanged. A segment is inferred only when two
 * low flat surface cells lead into/out of a one-tile higher surface:
 *   - upRight: low, low, high
 *   - upLeft:  high, low, low
 */
export function findSlope2x1AtFoot(
  footX: number,
  feetY: number,
  roomData: number[][],
  snapDistancePx: number,
): SlopeSegment2x1 | null {
  const footCol = Math.floor(footX / TILE_SIZE);
  const feetRow = Math.floor(feetY / TILE_SIZE);
  let best: { slope: SlopeSegment2x1; distance: number } | null = null;

  for (let startCol = footCol - 2; startCol <= footCol; startCol++) {
    const x0 = startCol * TILE_SIZE;
    const x1 = (startCol + 2) * TILE_SIZE;
    if (footX < x0 || footX > x1) continue;

    for (let lowRow = feetRow - 2; lowRow <= feetRow + 2; lowRow++) {
      const candidates = [
        buildUpRightSlope(roomData, startCol, lowRow),
        buildUpLeftSlope(roomData, startCol, lowRow),
      ];
      for (const slope of candidates) {
        if (!slope) continue;
        const floorY = slopeFloorYAt(slope, footX);
        const distance = Math.abs(feetY - floorY);
        if (distance > snapDistancePx) continue;
        if (!best || distance < best.distance) best = { slope, distance };
      }
    }
  }

  return best?.slope ?? null;
}

/**
 * Debug 전용 — 셀 범위 [c0..c1] × [r0..r1] 와 겹치는 모든 가상 2x1 슬로프 세그먼트를
 * 수집한다. 각 (startCol, lowRow) 조합당 upRight/upLeft 후보를 1회씩만 시도하므로
 * 중복은 발생하지 않는다. CollisionDebugOverlay 의 경사면 표시에 사용.
 */
export function collectSlopes2x1(
  roomData: number[][], c0: number, r0: number, c1: number, r1: number,
): SlopeSegment2x1[] {
  const out: SlopeSegment2x1[] = [];
  // startCol 은 세그먼트 좌측 셀 — 좌측 2칸 패딩으로 부분 가시 슬로프도 포함.
  for (let startCol = c0 - 2; startCol <= c1; startCol++) {
    for (let lowRow = r0 - 1; lowRow <= r1 + 1; lowRow++) {
      const up = buildUpRightSlope(roomData, startCol, lowRow);
      if (up) out.push(up);
      const ul = buildUpLeftSlope(roomData, startCol, lowRow);
      if (ul) out.push(ul);
    }
  }
  return out;
}

function overlapsSolidAabb(
  x: number, y: number, width: number, height: number,
  roomData: number[][],
): boolean {
  const left = Math.floor(x / TILE_SIZE);
  const right = Math.floor((x + width - 1) / TILE_SIZE);
  const top = Math.floor(y / TILE_SIZE);
  const bottom = Math.floor((y + height - 1) / TILE_SIZE);
  for (let row = top; row <= bottom; row++) {
    for (let col = left; col <= right; col++) {
      if (isSolid(getTile(roomData, col, row))) return true;
    }
  }
  return false;
}

function isSlopeSupportCell(slope: SlopeSegment2x1, col: number, row: number): boolean {
  const startCol = Math.floor(slope.x0 / TILE_SIZE);
  const endCol = Math.floor(slope.x1 / TILE_SIZE);
  const lowRow = Math.floor(Math.max(slope.yLeft, slope.yRight) / TILE_SIZE);
  const highRow = Math.floor(Math.min(slope.yLeft, slope.yRight) / TILE_SIZE);

  if (row === lowRow && col >= startCol && col <= endCol - 1) return true;
  if (slope.dir === 'upRight' && row === highRow && col === endCol) return true;
  if (slope.dir === 'upLeft' && row === highRow && col === startCol - 1) return true;
  return false;
}

export function isSlope2x1SupportCell(roomData: number[][], col: number, row: number): boolean {
  for (let startCol = col - 2; startCol <= col + 1; startCol++) {
    for (let lowRow = row; lowRow <= row + 1; lowRow++) {
      const candidates = [
        buildUpRightSlope(roomData, startCol, lowRow),
        buildUpLeftSlope(roomData, startCol, lowRow),
      ];
      for (const slope of candidates) {
        if (slope && isSlopeSupportCell(slope, col, row)) return true;
      }
    }
  }
  return false;
}

export function hasGroundSupportAtFoot(
  footX: number,
  feetY: number,
  roomData: number[][],
  ignoreOneWay = false,
  slopeSnapDistancePx = 4,
): boolean {
  if (findSlope2x1AtFoot(footX, feetY, roomData, slopeSnapDistancePx)) return true;
  const col = Math.floor(footX / TILE_SIZE);
  const row = Math.floor(feetY / TILE_SIZE);
  const tile = getTile(roomData, col, row);
  return isSolid(tile) || (isOneWay(tile) && !ignoreOneWay);
}

function overlapsSolidAabbWithSlopeSupport(
  x: number, y: number, width: number, height: number,
  roomData: number[][], slope: SlopeSegment2x1,
): boolean {
  const left = Math.floor(x / TILE_SIZE);
  const right = Math.floor((x + width - 1) / TILE_SIZE);
  const top = Math.floor(y / TILE_SIZE);
  const bottom = Math.floor((y + height - 1) / TILE_SIZE);
  for (let row = top; row <= bottom; row++) {
    for (let col = left; col <= right; col++) {
      if (!isSolid(getTile(roomData, col, row))) continue;
      if (isSlopeSupportCell(slope, col, row)) continue;
      return true;
    }
  }
  return false;
}

export function resolveXPixelStepWithSlopes2x1(
  x: number, y: number, width: number, height: number,
  dx: number, roomData: number[][], slopeSnapDistancePx: number,
): { x: number; y: number; collided: boolean; moved: number; onSlope: boolean } {
  const move = Math.trunc(dx);
  if (move === 0) {
    const footX = x + width / 2;
    const slope = findSlope2x1AtFoot(footX, y + height, roomData, slopeSnapDistancePx);
    if (!slope) return { x, y, collided: false, moved: 0, onSlope: false };
    const slopeY = slopeFloorYAt(slope, footX) - height;
    if (overlapsSolidAabbWithSlopeSupport(x, slopeY, width, height, roomData, slope)) {
      return { x, y, collided: false, moved: 0, onSlope: false };
    }
    return { x, y: slopeY, collided: false, moved: 0, onSlope: true };
  }

  const sign = move > 0 ? 1 : -1;
  let curX = x;
  let curY = y;
  let remaining = Math.abs(move);
  let onSlope = false;

  while (remaining > 0) {
    const nextX = curX + sign;
    let nextY = curY;
    const footX = sign > 0 ? nextX + width : nextX;
    const slope = findSlope2x1AtFoot(footX, curY + height, roomData, slopeSnapDistancePx);
    if (slope) nextY = slopeFloorYAt(slope, footX) - height;

    const blocked = slope
      ? overlapsSolidAabbWithSlopeSupport(nextX, nextY, width, height, roomData, slope)
      : overlapsSolidAabb(nextX, nextY, width, height, roomData);
    if (blocked) {
      return { x: curX, y: curY, collided: true, moved: curX - x, onSlope };
    }

    curX = nextX;
    curY = nextY;
    onSlope = onSlope || !!slope;
    remaining--;
  }

  return { x: curX, y: curY, collided: false, moved: curX - x, onSlope };
}

export function resolveYPixelStepWithSlopes2x1(
  x: number, y: number, width: number, height: number,
  dy: number, roomData: number[][], ignoreOneWay = false, slopeSnapDistancePx = 2,
): { y: number; grounded: boolean; collided: boolean; moved: number; onSlope: boolean } {
  const move = Math.trunc(dy);
  const footX = x + width / 2;

  if (move === 0) {
    const slope = findSlope2x1AtFoot(footX, y + height, roomData, slopeSnapDistancePx);
    if (slope) {
      const slopeY = slopeFloorYAt(slope, footX) - height;
      if (!overlapsSolidAabbWithSlopeSupport(x, slopeY, width, height, roomData, slope)) {
        return { y: slopeY, grounded: true, collided: false, moved: slopeY - y, onSlope: true };
      }
    }
    const grounded = resolveY(x, y, width, height, 0, roomData, ignoreOneWay).grounded;
    return { y, grounded, collided: false, moved: 0, onSlope: false };
  }

  if (move < 0) {
    const result = resolveYPixelStep(x, y, width, height, dy, roomData, ignoreOneWay);
    return { ...result, onSlope: false };
  }

  let curY = y;
  let remaining = move;

  while (remaining > 0) {
    const nextY = curY + 1;
    const feetBefore = curY + height;
    const feetAfter = nextY + height;
    const slope = findSlope2x1AtFoot(footX, feetAfter, roomData, slopeSnapDistancePx);
    if (slope) {
      const floorY = slopeFloorYAt(slope, footX);
      if (feetBefore <= floorY + 1 && feetAfter >= floorY) {
        const landedY = floorY - height;
        if (!overlapsSolidAabbWithSlopeSupport(x, landedY, width, height, roomData, slope)) {
          return { y: landedY, grounded: true, collided: true, moved: landedY - y, onSlope: true };
        }
      }
    }

    const leadY = nextY + height;
    const leftTile = Math.floor(x / TILE_SIZE);
    const rightTile = Math.floor((x + width - 1) / TILE_SIZE);
    const checkRow = Math.floor(leadY / TILE_SIZE);

    for (let col = leftTile; col <= rightTile; col++) {
      const tile = getTile(roomData, col, checkRow);

      if (isSolid(tile)) {
        const hitY = checkRow * TILE_SIZE - height;
        return { y: hitY, grounded: true, collided: true, moved: hitY - y, onSlope: false };
      }

      if (isOneWay(tile) && !ignoreOneWay) {
        const platformTop = checkRow * TILE_SIZE;
        if (feetBefore <= platformTop + 1 && feetAfter >= platformTop) {
          const landedY = platformTop - height;
          return { y: landedY, grounded: true, collided: true, moved: landedY - y, onSlope: false };
        }
      }
    }

    curY = nextY;
    remaining--;
  }

  return { y: curY, grounded: false, collided: false, moved: curY - y, onSlope: false };
}

/**
 * Dash corner correction — 대시 중 수평 진행이 벽에 막힐 때 세로로 살짝 밀어 통과시키는 보정.
 *
 * 대시는 수평(vy=0) 으로 전진하므로, 진행 방향 leading 컬럼의 플레이어 세로 스팬에
 * 솔리드가 "한쪽 끝(top-only or bottom-only)" 만 있고 overlap 이 tolerance 이내면
 * 그 반대 방향으로 밀어 지나가게 한다. 양쪽 다 막혔거나 중간이 막혀 있으면 미동작.
 *
 * 적용 대상: 대시 상태 전용. 일반 수평 이동에는 tryLedgeSnap 을 쓴다 (방향이 편도).
 * Returns: 보정된 y, 또는 null (보정 불가).
 */
export function tryDashCornerCorrect(
  x: number, y: number, width: number, height: number,
  vx: number, roomData: number[][], tolerance: number,
): number | null {
  if (vx === 0) return null;
  const newX = x + vx;
  const leadX = vx > 0 ? newX + width : newX;
  const checkCol = Math.floor(leadX / TILE_SIZE);
  const topRow = Math.floor(y / TILE_SIZE);
  const bottomRow = Math.floor((y + height - 1) / TILE_SIZE);
  if (topRow === bottomRow) return null; // 단일 행 스팬은 의미 없음

  const topSolid = isSolid(getTile(roomData, checkCol, topRow));
  const bottomSolid = isSolid(getTile(roomData, checkCol, bottomRow));

  // 머리 쪽만 막힘 → 아래로 밀어 통과.
  if (topSolid && !bottomSolid) {
    const obstacleBottom = (topRow + 1) * TILE_SIZE;
    const overlap = obstacleBottom - y;
    if (overlap > 0 && overlap <= tolerance) {
      const ny = obstacleBottom;
      // 보정 후 leading 컬럼의 새 세로 스팬이 완전히 비어 있는지 검증.
      const nTop = Math.floor(ny / TILE_SIZE);
      const nBot = Math.floor((ny + height - 1) / TILE_SIZE);
      for (let row = nTop; row <= nBot; row++) {
        if (isSolid(getTile(roomData, checkCol, row))) return null;
      }
      return ny;
    }
  }
  // 발 쪽만 막힘 → 위로 밀어 통과.
  if (bottomSolid && !topSolid) {
    const obstacleTop = bottomRow * TILE_SIZE;
    const overlap = (y + height) - obstacleTop;
    if (overlap > 0 && overlap <= tolerance) {
      const ny = obstacleTop - height;
      const nTop = Math.floor(ny / TILE_SIZE);
      const nBot = Math.floor((ny + height - 1) / TILE_SIZE);
      for (let row = nTop; row <= nBot; row++) {
        if (isSolid(getTile(roomData, checkCol, row))) return null;
      }
      return ny;
    }
  }
  return null;
}

export function getTile(roomData: number[][], col: number, row: number): number {
  if (row < 0 || row >= roomData.length || col < 0 || col >= (roomData[0]?.length ?? 0)) {
    return 1; // out of bounds = solid wall
  }
  return roomData[row][col];
}
