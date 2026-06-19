interface ItemWorldExitAfterBossRuntimeDeps {
  setLastSafeStratum: () => void;
  requestEscapeExit: () => void;
  persistRoomState: () => void;
  cleanupForReturnResult: () => void;
  startExitFade: () => void;
}

export class ItemWorldExitAfterBossRuntime {
  constructor(private readonly deps: ItemWorldExitAfterBossRuntimeDeps) {}

  exitAfterBoss(): void {
    this.deps.setLastSafeStratum();
    this.deps.requestEscapeExit();
    this.deps.persistRoomState();
    this.deps.cleanupForReturnResult();
    this.deps.startExitFade();
  }
}
