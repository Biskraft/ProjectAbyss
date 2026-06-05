# WorldBreakableRuntime

`game/src/scenes/world/WorldBreakableRuntime.ts` owns LDtk world `Breakable` entity spawning, update delegation, and sword-hit destruction.

Responsibilities:

- Spawn LDtk `Breakable` entities using the authored `Sprite` enum, with `SignBoard_Save` fallback.
- Delegate per-frame `Breakable.update()` through `WorldBreakableRegistry`.
- Handle player sword hit checks for all registry breakables, including builder-spawned breakables.
- Apply hitstop, camera shake, shatter VFX, SFX, hit sparks, gold burst drops, flask charge drops, and registry cleanup.
- Gold/flask drop handling after `Breakable.break()` is shared through `game/src/scenes/shared/BreakableDropHelpers.ts`; authored breakable spawning, sword hit detection, VFX/SFX feedback, and registry cleanup stay in this runtime.
- Breakable destruction feedback after `Breakable.break()` is shared through `game/src/scenes/shared/BreakableFeedbackHelpers.ts`; this runtime still owns the sword-hit loop and registry removal.
- `BreakableFeedbackHelpers` expects `getArtifactTexture(): Texture | null`, matching `Breakable` and `BreakableProp`; do not widen this back to string IDs.

Boundaries:

- `WorldBreakableRegistry` still owns the active list, entity-layer attachment, membership checks for builder attachments, and remove-at cleanup.
- Builder-spawned `Breakable` creation lives in `WorldBuilderStaticEntityRuntime` because it needs builder attachment wiring; destruction and drops still flow through this runtime and the shared registry.
- Procedural `BreakableProp` remains separate and scene-owned for now; do not mix it into this runtime.
- Do not move `Breakable.break()` or `WorldBreakableRegistry.removeAt()` into shared helpers; shared code should stay limited to leaf feedback/drop effects.

Verification: 2026-06-03 `npx tsc --noEmit` passed. Broader build/smoke verification followed in the same session.
