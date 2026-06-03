# WorldCrackedFloorRuntime

`game/src/scenes/world/WorldCrackedFloorRuntime.ts` owns LDtk world `CrackedFloor` spawn and shatter policy.

Responsibilities:

- Spawn active `CrackedFloor` entities from LDtk, inject their collision cells, and attach them through `WorldCrackedFloorRegistry`.
- Skip floors whose persistent crack key is already present in `WorldProgressState.unlockedEvents`.
- Handle player sword attack shatter checks.
- Handle surge and dive-landing cracked-floor shatter checks through scene-provided AABBs/impact parameters.
- Apply cracked-floor persistence, hitstop, screen flash, camera shake, toasts, and registry cleanup after shatter.

Boundaries:

- `WorldCrackedFloorRegistry` still owns the active floor list, entity-layer attachment, and remove-at cleanup.
- `WorldPlayerImpactRuntime` owns dive landing enemy damage and surge/dive impact dispatch; this runtime owns only cracked-floor shatter policy and cleanup.
- Keep cracked-floor spawn before player placement in `loadLevel()` so destroyed floors do not re-inject stale collision.

Verification: 2026-06-03 `npx tsc --noEmit` passed. Broader build/smoke verification followed in the same session.
