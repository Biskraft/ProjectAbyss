import type { Container } from 'pixi.js';
import type { Player } from '@entities/Player';
import type { PendingGhostTunnelParams } from './WorldItemWorldEntryState';
import type { WorldDungeonAtmosphereRuntime } from './WorldDungeonAtmosphereRuntime';
import type { WorldFrozenReturnRuntime } from './WorldFrozenReturnRuntime';
import type { WorldFrozenSnapshotRuntime } from './WorldFrozenSnapshotRuntime';
import type { WorldLaserDesaturationRuntime } from './WorldLaserDesaturationRuntime';

interface WorldItemDeploymentAtmosphereFlowRuntimeDeps {
  getLaserDesaturationRuntime: () => WorldLaserDesaturationRuntime;
  getDungeonAtmosphereRuntime: () => WorldDungeonAtmosphereRuntime;
  getFrozenSnapshotRuntime: () => WorldFrozenSnapshotRuntime;
  getFrozenReturnRuntime: () => WorldFrozenReturnRuntime;
  getPlayer: () => Player | null | undefined;
  getEntityLayer: () => Container | null | undefined;
  getVividLayer: () => Container | null | undefined;
  restoreUiAfterDiveTransition: () => void;
  getPendingGhostTunnelParams: () => PendingGhostTunnelParams | null;
  clearPendingGhostTunnelParams: () => void;
  scheduleGhostTunnel: (params: PendingGhostTunnelParams) => void;
}

export class WorldItemDeploymentAtmosphereFlowRuntime {
  constructor(private readonly deps: WorldItemDeploymentAtmosphereFlowRuntimeDeps) {}

  setLaserDesaturation(active: boolean): void {
    const laser = this.deps.getLaserDesaturationRuntime();
    if (active) {
      laser.activate();
      this.activateDungeonAtmosphere();
      return;
    }

    laser.deactivate();
    const pendingGhostTunnelParams = this.deps.getPendingGhostTunnelParams();
    if (pendingGhostTunnelParams) {
      this.deps.scheduleGhostTunnel(pendingGhostTunnelParams);
      this.deps.clearPendingGhostTunnelParams();
    }

    this.deps.getDungeonAtmosphereRuntime().reapply();
  }

  activateDungeonAtmosphere(): void {
    if (!this.deps.getDungeonAtmosphereRuntime().activate()) return;
    this.deps.restoreUiAfterDiveTransition();

    const player = this.deps.getPlayer();
    const vividLayer = this.deps.getVividLayer();
    if (player && vividLayer) {
      const createdSnapshot = this.deps.getFrozenSnapshotRuntime().createFromPlayer(player, vividLayer);
      if (createdSnapshot) {
        this.deps.getFrozenReturnRuntime().attachSnapshotInteraction();
      }
    }

    const entityLayer = this.deps.getEntityLayer();
    if (player && vividLayer && entityLayer && player.container.parent === entityLayer) {
      vividLayer.addChild(player.container);
    }
  }

  deactivateDungeonAtmosphere(): void {
    this.deps.getDungeonAtmosphereRuntime().deactivate();
    this.deps.getFrozenReturnRuntime().clearInteraction();
    this.deps.getFrozenSnapshotRuntime().destroySnapshot();

    const player = this.deps.getPlayer();
    const vividLayer = this.deps.getVividLayer();
    const entityLayer = this.deps.getEntityLayer();
    if (player && vividLayer && entityLayer && player.container.parent === vividLayer) {
      entityLayer.addChild(player.container);
    }
  }
}
