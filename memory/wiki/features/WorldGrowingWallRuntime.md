# WorldGrowingWallRuntime

`game/src/scenes/world/WorldGrowingWallRuntime.ts` owns LDtk world `GrowingWall` spawn, update, slime handoff, and shatter policy.

Responsibilities:

- Spawn LDtk `GrowingWall` entities, inject collision, and attach them through `WorldGrowingWallRegistry`.
- Skip walls whose persistent `gwall_*` key is already present in `WorldProgressState.unlockedEvents`.
- Update active walls every frame and hand pending spawned slimes to the scene callback after assigning `roomData` and `target`.
- Handle surge and dive-landing growing-wall shatter checks.
- Apply shatter persistence, hitstop, screen flash, camera shake, hit sparks, toasts, and registry cleanup.

Boundaries:

- `WorldGrowingWallRegistry` still owns active wall list, entity-layer attachment, and remove-at cleanup.
- `LdtkWorldScene` still owns enemy registry insertion through the `addSpawnedSlime` callback.
- `WorldPlayerImpactRuntime` owns dive landing enemy damage and surge/dive impact dispatch; this runtime owns only growing-wall shatter policy and cleanup.

Verification: 2026-06-03 `npx tsc --noEmit` passed. Broader build/smoke verification followed in the same session.
