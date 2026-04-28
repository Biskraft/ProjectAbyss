type ExitReason = 'escape' | 'clear' | 'death';

interface StratumSnapshot {
  beforeAtk: number;
  afterAtk: number;
  beforeLevel: number;
  afterLevel: number;
  beforeInnocents: number;
  afterInnocents: number;
}

interface PendingSnapshot {
  a6BeforeAtk: number;
  a6AfterAtk: number;
  a16: StratumSnapshot;
}

interface ControllerCallbacks {
  jumpToStratum: (stratumIndex: number) => void;
  persistRoomState: () => void;
  showBossChoice: (nextStratumIndex: number) => void;
  showA6DmgToast: (beforeAtk: number, afterAtk: number) => void;
  showStratumClearPanel: (snapshot: StratumSnapshot, isFinal: boolean) => void;
  startPostClearHold: () => void;
  startExitFade: () => void;
  showToast: (message: string, color: number) => void;
}

interface HandleStratumExitOptions {
  currentStratumIndex: number;
  hasNextStratum: boolean;
  itemName: string;
  itemLevel: number;
  a6BeforeAtk: number;
  a6AfterAtk: number;
  a16Snapshot: StratumSnapshot;
}

interface ExitWithProgressOptions {
  currentStratumIndex: number;
  itemName: string;
  itemLevel: number;
}

export class ItemWorldProgressController {
  private pendingSnapshot: PendingSnapshot | null = null;
  private pendingNextStratumIndex = -1;
  private exitReason: ExitReason = 'escape';

  constructor(private readonly callbacks: ControllerCallbacks) {}

  getExitReason(): ExitReason {
    return this.exitReason;
  }

  setExitReason(reason: ExitReason): void {
    this.exitReason = reason;
  }

  handleStratumExit(options: HandleStratumExitOptions): void {
    if (!options.hasNextStratum) {
      this.exitReason = 'clear';
      this.callbacks.persistRoomState();
      this.callbacks.showToast(`${options.itemName} Lv${options.itemLevel} Strata Complete!`, 0xffaa00);
      this.callbacks.showA6DmgToast(options.a6BeforeAtk, options.a6AfterAtk);
      this.callbacks.showStratumClearPanel(options.a16Snapshot, true);
      this.callbacks.startPostClearHold();
      return;
    }

    const nextStratumIndex = options.currentStratumIndex + 1;
    this.pendingSnapshot = {
      a6BeforeAtk: options.a6BeforeAtk,
      a6AfterAtk: options.a6AfterAtk,
      a16: options.a16Snapshot,
    };
    this.pendingNextStratumIndex = nextStratumIndex;
    this.callbacks.showBossChoice(nextStratumIndex);
  }

  continueToNextStratum(): void {
    const snapshot = this.pendingSnapshot;
    const next = this.pendingNextStratumIndex;
    this.pendingSnapshot = null;
    this.pendingNextStratumIndex = -1;

    if (snapshot) {
      this.callbacks.showA6DmgToast(snapshot.a6BeforeAtk, snapshot.a6AfterAtk);
      this.callbacks.showStratumClearPanel(snapshot.a16, false);
    }
    if (next >= 0) {
      this.callbacks.jumpToStratum(next);
    }
  }

  exitAfterBoss(options: ExitWithProgressOptions): void {
    const snapshot = this.pendingSnapshot;
    this.pendingSnapshot = null;
    this.pendingNextStratumIndex = -1;

    this.callbacks.persistRoomState();
    this.callbacks.showToast(`${options.itemName} Lv${options.itemLevel} Returning with progress...`, 0xffaa00);
    if (snapshot) {
      this.callbacks.showA6DmgToast(snapshot.a6BeforeAtk, snapshot.a6AfterAtk);
      this.callbacks.showStratumClearPanel(snapshot.a16, false);
    }
    this.callbacks.startPostClearHold();
  }
}
