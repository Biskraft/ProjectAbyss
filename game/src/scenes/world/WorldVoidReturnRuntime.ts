import { aabbOverlap, isOneWay, isSolid, TILE_AIR, TILE_WALL } from '@core/Physics';
import type { GiantBuilder } from '@entities/GiantBuilder';
import type { Player } from '@entities/Player';
import type { LdtkLevel } from '@level/LdtkLoader';
import { getDistanceSquared } from '@scenes/shared/DistanceHelpers';
import { placePlayerAt } from '@scenes/shared/PlayerPlacementHelpers';
import type { Game } from '../../Game';

const TILE_SIZE = 16;

interface WorldVoidReturnRuntimeDeps {
  game: Game;
  getPlayer: () => Player;
  getCollisionGrid: () => number[][];
  getCurrentLevel: () => LdtkLevel | null;
  getActiveBuilder: () => GiantBuilder | null;
  getBuilderStampSet: () => Set<number>;
  getLastSafePosition: () => { x: number; y: number };
  loadLevel: (levelId: string, enterDirection: 'up' | 'down' | 'left' | 'right') => void;
}

export class WorldVoidReturnRuntime {
  constructor(private readonly deps: WorldVoidReturnRuntimeDeps) {}

  resolveReturnPoint(): { x: number; y: number } {
    const { x, y } = this.deps.getLastSafePosition();
    if (this.isWorldFloorUnderPlayerAt(x, y)) return { x, y };

    const nearest = this.findNearestWorldFloorSpawn(x, y);
    if (nearest) return nearest;

    const player = this.deps.getPlayer();
    const playerEntity = this.deps.getCurrentLevel()?.entities.find((entity) => entity.type === 'Player');
    if (playerEntity) {
      return { x: playerEntity.px[0], y: playerEntity.px[1] - player.height };
    }
    return { x: player.x, y: player.y };
  }

  isWorldFloorUnderPlayerAt(x: number, y: number): boolean {
    const player = this.deps.getPlayer();
    if (this.isAabbInsideActiveBuilderVolume(x, y, player.width, player.height)) return false;

    const grid = this.deps.getCollisionGrid();
    const gridW = grid[0]?.length ?? 0;
    if (gridW <= 0) return false;

    const stampSet = this.deps.getBuilderStampSet();
    const footRow = Math.floor((y + player.height + 1) / TILE_SIZE);
    const leftCol = Math.floor(x / TILE_SIZE);
    const rightCol = Math.floor((x + player.width - 1) / TILE_SIZE);
    for (let col = leftCol; col <= rightCol; col++) {
      if (this.isWorldFloorCell(col, footRow, stampSet)) return true;
    }
    return false;
  }

  teleportTo(levelId: string, x: number, y: number): void {
    const currentLevel = this.deps.getCurrentLevel();
    if (currentLevel?.identifier !== levelId) {
      this.deps.loadLevel(levelId, 'down');
    }

    const player = this.deps.getPlayer();
    player.attackInputEnabled = true;
    player.lastSafeX = x;
    player.lastSafeY = y;
    placePlayerAt(player, x, y, {
      collisionGrid: this.deps.getCollisionGrid(),
      resetVelocity: true,
      savePreviousPosition: true,
    });
    player.forceGrounded(false, 'void-fade');
    if (player.fsm.currentState !== 'idle') {
      try { player.fsm.transition('idle'); } catch {}
    }
    this.deps.game.camera.snap(
      player.x + player.width / 2,
      player.y + player.height / 2,
    );
  }

  private findNearestWorldFloorSpawn(x: number, y: number): { x: number; y: number } | null {
    const grid = this.deps.getCollisionGrid();
    const gridH = grid.length;
    const gridW = grid[0]?.length ?? 0;
    if (gridH <= 0 || gridW <= 0) return null;

    const player = this.deps.getPlayer();
    const stampSet = this.deps.getBuilderStampSet();
    const targetX = x + player.width / 2;
    const targetY = y + player.height;
    let best: { x: number; y: number; d2: number } | null = null;

    for (let row = 0; row < gridH; row++) {
      for (let col = 0; col < gridW; col++) {
        if (!this.isWorldFloorCell(col, row, stampSet)) continue;
        const candidateX = col * TILE_SIZE + TILE_SIZE / 2 - player.width / 2;
        const candidateY = row * TILE_SIZE - player.height;
        if (this.isAabbInsideActiveBuilderVolume(candidateX, candidateY, player.width, player.height)) continue;
        if (!this.isWorldBodyClearAt(candidateX, candidateY, stampSet)) continue;

        const d2 = getDistanceSquared(candidateX + player.width / 2, candidateY + player.height, targetX, targetY);
        if (!best || d2 < best.d2) best = { x: candidateX, y: candidateY, d2 };
      }
    }

    return best ? { x: best.x, y: best.y } : null;
  }

  private isWorldFloorCell(col: number, row: number, builderStampSet: Set<number>): boolean {
    const grid = this.deps.getCollisionGrid();
    const gridW = grid[0]?.length ?? 0;
    if (gridW <= 0) return false;
    if (row < 0 || row >= grid.length || col < 0 || col >= gridW) return false;
    if (builderStampSet.has(row * gridW + col)) return false;

    const tile = grid[row]?.[col] ?? TILE_AIR;
    return isSolid(tile) || isOneWay(tile);
  }

  private isWorldBodyClearAt(x: number, y: number, builderStampSet: Set<number>): boolean {
    const player = this.deps.getPlayer();
    const grid = this.deps.getCollisionGrid();
    const gridW = grid[0]?.length ?? 0;
    if (gridW <= 0) return false;

    const leftCol = Math.floor(x / TILE_SIZE);
    const rightCol = Math.floor((x + player.width - 1) / TILE_SIZE);
    const topRow = Math.floor(y / TILE_SIZE);
    const bottomRow = Math.floor((y + player.height - 1) / TILE_SIZE);
    for (let row = topRow; row <= bottomRow; row++) {
      for (let col = leftCol; col <= rightCol; col++) {
        if (row < 0 || row >= grid.length || col < 0 || col >= gridW) return false;
        if (builderStampSet.has(row * gridW + col)) continue;
        const tile = grid[row]?.[col] ?? TILE_WALL;
        if (isSolid(tile)) return false;
      }
    }
    return true;
  }

  private isAabbInsideActiveBuilderVolume(x: number, y: number, width: number, height: number): boolean {
    const builder = this.deps.getActiveBuilder();
    if (!builder) return false;

    const bx = builder.container.x;
    const by = builder.container.y;
    const bw = builder.widthTiles * TILE_SIZE;
    const bh = builder.heightTiles * TILE_SIZE;
    return aabbOverlap(
      { x, y, width, height },
      { x: bx, y: by, width: bw, height: bh },
    );
  }
}
