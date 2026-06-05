# ItemWorldStratumPickerRuntime

- `game/src/scenes/itemworld/ItemWorldStratumPickerRuntime.ts` owns the procedural Item World re-entry stratum picker UI.
- It stores picker visibility, selected stratum, max selectable depth, pulse animation, panel/container lifetime, row/detail rendering, control hints, and picker input handling.
- `ItemWorldScene` still owns the actual `jumpToStratum()` gameplay transition. The runtime only calls `onPick(stratumIndex)` after ATTACK confirms a selection.
- The runtime reads item, progress, stratum config, HUD skin, and cleared-strata flags through getters because those values are assigned or mutated during `ItemWorldScene.init()` and stratum progression.
- Keep picker `update(dt)` blocking while visible; `ItemWorldScene.update()` returns immediately after calling it so gameplay remains paused behind the modal.
- Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, and `/play/?debug=1` Puppeteer smoke passed after extraction.

- 2026-06-05: Picker root container teardown now uses DisplayObjectLifecycleHelpers.destroyDisplayObject(..., { children: true }); modal visibility/input ownership remains runtime-local.

- 2026-06-05: `hide()` now delegates to the existing `hideContainerOnly()` path, so visible-state dismissal and redraw replacement share the same `DisplayObjectLifecycleHelpers.destroyDisplayObject(..., { children: true })` cleanup semantics.
- 2026-06-05: ATTACK confirm and MENU/JUMP cancel now route through `ConfirmCancelInputHelpers.updateConfirmCancelInput({ cancelActions })`; left/up previous and right/down next input remains runtime-local because its order differs from shared directional helpers.
