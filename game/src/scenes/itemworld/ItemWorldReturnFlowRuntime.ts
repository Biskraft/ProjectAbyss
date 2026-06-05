import { type Container } from 'pixi.js';
import type { DiveResult } from '@ui/ReturnResult';
import type { ItemWorldExitReason } from './ItemWorldExitReason';

interface ItemWorldReturnFlowRuntimeDeps {
  getHud: () => {
    container: {
      parent: Container | null;
      visible: boolean;
    };
    hideBossHP: () => void;
    hideDepthGauge: () => void;
    hideItemExp: () => void;
  };
  clearToast: () => void;
  hideWorldPromptsForReturnResult: () => void;
  hideBossChoiceIfVisible: () => void;
  hideEscapeIfVisible: () => void;
  tryMarkExitTracked: () => boolean;
  trackItemWorldExit: (exitReason: ItemWorldExitReason, floor: number) => void;
  requestExitWithReason: (reason: ItemWorldExitReason) => void;
  getExitReason: () => ItemWorldExitReason;
  getCurrentStratumIndex: () => number;
  transferPlayerHpToSource: (hp: number) => void;
  getPlayerHp: () => number;
  cleanupAbsorbDissolve: () => void;
  removeHudFromUi: () => void;
  clearUiContainer: () => void;
  showReturnResult: (result: DiveResult, onDismiss: () => void) => boolean;
  isExitFadeActive: () => boolean;
  isPostClearHoldActive: () => boolean;
  startExitFadeSequence: () => void;
  resetTransitionState: () => void;
  updateExitFade: (dtMs: number) => boolean;
  updatePostClearHold: (dtMs: number) => void;
}

export class ItemWorldReturnFlowRuntime {
  private completed = false;
  private completionCallbackHandled = false;
  private returnPreparationStarted = false;

  constructor(private readonly deps: ItemWorldReturnFlowRuntimeDeps) {}

  prepareReturnResult(): void {
    const hud = this.deps.getHud();
    hud.container.visible = false;
    hud.hideBossHP();
    hud.hideDepthGauge();
    hud.hideItemExp();
    this.deps.clearToast();
    this.deps.hideWorldPromptsForReturnResult();
    this.deps.hideBossChoiceIfVisible();
    this.deps.hideEscapeIfVisible();
  }

  private ensureReturnPrepared(): void {
    if (this.returnPreparationStarted) return;
    this.returnPreparationStarted = true;
    this.prepareReturnResult();
  }

  private startPreparedExitFade(): void {
    if (this.completed || this.returnPreparationStarted) {
      return;
    }

    this.ensureReturnPrepared();
    this.deps.startExitFadeSequence();
  }

  startPreparedExitFadeForReason(reason: ItemWorldExitReason): void {
    this.deps.requestExitWithReason(reason);
    this.startPreparedExitFade();
  }

  completeExitWithReason(reason: ItemWorldExitReason, onComplete: (() => void) | null = null): void {
    this.deps.requestExitWithReason(reason);
    this.completeExit(onComplete);
  }

  showReturnResultAndComplete(
    reason: ItemWorldExitReason,
    result: DiveResult,
    onComplete: (() => void) | null = null,
  ): void {
    this.deps.requestExitWithReason(reason);
    this.ensureReturnPrepared();
    const complete = () => this.completeExit(onComplete);
    const shown = this.deps.showReturnResult(result, complete);
    if (!shown) {
      complete();
    }
  }

  private completeExit(onComplete: (() => void) | null = null): void {
    this.ensureReturnPrepared();

    if (!this.completed) {
      if (this.deps.tryMarkExitTracked()) {
        this.deps.trackItemWorldExit(this.deps.getExitReason(), this.deps.getCurrentStratumIndex());
      }
      this.completed = true;
      this.deps.transferPlayerHpToSource(this.deps.getPlayerHp());
      this.deps.cleanupAbsorbDissolve();
      const hud = this.deps.getHud();
      hud.hideDepthGauge();
      hud.hideItemExp();
      this.deps.removeHudFromUi();
      this.deps.clearUiContainer();
      this.deps.resetTransitionState();
    }

    if (this.completionCallbackHandled || !onComplete) return;
    this.completionCallbackHandled = true;
    onComplete?.();
  }

  updateTransition(dtMs: number, onExitComplete: (reason: ItemWorldExitReason) => void): void {
    if (!this.deps.isExitFadeActive() && !this.deps.isPostClearHoldActive()) return;

    if (this.deps.isExitFadeActive()) {
      if (this.deps.updateExitFade(dtMs)) {
        this.deps.resetTransitionState();
        onExitComplete(this.deps.getExitReason());
      }
      return;
    }

    if (this.deps.isPostClearHoldActive()) {
      this.deps.updatePostClearHold(dtMs);
    }
  }
}
