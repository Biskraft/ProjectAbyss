interface ItemWorldBlockingTransitionRuntimeDeps {
  isRoomTransitionActive: () => boolean;
  updateRoomTransition: (dtMs: number) => void;
  isAbsorbActive: () => boolean;
  updateAbsorb: (dtMs: number) => void;
  isFlowHoldActive: () => boolean;
  updateFlowHold: (dtMs: number) => void;
  setGameplayHudBlock: (reason: string, blocked: boolean) => void;
}

export class ItemWorldBlockingTransitionRuntime {
  constructor(private readonly deps: ItemWorldBlockingTransitionRuntimeDeps) {}

  update(dtMs: number): boolean {
    if (this.deps.isRoomTransitionActive()) {
      this.deps.setGameplayHudBlock('roomTransition', true);
      this.deps.updateRoomTransition(dtMs);
      return true;
    }
    this.deps.setGameplayHudBlock('roomTransition', false);

    if (this.deps.isAbsorbActive()) {
      this.deps.setGameplayHudBlock('absorb', true);
      this.deps.updateAbsorb(dtMs);
      return true;
    }
    this.deps.setGameplayHudBlock('absorb', false);

    if (this.deps.isFlowHoldActive()) {
      this.deps.setGameplayHudBlock('flowHold', true);
      this.deps.updateFlowHold(dtMs);
      return true;
    }
    this.deps.setGameplayHudBlock('flowHold', false);

    return false;
  }
}
