import type { Anvil } from '@entities/Anvil';
import type { Player } from '@entities/Player';
import type { ItemDeploymentTunnelOpenOptions } from '@effects/ItemDeploymentTypes';
import { TILE_AIR } from '@core/Physics';
import type { ItemDeploymentTunnelRuntime } from './ItemDeploymentTunnelRuntime';
import type { ItemWorldGhostStreamRuntime } from './ItemWorldGhostStreamRuntime';
import type { ItemWorldGrowthSnapshotController } from './ItemWorldGrowthSnapshotController';
import type { PendingGhostTunnelParams } from './WorldItemWorldEntryState';
import type { WorldItemDeploymentCollisionRuntime } from './WorldItemDeploymentCollisionRuntime';
import { bindPlayerCollisionGrid } from '@scenes/shared/PlayerPlacementHelpers';

interface WorldItemDeploymentTunnelFlowRuntimeDeps {
  getAnvil: () => Anvil | null;
  getPlayer: () => Player;
  getCollisionGrid: () => number[][];
  getLevelRightPx: (fallback: number) => number;
  getGrowthSnapshot: () => ItemWorldGrowthSnapshotController;
  getGhostStream: () => ItemWorldGhostStreamRuntime;
  getTunnelRuntime: () => ItemDeploymentTunnelRuntime;
  getCollisionRuntime: () => WorldItemDeploymentCollisionRuntime;
  setPendingGhostTunnelParams: (params: PendingGhostTunnelParams | null) => void;
  rerenderTilemap: () => void;
}

export class WorldItemDeploymentTunnelFlowRuntime {
  constructor(private readonly deps: WorldItemDeploymentTunnelFlowRuntimeDeps) {}

  openDeploymentTunnel(
    x: number,
    y: number,
    w: number,
    h: number,
    options: ItemDeploymentTunnelOpenOptions = {},
  ): void {
    if (options.ghostBirth) {
      this.deps.getGrowthSnapshot().start(options.ghostBirth);
    }

    const ghostStream = this.deps.getGhostStream();
    ghostStream.clearPlatformStart();
    this.restoreGhostWorldCollision(false);

    const levelRight = this.deps.getLevelRightPx(x + w);
    const { clearW } = this.deps.getTunnelRuntime().clearTunnel({
      x,
      y,
      w,
      h,
      levelRightPx: levelRight,
    });

    if (options.triggerDirectionalTrail ?? true) {
      this.deps.getAnvil()?.triggerDirectionalTrail(clearW);
    }

    this.clearWorldCollisionForItemDeployment();

    if (options.scheduleGhost ?? true) {
      ghostStream.scheduleForTunnel(x, y, clearW, h, options.ghostBirth ?? null);
    } else if (!options.ghostBirth) {
      this.deps.setPendingGhostTunnelParams({ x, y, w: clearW, h, ghostBirth: options.ghostBirth ?? null });
    }
  }

  destroyGhostOverlay(restoreCollision: boolean, rerender = true): void {
    this.deps.getGrowthSnapshot().destroy(true);
    this.deps.getGhostStream().destroyOverlay();
    if (restoreCollision) {
      this.restoreGhostWorldCollision(rerender);
    } else {
      this.clearGhostStreamState(false);
    }
  }

  restoreGhostWorldCollision(rerender = true): void {
    this.deps.getGhostStream().restoreCollision();
    this.restoreWorldCollisionForItemDeployment();
    if (rerender) this.deps.rerenderTilemap();
  }

  clearWorldCollisionForItemDeployment(): void {
    const grid = this.deps.getCollisionGrid();
    if (!this.deps.getCollisionRuntime().clearWorld(grid, TILE_AIR)) return;
    bindPlayerCollisionGrid(this.deps.getPlayer(), grid);
  }

  restoreWorldCollisionForItemDeployment(): void {
    const grid = this.deps.getCollisionGrid();
    if (!this.deps.getCollisionRuntime().restore()) return;
    bindPlayerCollisionGrid(this.deps.getPlayer(), grid);
  }

  clearGhostStreamState(restoreGrid: boolean): void {
    this.deps.getGhostStream().clearStreamState(restoreGrid);
  }

  restoreDeploymentTunnel(rerender = true): void {
    this.deps.getTunnelRuntime().restore(rerender);
  }
}
