const LOOK_HOLD_THRESHOLD_MS = 400;
const POST_TRANSITION_SNAP_FRAMES = 15;

interface LookDirectionOptions {
  dtMs: number;
  playerIdle: boolean;
  lookUp: boolean;
  lookDown: boolean;
}

export class WorldCameraInputRuntime {
  private lookHoldTimerMs = 0;
  private postTransitionSnapFrames = 0;

  armPostTransitionSnap(frames = POST_TRANSITION_SNAP_FRAMES): void {
    this.postTransitionSnapFrames = Math.max(this.postTransitionSnapFrames, frames);
  }

  resolveRenderAlpha(alpha: number): number {
    if (this.postTransitionSnapFrames <= 0) return alpha;
    this.postTransitionSnapFrames--;
    return 1;
  }

  updateLookDirection(options: LookDirectionOptions): -1 | 0 | 1 {
    const wantLook = options.playerIdle && (options.lookUp || options.lookDown);
    if (wantLook) {
      this.lookHoldTimerMs += options.dtMs;
    } else {
      this.lookHoldTimerMs = 0;
    }

    if (!wantLook || this.lookHoldTimerMs < LOOK_HOLD_THRESHOLD_MS) return 0;
    return options.lookUp ? -1 : 1;
  }
}
