import { TILE_AIR, isSolid } from '@core/Physics';
import type { LdtkLevel } from '@level/LdtkLoader';
import { PRNG } from '@utils/PRNG';

export interface EntryCorridorComposite {
  grid: number[][];
  levels: LdtkLevel[];
  offsetsPx: number[];
  widthPx: number;
  heightPx: number;
}

interface FindEntryCorridorSpawnOptions {
  grid: number[][];
  tileSize: number;
  playerWidth: number;
  playerHeight: number;
  isAabbClear: (x: number, y: number, w: number, h: number) => boolean;
}

export const ENTRY_CORRIDOR_LEVEL_ID = 'ItemStratum_Corridor';
export const ENTRY_CORRIDOR_LEVEL_PREFIX = 'ItemStratum_Corridor_';
export const ENTRY_CORRIDOR_START_COL = 1;

const ENTRY_CORRIDOR_OPENING_COUNT = 3;
const ENTRY_CORRIDOR_RANDOM_TAIL_COUNT = 10;

export function isEntryCorridorTemplateIdentifier(identifier: string): boolean {
  return identifier === ENTRY_CORRIDOR_LEVEL_ID || getEntryCorridorLevelNumber(identifier) !== null;
}

export function getEntryCorridorLevelNumber(identifier: string): number | null {
  if (!identifier.startsWith(ENTRY_CORRIDOR_LEVEL_PREFIX)) return null;
  const raw = identifier.slice(ENTRY_CORRIDOR_LEVEL_PREFIX.length);
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function selectEntryCorridorLevels(
  ldtkTemplates: readonly LdtkLevel[],
  itemUid: number,
  stratumIndex: number,
): LdtkLevel[] {
  const numbered = ldtkTemplates
    .map(level => ({ level, num: getEntryCorridorLevelNumber(level.identifier) }))
    .filter((entry): entry is { level: LdtkLevel; num: number } => entry.num !== null);

  if (numbered.length === 0) {
    const legacy = ldtkTemplates.find(level => level.identifier === ENTRY_CORRIDOR_LEVEL_ID);
    return legacy ? [legacy] : [];
  }

  const byNum = new Map<number, LdtkLevel>();
  for (const entry of numbered) byNum.set(entry.num, entry.level);

  const rng = new PRNG(itemUid * 20011 + stratumIndex * 353 + 91);
  const opening = rng.shuffle(
    Array.from({ length: ENTRY_CORRIDOR_OPENING_COUNT }, (_, i) => i + 1)
      .map(num => byNum.get(num))
      .filter((level): level is LdtkLevel => !!level),
  );

  const randomPool = numbered
    .filter(entry => entry.num > ENTRY_CORRIDOR_OPENING_COUNT)
    .sort((a, b) => a.num - b.num)
    .map(entry => entry.level);
  const tail = pickEntryCorridorRandomTail(randomPool, rng);
  return [...opening, ...tail];
}

export function buildEntryCorridorComposite(levels: LdtkLevel[], tileSize: number): EntryCorridorComposite {
  const widths = levels.map(level => Math.max(
    1,
    Math.ceil(level.pxWid / tileSize),
    level.collisionGrid[0]?.length ?? 0,
  ));
  const heights = levels.map(level => Math.max(
    1,
    Math.ceil(level.pxHei / tileSize),
    level.collisionGrid.length,
  ));
  const totalCols = widths.reduce((sum, w) => sum + w, 0);
  const totalRows = Math.max(...heights);
  const grid = Array.from({ length: totalRows }, () => Array<number>(totalCols).fill(TILE_AIR));
  const offsetsPx: number[] = [];

  let offsetCol = 0;
  for (let i = 0; i < levels.length; i++) {
    const level = levels[i];
    const width = widths[i];
    offsetsPx.push(offsetCol * tileSize);
    for (let row = 0; row < heights[i]; row++) {
      const srcRow = level.collisionGrid[row];
      for (let col = 0; col < width; col++) {
        grid[row][offsetCol + col] = srcRow?.[col] ?? TILE_AIR;
      }
    }
    offsetCol += width;
  }

  return {
    grid,
    levels,
    offsetsPx,
    widthPx: totalCols * tileSize,
    heightPx: totalRows * tileSize,
  };
}

export function findEntryCorridorBottomExitY(grid: number[][], tileSize: number): number {
  return grid.length * tileSize;
}

export function findEntryCorridorLeftSpawn(options: FindEntryCorridorSpawnOptions): { x: number; y: number } {
  const { grid, tileSize, playerWidth, playerHeight, isAabbClear } = options;
  const gridW = grid[0]?.length ?? 0;
  const gridH = grid.length;
  const maxCol = Math.min(gridW - 1, ENTRY_CORRIDOR_START_COL + 5);

  for (let col = ENTRY_CORRIDOR_START_COL; col <= maxCol; col++) {
    for (let row = 1; row < gridH - 1; row++) {
      if (isSolid(grid[row][col]) || !isSolid(grid[row + 1][col])) continue;
      const centerX = col * tileSize + tileSize / 2;
      const floorY = (row + 1) * tileSize;
      const x = Math.round(centerX - playerWidth / 2);
      const y = Math.round(floorY - playerHeight - 2);
      if (isAabbClear(x, y, playerWidth, playerHeight)) {
        return { x, y };
      }
    }
  }

  const fallbackFloorY = Math.max(tileSize * 2, findEntryCorridorBottomExitY(grid, tileSize) - tileSize * 12);
  return {
    x: Math.round(ENTRY_CORRIDOR_START_COL * tileSize + tileSize / 2 - playerWidth / 2),
    y: Math.round(fallbackFloorY - playerHeight - 2),
  };
}

function pickEntryCorridorRandomTail(pool: LdtkLevel[], rng: PRNG): LdtkLevel[] {
  if (pool.length === 0) return [];
  const tail: LdtkLevel[] = [];
  while (tail.length < ENTRY_CORRIDOR_RANDOM_TAIL_COUNT) {
    const cycle = rng.shuffle([...pool]);
    for (const level of cycle) {
      tail.push(level);
      if (tail.length >= ENTRY_CORRIDOR_RANDOM_TAIL_COUNT) break;
    }
  }
  return tail;
}
