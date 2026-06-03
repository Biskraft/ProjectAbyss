# WorldAnvilDiveUiRuntime

`game/src/scenes/world/WorldAnvilDiveUiRuntime.ts` owns the LDtk world UI-container visibility snapshot used during anvil Item World dive transitions.

Invariants:

- `hide()` is idempotent and stores the previous `game.uiContainer.visible` value before hiding the shared UI.
- `restore()` is idempotent and restores only the visibility value captured by the matching hide.
- `LdtkWorldScene` transition callbacks and lifecycle cleanup should call `hide()` / `restore()` directly; do not add scene-local wrapper methods back.
- This runtime only owns shared UI visibility. Inventory, anvil prompts, Item World push/fade, and frozen-return prompt behavior remain in their existing owners.

Verification on 2026-06-03: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed with only existing line-ending warnings.
