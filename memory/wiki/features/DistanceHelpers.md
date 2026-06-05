# DistanceHelpers

- `game/src/scenes/shared/DistanceHelpers.ts` owns tiny mode-neutral distance utilities for scene/runtime code.
- Use `getDistanceSquared(ax, ay, bx, by)` when comparing against squared radius thresholds to avoid repeated `dx * dx + dy * dy` callsite math.
- Use `getDistance(ax, ay, bx, by)` only when the actual Euclidean distance is needed, for example visual/filter intensity.
- Keep coordinate choice and threshold policy at the callsite; this helper should not know about players, rooms, prompts, or UI.
- Initial users: `WorldFrozenReturnRuntime`, `WorldFrozenSnapshotRuntime`, `ItemWorldEntryCorridorRevealRuntime`, `WorldEgoDialogueRuntime`, and `WorldSacredPickupRuntime`.
- Follow-up users include shared fluid arc/acid proximity helpers, `ItemWorldGhostRevealRuntime`, `WorldVoidReturnRuntime`, and `ItemWorldCaptureOrbRuntime`.
- Do not use `getDistanceSquared()` for intentionally normalized ellipse checks such as steam-burst radius math; keep those formulas explicit.
