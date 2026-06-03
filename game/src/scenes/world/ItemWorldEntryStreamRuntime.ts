import { isOneWay, isSolid, TILE_AIR, TILE_SIZE, TILE_WALL } from '@core/Physics';
import type { LdtkLevel } from '@level/LdtkLoader';

export const ITEM_WORLD_ENTRY_SNAPSHOT_END_SCALE = 64;

const GHOST_X_OFFSET_TILES = -12;

export interface ItemWorldEntryBirthGeometry {
  originX: number;
  originY: number;
}

export interface ItemWorldGrowthProjection {
  elapsedMs: number;
  durationMs: number;
  pivotX: number;
  pivotY: number;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function growthScaleCurve(value: number): number {
  const t = clamp01(value);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function snapWorldCoordToTile(value: number): number {
  return Math.round(value / TILE_SIZE) * TILE_SIZE;
}

/**
 * Pure geometry for the official anvil -> Item World stream handoff.
 * Rendering and collision mutation stay in LdtkWorldScene for now; placement
 * and LDtk Player spawn resolution live here so the rules are testable.
 */
export class ItemWorldEntryStreamRuntime {
  resolveGhostPositionForSize(
    builtPxW: number,
    builtPxH: number,
    birth: ItemWorldEntryBirthGeometry,
  ): { x: number; y: number } {
    const x = snapWorldCoordToTile(
      birth.originX - builtPxW * 0.5 + GHOST_X_OFFSET_TILES * TILE_SIZE,
    );
    const y = snapWorldCoordToTile(birth.originY - builtPxH * 0.5);
    return {
      x: Math.max(0, x),
      y: Math.max(0, y),
    };
  }

  resolvePlayerStart(
    worldX: number,
    worldY: number,
    level: LdtkLevel | null | undefined,
    grid: number[][],
    playerHeight: number,
  ): { x: number; y: number } | null {
    const playerEntity = level?.entities.find(ent => ent.type === 'Player');
    if (playerEntity) {
      return {
        x: Math.round(worldX + playerEntity.px[0]),
        y: Math.round(worldY + playerEntity.px[1] - playerHeight),
      };
    }

    const col = Math.max(1, Math.floor((grid[0]?.length ?? 1) * 0.16));
    for (let row = 0; row < grid.length - 1; row++) {
      if ((grid[row]?.[col] ?? TILE_WALL) !== TILE_AIR) continue;
      const below = grid[row + 1]?.[col] ?? TILE_AIR;
      if (!isSolid(below) && !isOneWay(below)) continue;
      return {
        x: Math.round(worldX + col * TILE_SIZE),
        y: Math.round(worldY + (row + 1) * TILE_SIZE - playerHeight),
      };
    }
    return null;
  }

  projectPlayerStartDuringGrowth(
    start: { x: number; y: number },
    projection: ItemWorldGrowthProjection,
    player: { width: number; height: number },
  ): { x: number; y: number } {
    const t = clamp01(projection.elapsedMs / Math.max(1, projection.durationMs));
    const scale = (1 / ITEM_WORLD_ENTRY_SNAPSHOT_END_SCALE)
      + growthScaleCurve(t) * (1 - 1 / ITEM_WORLD_ENTRY_SNAPSHOT_END_SCALE);
    const footX = start.x + player.width / 2;
    const footY = start.y + player.height;
    return {
      x: Math.round(projection.pivotX + (footX - projection.pivotX) * scale - player.width / 2),
      y: Math.round(projection.pivotY + (footY - projection.pivotY) * scale - player.height),
    };
  }
}
