# ItemWorldEntryCorridorRuntime

- `game/src/scenes/itemworld/ItemWorldEntryCorridorRuntime.ts` owns orchestration for the optional Item World entry corridor sequence.
- It composes:
  - `ItemWorldEntryCorridorState`
  - `ItemWorldEntryCorridorRevealRuntime`
  - `ItemWorldEntryCorridorVisibilityRuntime`
  - `ItemWorldEntryCorridorVisualRuntime`
- Scene ownership responsibilities moved to this runtime include:
  - Selecting/building deterministic corridor composites.
  - Spawning player start and handling completion handoff.
  - Applying/clearing corridor-only camera and visual suppression behavior.
- Exit behavior:
  - Completes when player reaches corridor bottom.
  - Restores world room data and world camera bounds.
  - Rebuilds player spawn position for current stratum start room and returns control to normal gameplay flow.
- This runtime intentionally does not own save/progress mutations; scene handles room state persistence boundaries separately.
