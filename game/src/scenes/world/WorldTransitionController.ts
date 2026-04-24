import type { LdtkLoader, LdtkLevel } from '@level/LdtkLoader';

const TILE_SIZE = 16;

/**
 * Pure geometry and level-query helpers for LdtkWorldScene transitions.
 * Stateless — all data passed as parameters.
 */
export class WorldTransitionController {
  /**
   * Find the LDtk level that contains a Player entity.
   * Skips ItemTunnel / ItemWorld prefixed levels.
   */
  findPlayerSpawnLevel(loader: LdtkLoader, fallback: string): string {
    for (const id of loader.getLevelIds()) {
      if (id.startsWith('ItemTunnel') || id.startsWith('ItemWorld')) continue;
      const level = loader.getLevel(id);
      if (level?.entities.some((e) => e.type === 'Player')) {
        return id;
      }
    }
    return fallback;
  }

  /**
   * Snap an entity to the floor below a passage row.
   * Scans downward from passageRow to find the first solid tile that has
   * enough open space above it to fit the entity. This prevents the player
   * from spawning embedded in a wall when the passage is narrow (e.g. a
   * SecretWall opening that is only 1-2 tiles tall with solid wall above).
   */
  snapToFloor(
    grid: number[][],
    tileX: number,
    passageRow: number,
    entityHeight: number,
  ): number {
    const clampedX = Math.max(0, Math.min(tileX, (grid[0]?.length ?? 1) - 1));
    const entityTileH = Math.max(1, Math.ceil(entityHeight / TILE_SIZE));
    for (let row = passageRow; row < grid.length; row++) {
      if (grid[row][clampedX] !== 1) continue;
      // Check that the entityTileH cells directly above this floor are open.
      let fits = true;
      for (let r = row - 1; r >= row - entityTileH; r--) {
        if (r < 0) { fits = false; break; }
        if (grid[r][clampedX] === 1) { fits = false; break; }
      }
      if (fits) return row * TILE_SIZE - entityHeight;
    }
    return passageRow * TILE_SIZE;
  }

  /**
   * Find an open passage tile on the given edge of a collision grid.
   * Returns the tile index (row for left/right, col for up/down) closest to hintTile.
   */
  findEdgePassage(
    grid: number[][],
    edge: 'left' | 'right' | 'up' | 'down',
    hintTile = -1,
  ): number {
    const openTiles: number[] = [];
    const isPassable = (v: number) => v === 0 || v === 2;

    switch (edge) {
      case 'left':
        for (let row = 0; row < grid.length; row++) { if (isPassable(grid[row][0])) openTiles.push(row); }
        break;
      case 'right': {
        const col = (grid[0]?.length ?? 1) - 1;
        for (let row = 0; row < grid.length; row++) { if (isPassable(grid[row][col])) openTiles.push(row); }
        break;
      }
      case 'up':
        for (let col = 0; col < (grid[0]?.length ?? 0); col++) { if (isPassable(grid[0]?.[col])) openTiles.push(col); }
        break;
      case 'down': {
        const lastRow = grid[grid.length - 1] ?? [];
        for (let col = 0; col < lastRow.length; col++) { if (isPassable(lastRow[col])) openTiles.push(col); }
        break;
      }
    }

    if (openTiles.length === 0) {
      const len = (edge === 'left' || edge === 'right') ? grid.length : (grid[0]?.length ?? 1);
      return Math.floor(len / 2);
    }

    if (hintTile >= 0) {
      let best = openTiles[0];
      let bestDist = Math.abs(best - hintTile);
      for (const t of openTiles) {
        const d = Math.abs(t - hintTile);
        if (d < bestDist) { best = t; bestDist = d; }
      }
      return best;
    }

    return openTiles[0];
  }

  /**
   * Find a safe floor Y coordinate for an entity at the given tile column.
   * Scans from bottom upward to find the first solid tile.
   */
  findFloorY(grid: number[][], tileX: number, entityHeight: number): number {
    const clampedX = Math.max(0, Math.min(tileX, (grid[0]?.length ?? 1) - 1));
    for (let row = grid.length - 1; row >= 0; row--) {
      if (grid[row][clampedX] >= 1) {
        return row * TILE_SIZE - entityHeight;
      }
    }
    return (grid.length - 2) * TILE_SIZE - entityHeight;
  }

  /**
   * Determine which neighbor level lies in the given direction from the current level.
   * Returns the neighbor level ID or null.
   */
  getNeighborInDirection(
    loader: LdtkLoader,
    currentLevel: LdtkLevel,
    direction: 'left' | 'right' | 'up' | 'down',
    playerWorldX: number,
    playerWorldY: number,
    debugMode: boolean,
  ): string | null {
    const cur = currentLevel;
    const dirMap: Record<string, string> = { left: 'w', right: 'e', up: 'n', down: 's' };
    const ldtkDir = dirMap[direction];
    let candidates: string[] = cur.dirNeighbors[ldtkDir] ?? [];
    if (!debugMode) {
      candidates = candidates.filter(id => !id.startsWith('Debug_'));
    }

    if (candidates.length === 1) return candidates[0];

    if (candidates.length > 1) {
      let bestId: string | null = null;
      let bestDist = Infinity;
      for (const nId of candidates) {
        const nb = loader.getLevel(nId);
        if (!nb) continue;
        if (direction === 'left' || direction === 'right') {
          const nbMidY = nb.worldY + nb.pxHei / 2;
          const dist = Math.abs(playerWorldY - nbMidY);
          if (playerWorldY >= nb.worldY && playerWorldY <= nb.worldY + nb.pxHei) return nId;
          if (dist < bestDist) { bestDist = dist; bestId = nId; }
        } else {
          const nbMidX = nb.worldX + nb.pxWid / 2;
          const dist = Math.abs(playerWorldX - nbMidX);
          if (playerWorldX >= nb.worldX && playerWorldX <= nb.worldX + nb.pxWid) return nId;
          if (dist < bestDist) { bestDist = dist; bestId = nId; }
        }
      }
      return bestId ?? candidates[0];
    }

    // No dirNeighbors — geometric fallback
    const curRight = cur.worldX + cur.pxWid;
    const curBottom = cur.worldY + cur.pxHei;
    const T = 4;
    for (const nId of cur.neighbors) {
      const nb = loader.getLevel(nId);
      if (!nb) continue;
      const nbR = nb.worldX + nb.pxWid;
      const nbB = nb.worldY + nb.pxHei;
      let edge = false;
      if (direction === 'right') edge = Math.abs(nb.worldX - curRight) <= T && cur.worldY < nbB && curBottom > nb.worldY;
      if (direction === 'left')  edge = Math.abs(nbR - cur.worldX) <= T && cur.worldY < nbB && curBottom > nb.worldY;
      if (direction === 'down')  edge = Math.abs(nb.worldY - curBottom) <= T && cur.worldX < nbR && curRight > nb.worldX;
      if (direction === 'up')    edge = Math.abs(nbB - cur.worldY) <= T && cur.worldX < nbR && curRight > nb.worldX;
      if (edge) {
        if (direction === 'left' || direction === 'right') {
          if (playerWorldY >= nb.worldY && playerWorldY <= nb.worldY + nb.pxHei) return nId;
        } else {
          if (playerWorldX >= nb.worldX && playerWorldX <= nb.worldX + nb.pxWid) return nId;
        }
      }
    }
    return null;
  }
}
