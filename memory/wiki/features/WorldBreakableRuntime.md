# WorldBreakableRuntime

`game/src/scenes/world/WorldBreakableRuntime.ts` owns LDtk world `Breakable` entity spawning, update delegation, and sword-hit destruction.

Responsibilities:

- Spawn LDtk `Breakable` entities using the authored `Sprite` enum, with `SignBoard_Save` fallback.
- Delegate per-frame `Breakable.update()` through `WorldBreakableRegistry`.
- Handle player sword hit checks for all registry breakables, including builder-spawned breakables.
- Apply hitstop, camera shake, shatter VFX, SFX, hit sparks, gold burst drops, flask charge drops, and registry cleanup.

Boundaries:

- `WorldBreakableRegistry` still owns the active list, entity-layer attachment, membership checks for builder attachments, and remove-at cleanup.
- Builder-spawned `Breakable` creation lives in `WorldBuilderStaticEntityRuntime` because it needs builder attachment wiring; destruction and drops still flow through this runtime and the shared registry.
- Procedural `BreakableProp` remains separate and scene-owned for now; do not mix it into this runtime.

Verification: 2026-06-03 `npx tsc --noEmit` passed. Broader build/smoke verification followed in the same session.
