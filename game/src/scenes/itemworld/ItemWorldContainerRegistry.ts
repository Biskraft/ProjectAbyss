import type { Player } from '@entities/Player';
import type { ThrowableContainer } from '@entities/ThrowableContainer';

const CONTAINER_SOLID_TILES = new Set([1, 3, 7, 9, 12, 15]);
const CONTAINER_FLUID_TILES = new Set([2, 6, 8, 11, 13, 20]);

export class ItemWorldContainerRegistry {
  readonly containers: ThrowableContainer[] = [];

  clear(): void {
    for (const container of this.containers) container.destroy();
    this.containers.length = 0;
  }

  reset(): void {
    this.containers.length = 0;
  }

  settleAll(fullGrid: number[][]): void {
    const sorted = [...this.containers].sort((a, b) => b.y - a.y);
    for (const container of sorted) {
      if (container.skipSettle) continue;
      container.settleAtSpawn(
        (gx, gy) => this.isSolidCellFor(container, fullGrid, gx, gy),
        this.containers,
        1024,
        (gx, gy) => this.isFluidCell(fullGrid, gx, gy),
      );
    }
  }

  isPlayerStandingOnTop(player: Player): boolean {
    const feetY = player.y + player.height;
    const prevFeetY = player.prevY + player.height;
    for (const container of this.containers) {
      if (container.destroyed || container.held) continue;
      const cx0 = container.colX;
      const cx1 = container.colX + container.colW;
      const topY = container.colY;
      const horizontallySupported = player.x + player.width > cx0 + 1 && player.x < cx1 - 1;
      if (!horizontallySupported) continue;
      const feetAtTop = feetY >= topY - 2 && feetY <= topY + 2;
      const cameFromAbove = prevFeetY <= topY + 4;
      if (feetAtTop && cameFromAbove && player.getVy() >= -1) return true;
    }
    return false;
  }

  private isSolidCellFor(container: ThrowableContainer, fullGrid: number[][], gx: number, gy: number): boolean {
    const tile = fullGrid[gy]?.[gx] ?? 0;
    if (CONTAINER_SOLID_TILES.has(tile)) return true;
    return container.isWoodFamily() && this.isFluidCell(fullGrid, gx, gy);
  }

  private isFluidCell(fullGrid: number[][], gx: number, gy: number): boolean {
    return CONTAINER_FLUID_TILES.has(fullGrid[gy]?.[gx] ?? 0);
  }
}
