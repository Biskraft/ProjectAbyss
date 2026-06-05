# ContainerDestructionRuntime

`game/src/scenes/shared/ContainerDestructionRuntime.ts` owns the shared throwable-container destruction VFX/SFX bundle used by LDtk World and Item World.

Responsibilities:

- Spawn container shatter VFX using each container's shatter colors and texture.
- Play the shared `breakable_destroy` SFX with the existing randomized speed.
- Apply the existing container break hitstop and camera shake.
- Destroy the container after side effects are emitted.

World boundaries:

- `WorldContainerPhysicsRuntime`, `WorldEgoShardCombatRuntime`, and `WorldContainerAttackRuntime` decide when a container breaks.
- `WorldContainerFluidRuntime` owns container fluid painting/effects because those mutate the collision grid, tile overlays, fluid systems, and rerender timing.
- `LdtkWorldScene` wires the shared runtime as the callback adapter; do not recreate a world-local destruction runtime unless behavior intentionally diverges.
