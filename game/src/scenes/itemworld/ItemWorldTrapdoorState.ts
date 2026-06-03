interface TrapdoorLikePosition {
  x: number;
  y: number;
}

export interface ItemWorldTrapdoorDescentSnapshot {
  trapdoorX: number;
  trapdoorY: number;
  bossCellRow: number;
}

export class ItemWorldTrapdoorState {
  private descentToWorldValue = false;
  private pendingDescent: ItemWorldTrapdoorDescentSnapshot = {
    trapdoorX: 0,
    trapdoorY: 0,
    bossCellRow: 0,
  };

  get descentToWorld(): boolean {
    return this.descentToWorldValue;
  }

  get pendingDescentSnapshot(): ItemWorldTrapdoorDescentSnapshot {
    return this.pendingDescent;
  }

  setDescentToWorld(value: boolean): void {
    this.descentToWorldValue = value;
  }

  resetForStratum(): void {
    this.descentToWorldValue = false;
    this.pendingDescent = {
      trapdoorX: 0,
      trapdoorY: 0,
      bossCellRow: 0,
    };
  }

  captureDescentFromTrapdoor(trapdoor: TrapdoorLikePosition, roomHeightPx: number): void {
    this.pendingDescent = {
      trapdoorX: trapdoor.x,
      trapdoorY: trapdoor.y,
      bossCellRow: Math.max(0, Math.floor((trapdoor.y - 1) / roomHeightPx)),
    };
  }
}
