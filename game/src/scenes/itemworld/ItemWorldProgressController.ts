import type { ItemWorldExitReason } from './ItemWorldExitReason';

interface PendingSnapshot {
  a6BeforeAtk: number;
  a6AfterAtk: number;
}

interface PrepareStratumTransitionOptions {
  currentStratumIndex: number;
  a6BeforeAtk: number;
  a6AfterAtk: number;
}

interface ControllerCallbacks {
  showA6DmgToast: (beforeAtk: number, afterAtk: number) => void;
  onContinueToNextStratum: (nextStratumIndex: number) => void;
  onExitFromStratumClear: (reason: ItemWorldExitReason) => void;
}

export class ItemWorldProgressController {
  private pendingSnapshot: PendingSnapshot | null = null;
  private pendingNextStratumIndex = -1;
  private exitReason: ItemWorldExitReason = 'escape';
  private exitReasonLocked = false;

  constructor(private readonly callbacks: ControllerCallbacks) {}

  getExitReason(): ItemWorldExitReason {
    return this.exitReason;
  }

  requestExitWithReason(reason: ItemWorldExitReason): void {
    if (this.exitReasonLocked) return;
    this.exitReason = reason;
    if (reason !== 'escape') {
      this.exitReasonLocked = true;
    }
  }

  prepareStratumClearTransition(options: PrepareStratumTransitionOptions): void {
    this.pendingSnapshot = {
      a6BeforeAtk: options.a6BeforeAtk,
      a6AfterAtk: options.a6AfterAtk,
    };
    this.pendingNextStratumIndex = options.currentStratumIndex + 1;
  }

  continueToNextStratum(): void {
    const snapshot = this.pendingSnapshot;
    const next = this.pendingNextStratumIndex;
    this.pendingSnapshot = null;
    this.pendingNextStratumIndex = -1;

    if (snapshot) {
      this.callbacks.showA6DmgToast(snapshot.a6BeforeAtk, snapshot.a6AfterAtk);
    }
    if (next >= 0) {
      this.callbacks.onContinueToNextStratum(next);
    }
  }

  exitFromStratumClear(reason: ItemWorldExitReason): void {
    this.requestExitWithReason(reason);
    const snapshot = this.pendingSnapshot;
    this.pendingSnapshot = null;
    this.pendingNextStratumIndex = -1;
    if (snapshot) {
      this.callbacks.showA6DmgToast(snapshot.a6BeforeAtk, snapshot.a6AfterAtk);
    }
    this.callbacks.onExitFromStratumClear(reason);
  }
}
