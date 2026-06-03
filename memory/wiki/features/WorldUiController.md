# WorldUiController

`game/src/scenes/world/WorldUiController.ts` owns LDtk world shared UI input routing.

- Handles pause/death input routing, world-map toggle/update, inventory input, persistent toast/tutorial updates, and Item World UI detach.
- Pause state should be derived from `PauseMenu.visible`; do not add a separate `LdtkWorldScene.isPaused` flag.
- Pause open/close callbacks are optional and only needed when a caller has extra side effects.

Verification: 2026-06-03 `npx tsc --noEmit`, `npm run build`, Puppeteer smoke against `http://localhost:3000/play/?debug=1`, and `git diff --check` passed. `git diff --check` only printed existing line-ending warnings.
