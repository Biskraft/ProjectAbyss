# NumericHelpers

- `game/src/scenes/shared/NumericHelpers.ts` owns tiny scene/runtime numeric helpers.
- Use `clamp01(value)` for scene code that needs an explicit `0..1` clamp instead of repeating `Math.max(0, Math.min(1, value))`.
- Use `getProgress01(elapsedMs, durationMs)` for elapsed-time progress formulas that intentionally preserve `Math.min(1, elapsedMs / durationMs)` behavior.
- Use `smootherstep01(value)` for the shared Item World growth smootherstep curve. It clamps input before applying `t*t*t*(t*(t*6-15)+10)`.
- Initial users: `ItemWorldEntryStreamRuntime`, `ItemWorldGrowthSnapshotController`, and `WorldFrozenSnapshotRuntime`.
- Timer progress users include `ItemWorldEntryPushTransition`, `ItemWorldEntryCorridorVisibilityRuntime`, `ItemWorldPrologueEndRuntime`, `WorldDeployBlurRuntime`, `WorldIntroHandoffRuntime`, and `WorldVoidRuntime`.
- Keep broader audio/effects/data-local clamp helpers out of this scene helper unless a future refactor intentionally normalizes those subsystems too.
