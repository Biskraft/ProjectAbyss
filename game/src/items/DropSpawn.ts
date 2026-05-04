import { isSolid } from '@core/Physics';

const TILE_SIZE = 16;

function isAabbClear(
  x: number,
  y: number,
  width: number,
  height: number,
  roomData: number[][],
): boolean {
  if (roomData.length === 0) return true;
  const left = Math.floor(x / TILE_SIZE);
  const right = Math.floor((x + width - 1) / TILE_SIZE);
  const top = Math.floor(y / TILE_SIZE);
  const bottom = Math.floor((y + height - 1) / TILE_SIZE);

  for (let row = top; row <= bottom; row++) {
    for (let col = left; col <= right; col++) {
      if (row < 0 || row >= roomData.length || col < 0 || col >= (roomData[0]?.length ?? 0)) {
        return false;
      }
      if (isSolid(roomData[row][col])) return false;
    }
  }
  return true;
}

function findClearAabb(
  x: number,
  y: number,
  width: number,
  height: number,
  roomData: number[][],
): { x: number; y: number } {
  if (isAabbClear(x, y, width, height, roomData)) return { x, y };

  const offsets: Array<{ dx: number; dy: number }> = [];
  for (const dy of [0, -8, -16, -24, -32, 8, 16]) {
    for (const dx of [0, -8, 8, -16, 16, -24, 24, -32, 32, -48, 48]) {
      offsets.push({ dx, dy });
    }
  }
  offsets.sort((a, b) => {
    const da = Math.abs(a.dx) + Math.abs(a.dy) * 1.4;
    const db = Math.abs(b.dx) + Math.abs(b.dy) * 1.4;
    return da - db;
  });

  for (const { dx, dy } of offsets) {
    const nx = x + dx;
    const ny = y + dy;
    if (isAabbClear(nx, ny, width, height, roomData)) return { x: nx, y: ny };
  }
  return { x, y };
}

export function resolveItemDropSpawn(
  x: number,
  floorY: number,
  roomData: number[][],
): { x: number; y: number } {
  // ItemDropEntity stores its pickup center at (x, floorY - 8) with a 12x12 hitbox.
  const clear = findClearAabb(x - 6, floorY - 14, 12, 12, roomData);
  return { x: clear.x + 6, y: clear.y + 14 };
}

export function resolveBottomLeftPickupSpawn(
  x: number,
  floorY: number,
  roomData: number[][],
): { x: number; y: number } {
  const clear = findClearAabb(x, floorY - 16, 16, 16, roomData);
  return { x: clear.x, y: clear.y + 16 };
}
