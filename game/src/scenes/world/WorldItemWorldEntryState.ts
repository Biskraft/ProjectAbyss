import type { ItemWorldEntrySequence } from '@effects/ItemWorldEntrySequence';
import type { ItemDeploymentTunnelOpenOptions } from '@effects/ItemDeploymentTypes';
import type { ItemInstance } from '@items/ItemInstance';

type GhostBirthOptions = NonNullable<ItemDeploymentTunnelOpenOptions['ghostBirth']>;

export interface PendingGhostTunnelParams {
  x: number;
  y: number;
  w: number;
  h: number;
  ghostBirth?: GhostBirthOptions | null;
}

export class WorldItemWorldEntryState {
  private item: ItemInstance | null = null;
  private deployment: ItemWorldEntrySequence | null = null;
  private pendingGhostTunnelParams: PendingGhostTunnelParams | null = null;
  private worldVisualsReleased = false;
  private inTunnel = false;
  private preTunnelLevelId: string | null = null;

  setDeployment(deployment: ItemWorldEntrySequence | null): void {
    this.deployment = deployment;
  }

  isDeploymentActive(): boolean {
    return !!this.deployment?.isActive;
  }

  isDeploymentBlocking(): boolean {
    return this.deployment?.isBlocking ?? false;
  }

  isDeploymentGrowing(): boolean {
    return this.deployment?.isGrowing ?? false;
  }

  updateDeployment(dt: number): void {
    this.deployment?.update(dt);
  }

  releaseDeploymentBirthPieces(): void {
    this.deployment?.releaseItemBirthPieces();
  }

  setInTunnel(inTunnel: boolean): void {
    this.inTunnel = inTunnel;
  }

  isInTunnel(): boolean {
    return this.inTunnel;
  }

  setPreTunnelLevelId(levelId: string | null): void {
    this.preTunnelLevelId = levelId;
  }

  getPreTunnelLevelId(): string | null {
    return this.preTunnelLevelId;
  }

  clearPreTunnelLevelId(): void {
    this.preTunnelLevelId = null;
  }

  setPendingGhostTunnelParams(params: PendingGhostTunnelParams | null): void {
    this.pendingGhostTunnelParams = params;
  }

  getPendingGhostTunnelParams(): PendingGhostTunnelParams | null {
    return this.pendingGhostTunnelParams;
  }

  setEntryItem(item: ItemInstance | null): void {
    this.item = item;
  }

  getEntryItem(): ItemInstance | null {
    return this.item;
  }

  consumeWorldVisualsReleased(): boolean {
    const released = this.worldVisualsReleased;
    this.worldVisualsReleased = false;
    return released;
  }

  setWorldVisualsReleased(released: boolean): void {
    this.worldVisualsReleased = released;
  }

  destroyDeployment(): void {
    this.deployment?.destroy();
    this.deployment = null;
  }

  clearItem(): void {
    this.item = null;
  }
}
