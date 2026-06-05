import { Container, Graphics } from 'pixi.js';
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
  getCollisionGrid: () => number[][];
  getFadeOverlay: () => Graphics | null;
  getParallaxContainer: () => Container | null | undefined;
  getReturnVisualTargets: () => Array<Container | null | undefined>;
  destroyTunnelVisuals: () => void;
  restoreDeploymentTunnel: (rerender: boolean) => void;
  destroyDeployment: () => void;
  clearInputLock: () => void;
  clearAnvilPlacement: () => void;
  restoreAnvilDeploymentState: () => void;
  clearItem: () => void;
  setPlayerRoomData: (grid: number[][]) => void;
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

  prepareWorldVisualsAfterItemWorldReturn(): void {
    this.deactivateDungeonAtmosphere();
    this.deps.destroyTunnelVisuals();
    this.deps.restoreDeploymentTunnel(true);
    this.deps.clearPendingGhostTunnelParams();

    const fadeOverlay = this.deps.getFadeOverlay();
    if (fadeOverlay) fadeOverlay.alpha = 0;

    const parallax = this.deps.getParallaxContainer();
    if (parallax) parallax.alpha = 1;

    const targets = this.deps.getReturnVisualTargets().filter((layer): layer is Container => !!layer);
    if (targets.length > 0) {
      this.deps.getDungeonAtmosphereRuntime().removeKnownFiltersFrom(targets);
      this.deps.getLaserDesaturationRuntime().removeFromTargets(targets);
    }
  }

  cancelFrozenReturnDeploymentState(): void {
    this.deps.destroyDeployment();
    this.deps.clearInputLock();
    this.deps.clearAnvilPlacement();
    this.deps.restoreAnvilDeploymentState();
    this.deps.clearItem();
    this.deps.destroyTunnelVisuals();
    this.deps.restoreDeploymentTunnel(true);
    this.deps.clearPendingGhostTunnelParams();
    this.deps.setPlayerRoomData(this.deps.getCollisionGrid());
  }
}
