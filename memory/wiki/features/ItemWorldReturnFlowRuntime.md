# ItemWorldReturnFlowRuntime

- `game/src/scenes/itemworld/ItemWorldReturnFlowRuntime.ts` owns Item World return cleanup and transition handoff for exit states (`escape`, `clear`, `death`).

## Responsibilities

- Pre-return UI clean state: `prepareReturnResult()`
  - Hide HUD (boss HP, depth gauge, item EXP)
  - Clear toast and world-level prompts
- Fade start:
  - `startPreparedExitFadeForReason(reason)` is the scene-facing entry for return preparation + fade start.
  - It sets the exit reason before return preparation and delegates fade startup through the injected `startExitFadeSequence`.
  - Duplicate fade/preparation attempts are gated with `returnPreparationStarted`.
- Completion cleanup: `completeExitWithReason(reason, onComplete)`
  - Set the exit reason before final cleanup.
  - Track exit once when needed.
  - Transfer HP back to source world.
  - Cleanup absorb dissolve.
  - Hide HUD and clear UI container.
  - Execute the optional completion callback once.
- Return-result path: `showReturnResultAndComplete(reason, result, onComplete)`
  - Requests exit reason, runs one-time return preparation, and delegates `showReturnResult` to UI.
  - Falls back to immediate completion when result modal is unavailable.
- Trapdoor cleanup: `disposeTrapdoor()`

## Contract

- Exit reason (`escape` | `clear` | `death`) is maintained by `ItemWorldProgressController` and read by this runtime through `getExitReason()` at tracking time.
- Return reason is injected through the single `requestExitWithReason(reason)` callback and delegated to `ItemWorldProgressController`.
- `ItemWorldProgressController.onExitFromStratumClear` is reason-aware. `ItemWorldScene` receives that reason and forwards it to `startPreparedExitFadeForReason(reason)`.
- Transition state is now passed as booleans (`isExitFadeActive`/`isPostClearHoldActive`) from scene-owned `ItemWorldFlowState`, so the scene no longer passes raw transition-state strings.
- `ItemWorldScene` owns the transition flags (`ItemWorldFlowState`) and the runtime does **not** expose passthrough flag-start helpers; callers now invoke `flowState.startPostClearHold()` and `flowState.reset()` directly when needed.
- Return-stage preparation (`prepareReturnResult`) runs exactly once even when completion is reached directly.
- This runtime handles return-stage cleanup and coordination only; scene-level transition ownership remains in `ItemWorldScene`.

## Call Sites

- `game/src/scenes/ItemWorldScene.ts`
  - Escape/clear/absorb-entry paths call `startPreparedExitFadeForReason(...)`.
  - Stratum-clear exit calls `progressController.exitFromStratumClear('clear')`, then forwards the reason through `exitFromStratumClear(reason)`.
  - Final trapdoor/final-clear completion also routes through reason-aware fade entry.
  - Death return path uses `showReturnResultAndComplete('death', result, onComplete)` to centralize return-result presentation + completion flow.
  - `updateTransition()` calls `completeExitWithReason(...)` after fade completes, using the current controller exit reason.
  - Trapdoor-related cleanup calls `disposeTrapdoor()` when required.
