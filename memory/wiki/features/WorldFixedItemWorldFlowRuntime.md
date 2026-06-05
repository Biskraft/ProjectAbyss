# WorldFixedItemWorldFlowRuntime

`game/src/scenes/world/WorldFixedItemWorldFlowRuntime.ts` owns LDtk world fixed Item World enter/exit policy.

Current state:

- Wraps `FixedItemWorldRuntime`, which still stores the active fixed item and first-boss-clear snapshot.
- Enters a fixed Item World when an entry item has `fixedLevelId`: restores hidden anvil-dive UI, validates the LDtk level, records fixed Item World state, clears tunnel mode, and loads the authored fixed level.
- If the fixed level is missing, falls back to procedural Item World by keeping the entry item in `WorldItemWorldEntryState`, creating/pushing an `ItemWorldScene` through `WorldItemWorldSceneFlowRuntime`, and applying shared return processing through `applyItemWorldSceneCompletionLifecycle` before return dialogue/anvil retirement.
- Exits fixed Item World back to the forge: consumes fixed state, clears the entry item, resets edge transition, resolves the anvil/pre-tunnel/fallback return level, reloads it, clears released-world state, places the player at the anvil return point, applies first-boss tutorial hint state, fires return dialogue, and runs anvil retirement policy.

Boundaries:

- `FixedItemWorldRuntime` remains the state holder.
- `WorldItemWorldSceneFlowRuntime` owns procedural fallback scene creation/push/common return.
- `WorldAnvilReturnFlowRuntime` owns the player placement helper used after fixed-level reload.
- `LdtkWorldScene` still owns fixed Item World boss kill reward/progression while the player is inside the authored fixed level.

Prevention rules:

- Do not add scene-local `enterFixedItemWorld()` or `exitFixedItemWorld()` helpers back to `LdtkWorldScene`.
- Do not duplicate fixed active item or had-first-boss-clear fields; keep them in `FixedItemWorldRuntime`.
- Keep missing fixed-level fallback procedural, not a silent no-op, so authored data mistakes still leave the item-world entry playable.

Verification on 2026-06-03: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed; diff check only printed existing line-ending warnings.
