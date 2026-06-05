# ItemWorldStratumClearRuntime

- `game/src/scenes/itemworld/ItemWorldStratumClearRuntime.ts` owns the unified procedural Item World `StratumClearOverlay` payload and `post_clear_hold` input handling.
- It delegates overlay rendering/lifetime to `ItemWorldUiController.showStratumClearOverlay()` and `destroyStratumClearOverlayPublic()`.
- Before-values for attack and innocent count come from `ItemWorldStratumStartSnapshot`.
- Input order preserves the old scene behavior: the overlay receives `ATTACK` and `MENU`, `continue` consumes ATTACK and continues to the next stratum, and `exit` consumes MENU/ATTACK then starts the exit path through a callback.
- Continue/exit action consumption uses `InputPressHelpers.consumePressedActionSnapshot()` so the overlay and runtime consume from the same `ATTACK`/`MENU` pressed snapshot.
- `ItemWorldFlowState` owns the `post_clear_hold` state flag; this runtime owns the input handling while that state is active.
- Final-vs-next-stratum trapdoor intent comes from `ItemWorldTrapdoorState`.
- `ItemWorldScene` still owns the actual continue/exit sequencing, including `continueToNextStratum()` and `exitFromStratumClear()` (including `cleanupForReturnResult()` and `startExitFade()`).
- `ItemWorldProgressController` now delegates only snapshot + continuation callbacks for the unified `StratumClearOverlay` flow.
- Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, and `http://localhost:3000/play/?debug=1` Puppeteer smoke passed.
