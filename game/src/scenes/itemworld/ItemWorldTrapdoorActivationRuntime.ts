interface TrapdoorLikeEntity {
  x: number;
  y: number;
  height: number;
  destroy: () => void;
}

interface ItemWorldTrapdoorActivationRuntimeDeps {
  getTrapdoor: () => TrapdoorLikeEntity | null;
  captureDescentFromTrapdoor: (trapdoor: TrapdoorLikeEntity) => void;
  isDescentToWorld: () => boolean;
  clearTrapdoor: () => void;
  hideTrapdoorPrompt: () => void;
  clearDamageNumbers: () => void;
  clearToast: () => void;
  hideWorldPrompts: () => void;
  hideCinematicHud: () => void;
  markFinalClear: () => void;
  startAbsorbDissolve: () => void;
  showStratumClearOverlay: (isFinal: boolean, hasNextStratum: boolean) => void;
}

export class ItemWorldTrapdoorActivationRuntime {
  constructor(private readonly deps: ItemWorldTrapdoorActivationRuntimeDeps) {}

  start(): void {
    const trapdoor = this.deps.getTrapdoor();
    if (!trapdoor) return;

    this.deps.captureDescentFromTrapdoor(trapdoor);

    if (!this.deps.isDescentToWorld()) {
      this.disposeTrapdoor(trapdoor);
    } else {
      this.deps.hideTrapdoorPrompt();
    }

    this.clearTransientUi();
    this.deps.hideCinematicHud();

    if (this.deps.isDescentToWorld()) {
      this.deps.markFinalClear();
      this.deps.startAbsorbDissolve();
      return;
    }

    this.deps.showStratumClearOverlay(false, true);
  }

  private disposeTrapdoor(trapdoor: TrapdoorLikeEntity): void {
    this.deps.hideTrapdoorPrompt();
    trapdoor.destroy();
    this.deps.clearTrapdoor();
  }

  private clearTransientUi(): void {
    this.deps.clearDamageNumbers();
    this.deps.clearToast();
    this.deps.hideWorldPrompts();
  }
}
