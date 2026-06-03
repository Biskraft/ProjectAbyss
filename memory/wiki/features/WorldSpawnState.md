# WorldSpawnState

`game/src/scenes/world/WorldSpawnState.ts` owns the LDtk world spawn-level identifier and saved-level validation.

Invariants:

- `currentLevelId` is the fallback level used by save, respawn, void return, tutorial hint context, and Item World return paths when no active `currentLevel` is available.
- Saved level IDs are accepted only if the LDtk loader can resolve them and Debug rooms are allowed by `?debug=1`.
- Missing, stale, or inaccessible saved level IDs fall back to `WorldTransitionController.findPlayerSpawnLevel()` with `FALLBACK_ENTRANCE_LEVEL`.
- `LdtkWorldScene` still owns actual `loadLevel()` execution and save-point snapping; `WorldPlayerSpawnRuntime` owns player placement after a level is loaded.
