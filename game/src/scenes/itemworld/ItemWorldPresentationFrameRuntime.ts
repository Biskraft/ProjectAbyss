interface ItemWorldPresentationFrameRuntimeDeps {
  reconcileGameplayHudVisibility: () => void;
  updateHudStats: () => void;
  updateOxygen: () => void;
  updateBossHp: () => void;
  updateHud: (dtMs: number) => void;
  updateHudText: () => void;
  updateDamageNumbers: (dtMs: number) => void;
  updateHitSparks: (dtMs: number) => void;
  updatePropShatter: (dtMs: number) => void;
  updateDeathParticles: (dtMs: number) => void;
  updateCaptureOrb: (dtMs: number) => void;
  updateBossClear: (dtMs: number) => void;
  updateScreenFlash: (dtMs: number) => void;
  updateFrameEffects: (dtMs: number) => void;
  updateCamera: (dtMs: number) => void;
}

export class ItemWorldPresentationFrameRuntime {
  constructor(private readonly deps: ItemWorldPresentationFrameRuntimeDeps) {}

  update(dtMs: number): void {
    this.deps.reconcileGameplayHudVisibility();
    this.deps.updateHudStats();
    this.deps.updateOxygen();
    this.deps.updateBossHp();
    this.deps.updateHud(dtMs);
    this.deps.updateHudText();
    this.deps.updateDamageNumbers(dtMs);
    this.deps.updateHitSparks(dtMs);
    this.deps.updatePropShatter(dtMs);
    this.deps.updateDeathParticles(dtMs);
    this.deps.updateCaptureOrb(dtMs);
    this.deps.updateBossClear(dtMs);
    this.deps.updateScreenFlash(dtMs);
    this.deps.updateFrameEffects(dtMs);
    this.deps.updateCamera(dtMs);
  }
}
