# FilterLifecycleHelpers

- `game/src/scenes/shared/FilterLifecycleHelpers.ts` owns tiny Pixi filter array lifecycle helpers for scene runtimes.
- Use `appendFilterIfMissing(target, filter)` instead of repeating `target.filters` array copy plus `includes()` checks.
- Use `removeFilterAndClearIfEmpty(target, filter)` when removing a filter should set `target.filters` to `null` after the last filter is removed.
- Initial users: `ItemWorldEntryCorridorVisibilityRuntime`, `WorldDeployBlurRuntime`, `WorldDungeonAtmosphereRuntime`, and `ItemWorldAbsorbDissolveRuntime`.
- `WorldLaserDesaturationRuntime` uses `removeFilterAndClearIfEmpty()` for ad hoc target cleanup while preserving its previous-filter snapshot/restore policy.
- Preserve callsite ownership for filter construction, target selection, and any cases that intentionally keep an empty filter array instead of `null`.
