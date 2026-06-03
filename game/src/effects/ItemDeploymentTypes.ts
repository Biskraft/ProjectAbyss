export interface ItemDeploymentTunnelOpenOptions {
  scheduleGhost?: boolean;
  triggerDirectionalTrail?: boolean;
  ghostBirth?: {
    originX: number;
    originY: number;
    pivotX?: number;
    pivotY?: number;
    durationMs: number;
    revealAll?: boolean;
    entranceAtEnd?: boolean;
  };
}

export interface ItemDeploymentStreamWorldOptions {
  tunnelX: number;
  tunnelY: number;
  tunnelW: number;
  tunnelH: number;
  originX: number;
  originY: number;
}
