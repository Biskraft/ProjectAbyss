# WorldContainerFluidRuntime

`game/src/scenes/world/WorldContainerFluidRuntime.ts` owns LDtk world throwable-container fluid paint, elemental contact, and dirty refresh timing.

Responsibilities:

- Map container kinds to fluid IntGrid tiles and BFS-paint impact splash cells.
- Apply impact side effects: water solidifies nearby magma, acid exposes nearby containers, magma spawns steam and ignites adjacent cells from painted magma.
- Apply live container/fluid contact effects for magma, acid, charged, and cyro containers.
- Own the container-fluid dirty flag and flush it through `FluidSystem.refreshFromGrid(collisionGrid)` plus `LdtkWorldScene.rerenderTilemap()`.

Boundaries:

- `WorldContainerPhysicsRuntime`, `WorldEgoShardCombatRuntime`, and `WorldContainerAttackRuntime` decide when a container breaks or contacts fluid.
- `WorldContainerDestructionRuntime` still owns destruction VFX/SFX.
- World flush intentionally refreshes the full collision grid and rerenders the tilemap; unlike Item World it does not pass active tile bounds.

Verification: 2026-06-03 `npx tsc --noEmit` passed. Broader build/smoke verification followed in the same session.
