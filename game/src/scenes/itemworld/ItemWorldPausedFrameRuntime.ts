interface ItemWorldPausedFrameRuntimeDeps {
  tickEntryFreeze: (dtMs: number) => boolean;
  updatePrologueEnd: (dtMs: number) => boolean;
  freezePlayerVelocity: () => void;
  savePlayerPreviousPosition: () => void;
  updateHud: (dtMs: number) => void;
  updateHudText: () => void;
  updateDamageNumbers: (dtMs: number) => void;
  updateScreenFlash: (dtMs: number) => void;
  targetCameraToPlayer: () => void;
  updateCamera: (dtMs: number) => void;
}

export class ItemWorldPausedFrameRuntime {
  constructor(private readonly deps: ItemWorldPausedFrameRuntimeDeps) {}

  updateEntryFreeze(dtMs: number): boolean {
    if (!this.deps.tickEntryFreeze(dtMs)) return false;

    this.deps.freezePlayerVelocity();
    this.deps.savePlayerPreviousPosition();
    this.deps.updateHud(dtMs);
    this.deps.updateHudText();
    this.deps.updateDamageNumbers(dtMs);
    this.deps.updateScreenFlash(dtMs);
    this.deps.targetCameraToPlayer();
    this.deps.updateCamera(dtMs);
    return true;
  }

  updatePrologueEnd(dtMs: number): boolean {
    if (!this.deps.updatePrologueEnd(dtMs)) return false;

    this.deps.freezePlayerVelocity();
    this.deps.savePlayerPreviousPosition();
    this.deps.updateScreenFlash(dtMs);
    this.deps.updateHud(dtMs);
    this.deps.updateCamera(dtMs);
    return true;
  }
}
