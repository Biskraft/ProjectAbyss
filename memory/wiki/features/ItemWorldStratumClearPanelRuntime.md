# ItemWorldStratumClearPanelRuntime

- `game/src/scenes/itemworld/ItemWorldStratumClearPanelRuntime.ts` owns the legacy A16 procedural Item World before/after stats panel wrapper.
- It delegates rendering/lifetime to `ItemWorldUiController.showStratumClearPanel()` and `updateStratumClearPanel()`.
- This is distinct from `ItemWorldStratumClearRuntime`, which owns the unified `StratumClearOverlay` and `post_clear_hold` choice input.
- Stratum-entry before-values are captured by `ItemWorldStratumStartSnapshot`; keep snapshot state out of this panel wrapper.
- `ItemWorldProgressController` still calls the legacy A16 panel callback when banking pending boss progress. Keep this runtime until that controller path is retired or migrated to the unified overlay.
- `ItemWorldScene` still uses `uiController.hasStratumClearPanel()` for prompt suppression and cleanup guards, but no longer owns panel payload copying or ATTACK confirm consumption.
- Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, and `http://localhost:3000/play/?debug=1` Puppeteer smoke passed.
