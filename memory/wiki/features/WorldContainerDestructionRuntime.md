# WorldContainerDestructionRuntime

`game/src/scenes/world/WorldContainerDestructionRuntime.ts` owns the LDtk world throwable-container destruction VFX/SFX bundle.

Responsibilities:

- Spawn container shatter VFX using each container's shatter colors and texture.
- Play the shared `breakable_destroy` SFX with the existing randomized speed.
- Apply the existing container break hitstop and camera shake.
- Destroy the container after side effects are emitted.

Scene-owned boundaries:

- `WorldContainerPhysicsRuntime`, `WorldEgoShardCombatRuntime`, and `WorldContainerAttackRuntime` decide when a container breaks.
- `WorldContainerFluidRuntime` owns container fluid painting/effects because those mutate the collision grid, tile overlays, fluid systems, and rerender timing.
