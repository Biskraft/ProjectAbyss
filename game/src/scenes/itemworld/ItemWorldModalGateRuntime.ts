interface ItemWorldModalGateRuntimeDeps {
  isFeedbackOpen: () => boolean;
  updateToast: (dtMs: number) => void;
  updateAreaTitle: (dtMs: number) => void;
  isReturnResultVisible: () => boolean;
  updateReturnResult: (dtMs: number) => void;
  confirmReturnResultIfRequested: () => void;
  setHudDebugInfoVisible: () => void;
  updateOnboardingBlockingInput: () => boolean;
  isStratumPickerVisible: () => boolean;
  updateStratumPicker: (dtMs: number) => void;
  isLoreActive: () => boolean;
  updateLore: (dtMs: number) => void;
  savePlayerPreviousPosition: () => void;
  isEntryCorridorActive: () => boolean;
  updateEntryCorridor: (dtMs: number) => void;
  updateBossChoiceInput: () => boolean;
}

export class ItemWorldModalGateRuntime {
  constructor(private readonly deps: ItemWorldModalGateRuntimeDeps) {}

  updatePreGameplay(dtMs: number): boolean {
    if (this.deps.isFeedbackOpen()) {
      this.deps.updateToast(dtMs);
      return true;
    }

    this.deps.updateAreaTitle(dtMs);

    if (this.deps.isReturnResultVisible()) {
      this.deps.updateReturnResult(dtMs);
      this.deps.confirmReturnResultIfRequested();
      return true;
    }

    this.deps.updateToast(dtMs);
    this.deps.setHudDebugInfoVisible();

    if (this.deps.updateOnboardingBlockingInput()) {
      return true;
    }

    if (this.deps.isStratumPickerVisible()) {
      this.deps.updateStratumPicker(dtMs);
      return true;
    }

    if (this.deps.isLoreActive()) {
      this.deps.updateLore(dtMs);
      this.deps.savePlayerPreviousPosition();
      return true;
    }

    if (this.deps.isEntryCorridorActive()) {
      this.deps.updateEntryCorridor(dtMs);
      return true;
    }

    return false;
  }

  updateBossChoice(): boolean {
    return this.deps.updateBossChoiceInput();
  }
}
