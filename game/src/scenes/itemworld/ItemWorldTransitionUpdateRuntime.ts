interface ItemWorldTransitionUpdateRuntimeDeps {
  isExitFade: () => boolean;
  isPostClearHold: () => boolean;
  updateExitFade: (dtMs: number) => boolean;
  resetFlowState: () => void;
  exitItemWorld: () => void;
  updatePostClearHold: (dtMs: number) => void;
}

export class ItemWorldTransitionUpdateRuntime {
  constructor(private readonly deps: ItemWorldTransitionUpdateRuntimeDeps) {}

  update(dtMs: number): void {
    if (this.deps.isExitFade()) {
      if (this.deps.updateExitFade(dtMs)) {
        this.deps.resetFlowState();
        this.deps.exitItemWorld();
      }
      return;
    }

    if (this.deps.isPostClearHold()) {
      this.deps.updatePostClearHold(dtMs);
    }
  }
}
