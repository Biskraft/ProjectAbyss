export class ItemWorldEntryGateState {
  private readonly initialFreezeMs: number;
  private freezeTimerMs: number;
  private startSpawnDoneValue = false;

  constructor(initialFreezeMs: number) {
    this.initialFreezeMs = initialFreezeMs;
    this.freezeTimerMs = initialFreezeMs;
  }

  get startSpawnDone(): boolean {
    return this.startSpawnDoneValue;
  }

  tryMarkStartSpawnDone(): boolean {
    if (this.startSpawnDoneValue) return false;
    this.startSpawnDoneValue = true;
    return true;
  }

  clearFreeze(): void {
    this.freezeTimerMs = 0;
  }

  restartFreeze(): void {
    this.freezeTimerMs = this.initialFreezeMs;
  }

  tickFreeze(dtMs: number): boolean {
    if (this.freezeTimerMs <= 0) return false;
    this.freezeTimerMs = Math.max(0, this.freezeTimerMs - dtMs);
    return true;
  }
}
