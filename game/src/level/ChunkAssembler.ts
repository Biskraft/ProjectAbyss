import { PRNG } from '@utils/PRNG';
import type { RoomCell } from './RoomGrid';

const TILE_SIZE = 16;
const ROOM_W = 60;
const ROOM_H = 34;

const DOOR_W = 3;
const DOOR_H = 4;

// Max jump height in tiles (player can jump 80px = 5 tiles)
const MAX_JUMP_TILES = 4; // leave 1 tile margin

export function assembleRoom(cell: RoomCell, rng: PRNG): number[][] {
  const room: number[][] = [];

  for (let y = 0; y < ROOM_H; y++) {
    room.push(new Array(ROOM_W).fill(0));
  }

  // Boundary walls
  for (let x = 0; x < ROOM_W; x++) {
    room[0][x] = 2;
    room[ROOM_H - 1][x] = 2;
  }
  for (let y = 0; y < ROOM_H; y++) {
    room[y][0] = 2;
    room[y][ROOM_W - 1] = 2;
  }

  // Main floor
  const floorY = ROOM_H - 3;
  for (let x = 1; x < ROOM_W - 1; x++) {
    room[floorY][x] = 1;
  }

  // Carve exits
  if (cell.exits.left) carveDoorLeft(room, floorY);
  if (cell.exits.right) carveDoorRight(room, floorY);
  if (cell.exits.down) carveDoorBottom(room, floorY);
  if (cell.exits.up) carveDoorTop(room);

  // Add reachable platforms (staircase style)
  addPlatforms(room, floorY, cell, rng);

  // Add small terrain features
  addTerrain(room, floorY, rng);

  return room;
}

function carveDoorLeft(room: number[][], floorY: number): void {
  const doorTop = floorY - DOOR_H;
  for (let y = doorTop; y < floorY; y++) {
    if (y > 0 && y < ROOM_H - 1) {
      room[y][0] = 0;
    }
  }
  room[floorY][0] = 1;
}

function carveDoorRight(room: number[][], floorY: number): void {
  const doorTop = floorY - DOOR_H;
  for (let y = doorTop; y < floorY; y++) {
    if (y > 0 && y < ROOM_H - 1) {
      room[y][ROOM_W - 1] = 0;
    }
  }
  room[floorY][ROOM_W - 1] = 1;
}

function carveDoorBottom(room: number[][], floorY: number): void {
  const centerX = Math.floor(ROOM_W / 2);
  const halfW = Math.floor(DOOR_W / 2);
  for (let x = centerX - halfW; x <= centerX + halfW; x++) {
    room[floorY][x] = 0;
    room[ROOM_H - 1][x] = 0;
    room[ROOM_H - 2][x] = 0;
  }
}

function carveDoorTop(room: number[][]): void {
  const centerX = Math.floor(ROOM_W / 2);
  const halfW = Math.floor(DOOR_W / 2);
  for (let x = centerX - halfW; x <= centerX + halfW; x++) {
    room[0][x] = 0;
    room[1][x] = 0;
  }
}

function addPlatforms(
  room: number[][],
  floorY: number,
  cell: RoomCell,
  rng: PRNG,
): void {
  // Generate platforms in a staircase pattern so ALL are reachable from below.
  // Each platform is MAX_JUMP_TILES above the previous standing surface.
  // Key rule: every platform on level N must have a reachable platform on level N-1
  // within horizontal jump range directly below it.
  const centerX = Math.floor(ROOM_W / 2);
  const numLevels = rng.nextInt(1, 3);

  // Track placed platforms per level for staircase validation
  const placedPlatforms: { x: number; len: number; y: number }[][] = [];

  for (let level = 0; level < numLevels; level++) {
    const platY = floorY - (level + 1) * MAX_JUMP_TILES;
    if (platY <= 3) break; // too close to ceiling

    const levelPlats: { x: number; len: number; y: number }[] = [];
    const numPlats = rng.nextInt(1, 3);

    for (let p = 0; p < numPlats; p++) {
      const platLen = rng.nextInt(5, 12);
      const section = ROOM_W / numPlats;
      const minX = Math.floor(2 + p * section);
      const maxX = Math.floor((p + 1) * section - platLen - 2);
      if (maxX <= minX) continue;

      const platX = rng.nextInt(minX, maxX);

      // Don't block door areas
      const blocksDown = cell.exits.down &&
        platX < centerX + 3 && platX + platLen > centerX - 3 &&
        platY >= floorY - 3;
      if (blocksDown) continue;

      // Place the platform
      for (let x = platX; x < platX + platLen && x < ROOM_W - 1; x++) {
        if (room[platY][x] === 0) {
          room[platY][x] = 3; // one-way platform
        }
      }
      levelPlats.push({ x: platX, len: platLen, y: platY });
    }

    // For level >= 1: ensure each platform has a stepping stone below it
    // so the player can always reach it from the floor
    if (level >= 1 && levelPlats.length > 0) {
      const prevY = floorY - level * MAX_JUMP_TILES; // one step below
      for (const plat of levelPlats) {
        // Check if there's already a platform below within horizontal reach
        const prevPlats = placedPlatforms[level - 1] || [];
        const hasSteppingStone = prevPlats.some(pp =>
          pp.x < plat.x + plat.len + 6 && pp.x + pp.len > plat.x - 6
        );

        if (!hasSteppingStone && prevY > 3) {
          // Place a small stepping stone platform below
          const stoneLen = rng.nextInt(4, 7);
          const stoneX = Math.max(2, Math.min(ROOM_W - stoneLen - 2,
            plat.x + Math.floor(plat.len / 2) - Math.floor(stoneLen / 2)));

          for (let x = stoneX; x < stoneX + stoneLen && x < ROOM_W - 1; x++) {
            if (room[prevY][x] === 0) {
              room[prevY][x] = 3;
            }
          }
          // Also add to previous level tracking
          if (!placedPlatforms[level - 1]) placedPlatforms[level - 1] = [];
          placedPlatforms[level - 1].push({ x: stoneX, len: stoneLen, y: prevY });
        }
      }
    }

    placedPlatforms.push(levelPlats);
  }
}

function addTerrain(room: number[][], floorY: number, rng: PRNG): void {
  const numWalls = rng.nextInt(0, 2);
  for (let i = 0; i < numWalls; i++) {
    const wallX = rng.nextInt(6, ROOM_W - 7);
    // Only 1 tile high walls — prevents blocking player movement
    const y = floorY - 1;
    if (y > 1 && room[y][wallX] === 0) {
      room[y][wallX] = 2;
    }
  }
}

export function getSpawnPosition(
  direction: 'left' | 'right' | 'up' | 'down',
): { x: number; y: number } {
  const floorY = (ROOM_H - 3) * TILE_SIZE;
  const playerH = 24;

  switch (direction) {
    case 'left':
      return { x: 2 * TILE_SIZE, y: floorY - playerH };
    case 'right':
      return { x: (ROOM_W - 3) * TILE_SIZE, y: floorY - playerH };
    case 'up':
      return { x: (ROOM_W / 2) * TILE_SIZE, y: 3 * TILE_SIZE };
    case 'down':
      return { x: (ROOM_W / 2) * TILE_SIZE, y: floorY - playerH };
  }
}

export function getDoorTriggers(cell: RoomCell): {
  direction: 'left' | 'right' | 'up' | 'down';
  x: number; y: number; width: number; height: number;
}[] {
  const triggers: {
    direction: 'left' | 'right' | 'up' | 'down';
    x: number; y: number; width: number; height: number;
  }[] = [];

  const floorY = (ROOM_H - 3) * TILE_SIZE;

  if (cell.exits.left) {
    triggers.push({
      direction: 'left',
      x: 0, y: floorY - DOOR_H * TILE_SIZE,
      width: TILE_SIZE, height: DOOR_H * TILE_SIZE,
    });
  }
  if (cell.exits.right) {
    triggers.push({
      direction: 'right',
      x: (ROOM_W - 1) * TILE_SIZE, y: floorY - DOOR_H * TILE_SIZE,
      width: TILE_SIZE, height: DOOR_H * TILE_SIZE,
    });
  }
  if (cell.exits.down) {
    const cx = Math.floor(ROOM_W / 2) * TILE_SIZE;
    triggers.push({
      direction: 'down',
      x: cx - TILE_SIZE, y: (ROOM_H - 1) * TILE_SIZE,
      width: DOOR_W * TILE_SIZE, height: TILE_SIZE,
    });
  }
  if (cell.exits.up) {
    const cx = Math.floor(ROOM_W / 2) * TILE_SIZE;
    triggers.push({
      direction: 'up',
      x: cx - TILE_SIZE, y: 0,
      width: DOOR_W * TILE_SIZE, height: TILE_SIZE,
    });
  }

  return triggers;
}
