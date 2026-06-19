interface ItemWorldExitCleanupRuntimeDeps {
  trackExitIfNeeded: () => void;
  syncSourcePlayerHp: () => void;
  hideEscapeConfirm: () => void;
  cleanupAbsorbDissolve: () => void;
  hideHudDepthGauge: () => void;
  hideHudItemExp: () => void;
  detachHudContainer: () => void;
  clearUiContainer: () => void;
}

export class ItemWorldExitCleanupRuntime {
  constructor(private readonly deps: ItemWorldExitCleanupRuntimeDeps) {}

  cleanup(): void {
    this.deps.trackExitIfNeeded();
    this.deps.syncSourcePlayerHp();
    this.deps.hideEscapeConfirm();
    this.deps.cleanupAbsorbDissolve();
    this.deps.hideHudDepthGauge();
    this.deps.hideHudItemExp();
    this.deps.detachHudContainer();
    this.deps.clearUiContainer();
  }
}
