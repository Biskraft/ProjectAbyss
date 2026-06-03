# ItemWorldStratumClearRuntime

- `game/src/scenes/itemworld/ItemWorldStratumClearRuntime.ts` owns the unified procedural Item World `StratumClearOverlay` payload and `post_clear_hold` input handling.
- It delegates overlay rendering/lifetime to `ItemWorldUiController.showStratumClearOverlay()` and `destroyStratumClearOverlayPublic()`.
- Before-values for attack and innocent count come from `ItemWorldStratumStartSnapshot`.
- Input order preserves the old scene behavior: the overlay receives `ATTACK` and `MENU`, `continue` consumes ATTACK and continues to the next stratum, and `exit` consumes MENU/ATTACK then starts the exit path through a callback.
- `ItemWorldFlowState` owns the `post_clear_hold` state flag; this runtime owns the input handling while that state is active.
- Final-vs-next-stratum trapdoor intent comes from `ItemWorldTrapdoorState`.
- `ItemWorldScene` still owns the actual continue/exit sequencing, including `_continueToNextStratum()`, `cleanupForReturnResult()`, and `startExitFade()`.
- `ItemWorldProgressController` still has legacy A16 `showStratumClearPanel` callbacks routed through `ItemWorldStratumClearPanelRuntime`. Do not conflate those with the unified `StratumClearOverlay` runtime until that legacy path is retired or migrated.
- Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, and `http://localhost:3000/play/?debug=1` Puppeteer smoke passed.
