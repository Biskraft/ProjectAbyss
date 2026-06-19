interface ItemWorldLifecycleCleanupRuntimeDeps {
  unsubscribeGamepadToast: () => void;
  hideParallax: () => void;
  clearToast: () => void;
  destroyUiController: () => void;
  destroyContainerCarry: () => void;
  hideCollisionHud: () => void;
  updateEntryCorridorSceneExit: () => void;
  cleanupAbsorbDissolve: () => void;
  destroyTrapdoorRuntime: () => void;
  clearAnvils: () => void;
  clearCaptureOrbs: () => void;
  clearStaticEntities: () => void;
  closeAndDetachLoreDisplay: () => void;
  detachHud: () => void;
  detachAndDestroyAreaTitle: () => void;
  detachScreenFlash: () => void;
  destroyLowHpVignette: () => void;
  destroyTutorialHint: () => void;
  destroyDevOverlay: () => void;
  destroyBossClear: () => void;
  destroyWeather: () => void;
  destroyStratumPicker: () => void;
  destroyEntryCorridor: () => void;
  destroyOxygenOverlay: () => void;
  destroyAnvilRuntime: () => void;
  destroyParallax: () => void;
  clearDamageNumbers: () => void;
  destroyCollisionHud: () => void;
}

export class ItemWorldLifecycleCleanupRuntime {
  constructor(private readonly deps: ItemWorldLifecycleCleanupRuntimeDeps) {}

  exit(): void {
    this.deps.unsubscribeGamepadToast();
    this.deps.hideParallax();
    this.deps.clearToast();
    this.deps.destroyUiController();
    this.deps.destroyContainerCarry();
    this.deps.hideCollisionHud();
    this.deps.updateEntryCorridorSceneExit();
    this.deps.hideParallax();
    this.deps.cleanupAbsorbDissolve();
    this.deps.destroyTrapdoorRuntime();
    this.deps.clearAnvils();
    this.deps.clearCaptureOrbs();
    this.deps.clearStaticEntities();
    this.deps.closeAndDetachLoreDisplay();
    this.deps.detachHud();
    this.deps.detachAndDestroyAreaTitle();
    this.deps.detachScreenFlash();
    this.deps.destroyLowHpVignette();
    this.deps.destroyTutorialHint();
    this.deps.destroyDevOverlay();
    this.deps.destroyBossClear();
    this.deps.destroyWeather();
    this.deps.destroyStratumPicker();
  }

  destroy(): void {
    this.deps.destroyEntryCorridor();
    this.deps.destroyWeather();
    this.deps.destroyOxygenOverlay();
    this.deps.destroyDevOverlay();
    this.deps.destroyBossClear();
    this.deps.clearCaptureOrbs();
    this.deps.destroyStratumPicker();
    this.deps.destroyContainerCarry();
    this.deps.destroyAnvilRuntime();
    this.deps.destroyParallax();
    this.deps.clearDamageNumbers();
    this.deps.destroyCollisionHud();
  }
}
