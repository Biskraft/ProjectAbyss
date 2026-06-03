import { isOneWay, isSolid, TILE_WALL } from '@core/Physics';
import type { GiantBuilder } from '@entities/GiantBuilder';
import type { Player } from '@entities/Player';

const TILE_SIZE = 16;

export interface WorldBuilderPlayerCollisionDeps {
  getPlayer: () => Player;
  getCollisionGrid: () => number[][];
  getActiveBuilder: () => GiantBuilder | null;
  /** Cells stamped into the host grid by the active builder (WorldBuilderStampRuntime). */
  getStampSet: () => Set<number>;
  /** WorldBuilderPlayerStateRuntime one-way drop-through grace window. */
  hasOneWayDropThroughGrace: () => boolean;
  /** True while an item-world entry cinematic (dive/portal/fill/fade/deploy) plays. */
  isEntryCinematicActive: () => boolean;
}

/**
 * Player↔GiantBuilder collision coupling, extracted from LdtkWorldScene.
 *
 * Resolves the moving carrier's effect on the rider: carrying the player by
 * whole-tile stamp deltas, snapping to the builder's tile-quantized surface,
 * and nudging the player out of solids stamped underneath them. Behaviour is
 * a verbatim move from the scene — all player/grid/builder access flows
 * through the injected getters, preserving reference (mutation) semantics.
 */
export class WorldBuilderPlayerCollisionRuntime {
  constructor(private readonly deps: WorldBuilderPlayerCollisionDeps) {}

  private get player(): Player {
    return this.deps.getPlayer();
  }

  private get collisionGrid(): number[][] {
    return this.deps.getCollisionGrid();
  }

  carryPlayerWithBuilderY(deltaY: number): void {
    // Drop-through 중에는 carrier가 플레이어를 끌어올리지 않는다. one-way platform
    // 위에서 DOWN+JUMP로 빠질 때 dropThroughTimer가 살아있으면 carry를 건너뛴다.
    const player = this.player;
    if (player.dropThroughTimer > 0) return;
    const colOffX = (player.width - player.collisionW) / 2;
    const colOffY = player.height - player.collisionH;
    const x = player.x + colOffX;
    const y = player.y + colOffY;
    const w = player.collisionW;
    const h = player.collisionH;
    const nextY = y + deltaY;
    const leadY = deltaY > 0 ? nextY + h : nextY;
    const checkRow = Math.floor(leadY / TILE_SIZE);
    const leftCol = Math.floor(x / TILE_SIZE);
    const rightCol = Math.floor((x + w - 1) / TILE_SIZE);
    const stampSet = this.deps.getStampSet();

    let resolvedY = nextY;
    let collided = false;
    for (let col = leftCol; col <= rightCol; col++) {
      if (!this.isStaticSolidCell(col, checkRow, stampSet)) continue;
      resolvedY = deltaY > 0
        ? checkRow * TILE_SIZE - h
        : (checkRow + 1) * TILE_SIZE;
      collided = true;
      break;
    }

    const spriteY = resolvedY - colOffY;
    const applied = spriteY - player.y;
    if (Math.abs(applied) > 0.001) {
      player.y = spriteY;
      player.prevY += applied;
    }
    if (collided && deltaY < 0 && player.vy < 0) player.vy = 0;
  }

  snapPlayerToBuilderSurface(): boolean {
    const b = this.deps.getActiveBuilder();
    if (!b) return false;
    const player = this.player;
    // 아이템계 진입 연출 중에는 빌더 표면 스냅을 전부 끈다 (사용자 요청 2026-06-02).
    if (this.deps.isEntryCinematicActive()) return false;
    // A real jump should detach from the carrier. Snapping only while falling
    // or resting prevents the moving floor from stealing jump height.
    if (player.getVy() < -1) return false;
    // Drop-through 중이거나 one-way 유예 중이면 platform top으로 다시 끌어올리지
    // 않는다 — DOWN+JUMP로 의도적으로 빠지는 경우를 존중한다.
    if (player.dropThroughTimer > 0 || this.deps.hasOneWayDropThroughGrace()) return false;

    const originX = Math.round(b.container.x / 16);
    const originY = Math.round(b.container.y / 16);
    const leftCol = Math.max(0, Math.floor(player.x / 16) - originX);
    const rightCol = Math.min(b.widthTiles - 1, Math.floor((player.x + player.width - 1) / 16) - originX);
    if (rightCol < leftCol) return false;

    const feetY = player.y + player.height;
    const prevFeetY = player.prevY + player.height;
    let bestTopY: number | null = null;
    let bestDist = Infinity;
    for (let br = 0; br < b.heightTiles; br++) {
      for (let bc = leftCol; bc <= rightCol; bc++) {
        const tile = b.collisionGrid[br]?.[bc] ?? 0;
        if (!isSolid(tile) && !isOneWay(tile)) continue;
        const above = br > 0 ? (b.collisionGrid[br - 1]?.[bc] ?? 0) : 0;
        if (above !== 0) continue;
        const topY = (originY + br) * 16;
        if (isOneWay(tile)) {
          // Moving one-way platforms can cross the player's feet between
          // tile-stamp updates and the normal resolveY "feetBefore" test.
          // Accept the platform only from above/near-above, never during a
          // jump-up from below or an intentional drop-through.
          const cameFromAbove = prevFeetY <= topY + TILE_SIZE;
          const nearLandingBand = feetY >= topY - 2 && feetY <= topY + TILE_SIZE * 1.5;
          if (!cameFromAbove || !nearLandingBand) continue;
        }
        const dist = Math.abs(topY - feetY);
        if (dist < bestDist) {
          bestDist = dist;
          bestTopY = topY;
        }
      }
    }
    if (bestTopY === null || bestDist > 24) return false;

    const nextY = bestTopY - player.height;
    if (this.playerCollisionOverlapsSolidAt(player.x, nextY)) return false;
    const delta = nextY - player.y;
    if (Math.abs(delta) > 0.001) {
      player.y = nextY;
      player.prevY += delta;
    }
    if (player.vy > 0) player.vy = 0;
    player.forceGrounded(false, 'builder-surface');
    return true;
  }

  playerCollisionOverlapsSolidAt(playerX: number, playerY: number): boolean {
    const player = this.player;
    const colOffX = (player.width - player.collisionW) / 2;
    const colOffY = player.height - player.collisionH;
    const x = playerX + colOffX;
    const y = playerY + colOffY;
    const w = player.collisionW;
    const h = player.collisionH;
    const leftCol = Math.floor(x / TILE_SIZE);
    const rightCol = Math.floor((x + w - 1) / TILE_SIZE);
    const topRow = Math.floor(y / TILE_SIZE);
    const bottomRow = Math.floor((y + h - 1) / TILE_SIZE);
    for (let row = topRow; row <= bottomRow; row++) {
      for (let col = leftCol; col <= rightCol; col++) {
        if (isSolid(this.collisionGrid[row]?.[col] ?? TILE_WALL)) return true;
      }
    }
    return false;
  }

  private resolvePlayerSolidOverlap(
    preferredDirs: Array<{ x: number; y: number }>,
    maxDist = TILE_SIZE,
  ): boolean {
    const player = this.player;
    if (!this.playerCollisionOverlapsSolidAt(player.x, player.y)) return false;

    for (let dist = 1; dist <= maxDist; dist++) {
      for (const dir of preferredDirs) {
        const nextX = player.x + dir.x * dist;
        const nextY = player.y + dir.y * dist;
        if (this.playerCollisionOverlapsSolidAt(nextX, nextY)) continue;
        player.prevX += nextX - player.x;
        player.prevY += nextY - player.y;
        player.x = nextX;
        player.y = nextY;
        if (dir.y !== 0) player.vy = 0;
        return true;
      }
    }

    return false;
  }

  resolvePlayerSolidOverlapAfterBuilder(stampDeltaY: number): boolean {
    const verticalFirst = stampDeltaY < 0
      ? [{ x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: -1 }]
      : [{ x: 0, y: -1 }, { x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }];
    return this.resolvePlayerSolidOverlap(verticalFirst);
  }

  private isStaticSolidCell(col: number, row: number, builderStampSet: Set<number>): boolean {
    const gridW = this.collisionGrid[0]?.length ?? 0;
    if (gridW <= 0) return true;
    if (row < 0 || row >= this.collisionGrid.length || col < 0 || col >= gridW) return true;
    if (builderStampSet.has(row * gridW + col)) return false;
    return isSolid(this.collisionGrid[row]?.[col] ?? TILE_WALL);
  }

  /**
   * AABB overlap between the player and the builder's world-space rectangle.
   * Used for the camera override so it persists while the player is airborne
   * inside the builder (jumping, double-jumping, etc.).
   */
  isPlayerInBuilderVolume(): boolean {
    const b = this.deps.getActiveBuilder();
    if (!b) return false;
    const player = this.player;
    const bx = b.container.x;
    const by = b.container.y;
    const px = player.x;
    const py = player.y;
    return (
      px + player.width  > bx &&
      px                 < bx + b.widthPx &&
      py + player.height > by &&
      py                 < by + b.heightPx
    );
  }
}
