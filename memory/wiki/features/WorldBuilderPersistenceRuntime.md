# WorldBuilderPersistenceRuntime

`game/src/scenes/world/WorldBuilderPersistenceRuntime.ts` owns LDtk world Giant Builder persistence and spawner meta state.

Invariants:

- The runtime owns saved builder `posY` values, saved `GiantBuilderSnapshot`s, per-session run-once spawner keys, active builder level id, and active builder mode.
- `LdtkWorldScene` still owns the active `GiantBuilder` object, route application, entity creation/destruction, collision stamping, and player carry logic.
- `resolveSpawnState()` preserves the old priority: saved snapshot `posY`, then saved position, then run-once replay-at-end fallback, then authored start.
- `markRunOnce()` should be called only after a route is actually built for a non-empty run-once key.
- `saveActive(builder)` stores both current `posY` and route snapshot before the active builder is destroyed.
- Do not reintroduce `builderSavedPositions`, `builderSavedStates`, `builderSpawnerRunOnceKeys`, `activeBuilderLevelId`, or `activeBuilderMode` fields to `LdtkWorldScene`.

Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed with only existing line-ending warnings.
