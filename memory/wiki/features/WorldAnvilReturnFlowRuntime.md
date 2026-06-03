# WorldAnvilReturnFlowRuntime

`game/src/scenes/world/WorldAnvilReturnFlowRuntime.ts` owns LDtk world anvil Item World return restoration and player placement.

Current state:

- Places the player at the used-anvil snapshot through `AnvilItemWorldReturnState`.
- Restores the overworld return level after procedural Item World completion, clears tunnel state, resets edge transition state, clears pre-tunnel entry state, and marks released world visuals as restored.
- Preserves the placed anvil item across `loadLevel()` by capturing the preserved item before reload, then re-running `Anvil.placeItem()` on the newly spawned anvil while temporarily bypassing disabled/retired state.
- Provides the fixed Item World exit path with the same anvil return placement helper.

Boundaries:

- `AnvilItemWorldReturnState` owns the snapshot, return level id, preserved item, and retire-after-boss flag.
- `WorldItemWorldSceneFlowRuntime` calls this runtime through its common return callback when `restoreAtAnvil` is requested.
- `WorldFixedItemWorldFlowRuntime` calls this runtime only for player placement after its own fixed-level reload policy.
- `LdtkWorldScene` still owns the actual `loadLevel()` implementation and current anvil/player references.

Prevention rules:

- Do not add scene-local `placePlayerAtReturnPoint()` or `restoreWorldAtAnvilReturnPoint()` helpers back to `LdtkWorldScene`.
- Keep the preserved-item capture before `loadLevel()`; after reload, `getAnvil()` can point at a newly spawned anvil.
- Keep return placement through `AnvilItemWorldReturnState` so fallback to snapshot/current anvil stays centralized.

Verification on 2026-06-03: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed; diff check only printed existing line-ending warnings.
