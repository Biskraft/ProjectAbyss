# ItemWorldHudRuntime

- `game/src/scenes/itemworld/ItemWorldHudRuntime.ts` owns procedural Item World HUD presentation rules for the item EXP panel, floor/debug text, and depth gauge cleared-state calculation.
- `ItemWorldScene` supplies the current `HUD`, item, progress, strata config, unified grid, current stratum index, and earned EXP through getters. Earned EXP is owned by `ItemWorldRunStats`; keep direct counter fields out of the scene.
- `getClearedStrataFlags()` treats a stratum as cleared when its end-room cell is cleared, its boss portal exists in progress, or `deepestUnlocked` has passed that stratum.
- The cleared-strata calculation is shared through `game/src/scenes/shared/ItemWorldHudHelpers.ts`; the runtime remains the HUD presentation adapter.
- `showGameplayHud()` is the shared path for first entry and stratum jumps; `updateText()` is the per-frame text/depth refresh path.
- Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, and `http://localhost:3000/play/?debug=1` Puppeteer smoke passed.

- 2026-06-08 HUD tool visibility gate: Item World HUD runtime may request showDepthGauge() / showItemExp(), but final element visibility is owned by HUD layout overrides from public/data/hud_layout.json. HUD now gates depthFrame, expBar, and itemExitHint via layout-visible checks so runtime show calls cannot resurrect elements hidden in the HUD tool. Verification: 
px tsc --noEmit from game/ passed.
