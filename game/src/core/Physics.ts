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
 */
export function isSolid(tileId: number): boolean {
  return tileId === 1;
}

export function isOneWay(tileId: number): boolean {
  return tileId === 3;
}

export function isWater(tileId: number): boolean {
  return tileId === 2;
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
  if (vy === 0) return { y, grounded: false, collided: false };

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

function getTile(roomData: number[][], col: number, row: number): number {
  if (row < 0 || row >= roomData.length || col < 0 || col >= (roomData[0]?.length ?? 0)) {
    return 1; // out of bounds = solid wall
  }
  return roomData[row][col];
}
