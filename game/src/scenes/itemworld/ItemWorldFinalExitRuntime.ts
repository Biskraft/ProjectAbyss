interface ItemWorldFinalExitRuntimeDeps {
  cleanupForExit: () => void;
  onComplete: () => void;
  onPrologueEnd: () => void;
}

export class ItemWorldFinalExitRuntime {
  constructor(private readonly deps: ItemWorldFinalExitRuntimeDeps) {}

  exitToWorld(): void {
    this.deps.cleanupForExit();
    this.deps.onComplete();
  }

  exitToPrologueEnd(): void {
    this.deps.cleanupForExit();
    this.deps.onPrologueEnd();
  }
}
