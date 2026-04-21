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

const TILE_SIZE = 16;

/**
 * Tile types (shared by procedural + LDtk):
 *   0 = empty / passable
 *   1 = solid (wall/floor)
 *   2 = water (passable, applies water physics)
 *   3 = one-way platform
 *   4 = updraft (passable, applies strong upward wind)
 *   5 = spike (passable, contact = physical damage + respawn)
 *   6 = magma (passable, contact = burn DoT) [Phase 1]
 *   7 = ice (solid, zero friction surface) [Phase 1]
 *   8 = charged (passable, contact = shock DoT) [Phase 1]
 *   9 = breakable (solid, 1-hit destroy → air) [Phase 0]
 */
export function isSolid(tileId: number): boolean {
  return tileId === 1 || tileId === 7 || tileId === 9;
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

/**
 * Hazard/signal tiles whose original tileset color is load-bearing for
 * player communication (water blue, spike red/white, updraft upward wind,
 * magma orange, charged yellow). Rendered on a filter-free layer so the
 * PaletteSwapFilter does not wash them out into the biome palette.
 * Neutral structural tiles (solid wall, one-way, ice, breakable) stay on
 * the filtered wall layer.
 */
export function isSpecialVisualTile(tileId: number): boolean {
  return tileId === 2 || tileId === 4 || tileId === 5 || tileId === 6 || tileId === 8;
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

function getTile(roomData: number[][], col: number, row: number): number {
  if (row < 0 || row >= roomData.length || col < 0 || col >= (roomData[0]?.length ?? 0)) {
    return 1; // out of bounds = solid wall
  }
  return roomData[row][col];
}
