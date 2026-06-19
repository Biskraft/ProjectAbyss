interface ItemWorldReturnResultCleanupRuntimeDeps {
  hideGameplayHud: () => void;
  clearToast: () => void;
  hideWorldPrompts: () => void;
  hasStratumClearOverlay: () => boolean;
  destroyStratumClearOverlay: () => void;
  isBossChoiceVisible: () => boolean;
  hideBossChoice: () => void;
  isEscapeConfirmVisible: () => boolean;
  hideEscapeConfirm: () => void;
}

export class ItemWorldReturnResultCleanupRuntime {
  constructor(private readonly deps: ItemWorldReturnResultCleanupRuntimeDeps) {}

  cleanup(): void {
    this.deps.hideGameplayHud();
    this.deps.clearToast();
    this.deps.hideWorldPrompts();
    if (this.deps.hasStratumClearOverlay()) {
      this.deps.destroyStratumClearOverlay();
    }
    if (this.deps.isBossChoiceVisible()) {
      this.deps.hideBossChoice();
    }
    if (this.deps.isEscapeConfirmVisible()) {
      this.deps.hideEscapeConfirm();
    }
  }
}
