# ItemWorldExitTelemetryState

- `game/src/scenes/itemworld/ItemWorldExitTelemetryState.ts` owns the procedural Item World exit-analytics duplicate guard.
- Death flow calls `markExitTracked()` immediately after firing `trackItemWorldExit('death', stratumIndex)`.
- Normal return flow calls `tryMarkExitTracked()` before firing `trackItemWorldExit(exitReason, stratumIndex)`, so the death return modal cannot double-report the same Item World exit.
- Do not reintroduce a scene-owned `exitTracked` boolean in `ItemWorldScene`.
- Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, and `http://localhost:3000/play/?debug=1` Puppeteer smoke passed.
