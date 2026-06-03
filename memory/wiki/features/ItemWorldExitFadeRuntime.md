# ItemWorldExitFadeRuntime

- `game/src/scenes/itemworld/ItemWorldExitFadeRuntime.ts` owns procedural Item World exit-fade overlay timing and alpha ramp.
- `ItemWorldFlowState` owns the high-level non-room transition state (`none`, `exit_fade`, `post_clear_hold`) because prompt suppression and clear-overlay flow still depend on that state.
- `startExitFade()` should set `ItemWorldFlowState` to `exit_fade` and call `ItemWorldExitFadeRuntime.start()`. Completion still calls back into `ItemWorldScene.exitItemWorld()`.
- Fade duration remains `FADE_DURATION * 2`, matching the previous scene-owned timer.
- Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, and `http://localhost:3000/play/?debug=1` Puppeteer smoke passed.
