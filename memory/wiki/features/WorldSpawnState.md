# WorldSpawnState

`game/src/scenes/world/WorldSpawnState.ts` owns the LDtk world spawn-level identifier and saved-level validation.

Invariants:

- `currentLevelId` is the fallback level used by save, respawn, void return, tutorial hint context, and Item World return paths when no active `currentLevel` is available.
- Saved level IDs are accepted only if the LDtk loader can resolve them and Debug rooms are allowed by `?debug=1`.
- Missing, stale, or inaccessible saved level IDs fall back to `WorldTransitionController.findPlayerSpawnLevel()` with `FALLBACK_ENTRANCE_LEVEL`.
- Current item-world test progression uses `ITEM_WORLD_TEST_START_ENABLED` in `LdtkWorldScene` to skip the prologue, ignore saved spawn level on initial boot, and start from `Start_Room_01` with `chapter_01` scene state.
- `LdtkWorldScene` still owns actual `loadLevel()` execution and save-point snapping; `WorldPlayerSpawnRuntime` owns player placement after a level is loaded.
- Scene-context access for spawn fallback checks uses injected `getScene()` callback (scene string from save state is read in `LdtkWorldScene`, not runtime-local).
