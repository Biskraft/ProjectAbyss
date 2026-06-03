# ItemWorldStratumPickerRuntime

- `game/src/scenes/itemworld/ItemWorldStratumPickerRuntime.ts` owns the procedural Item World re-entry stratum picker UI.
- It stores picker visibility, selected stratum, max selectable depth, pulse animation, panel/container lifetime, row/detail rendering, control hints, and picker input handling.
- `ItemWorldScene` still owns the actual `jumpToStratum()` gameplay transition. The runtime only calls `onPick(stratumIndex)` after ATTACK confirms a selection.
- The runtime reads item, progress, stratum config, HUD skin, and cleared-strata flags through getters because those values are assigned or mutated during `ItemWorldScene.init()` and stratum progression.
- Keep picker `update(dt)` blocking while visible; `ItemWorldScene.update()` returns immediately after calling it so gameplay remains paused behind the modal.
- Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, and `/play/?debug=1` Puppeteer smoke passed after extraction.
