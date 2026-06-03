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
  item: ItemInstance | null = null;
  deployment: ItemWorldEntrySequence | null = null;
  pendingGhostTunnelParams: PendingGhostTunnelParams | null = null;
  worldVisualsReleased = false;
  inTunnel = false;
  preTunnelLevelId: string | null = null;

  destroyDeployment(): void {
    this.deployment?.destroy();
    this.deployment = null;
  }

  clearItem(): void {
    this.item = null;
  }
}
