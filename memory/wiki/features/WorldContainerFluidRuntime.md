# WorldContainerFluidRuntime

`game/src/scenes/world/WorldContainerFluidRuntime.ts` owns LDtk world throwable-container fluid paint, elemental contact, and dirty refresh timing.

Responsibilities:

- Map container kinds to fluid IntGrid tiles and BFS-paint impact splash cells.
- Shared helper coverage lives in `game/src/scenes/shared/ContainerFluidHelpers.ts`: container kind to tile mapping, live container/fluid contact effects, acid exposure chaining, water-vs-magma solidification cell mutation, connected-fluid freeze flood fill, and enemy freeze application.
- Impact side effects shared with Item World also live in `ContainerFluidHelpers.ts`: magma steam, water-vs-magma solidification feedback, and acid chain exposure. World still owns BFS splash painting, painted-cell magma neighbor ignition, full-grid fluid refresh, and tilemap rerender.
- Apply impact side effects: water solidifies nearby magma, acid exposes nearby containers, magma spawns steam and ignites adjacent cells from painted magma.
- Apply live container/fluid contact effects for magma, acid, charged, and cyro containers.
- Own the container-fluid dirty flag and flush it through `FluidSystem.refreshFromGrid(collisionGrid)` plus `LdtkWorldScene.rerenderTilemap()`.

Boundaries:

- `WorldContainerPhysicsRuntime`, `WorldEgoShardCombatRuntime`, and `WorldContainerAttackRuntime` decide when a container breaks or contacts fluid.
- `WorldContainerDestructionRuntime` still owns destruction VFX/SFX.
- World flush intentionally refreshes the full collision grid and rerenders the tilemap; unlike Item World it does not pass active tile bounds.
- World BFS paint still owns painted-cell magma neighbor ignition; Item World uses a different radius ignition policy, so do not merge paint algorithms blindly.

Verification: 2026-06-03 `npx tsc --noEmit` passed. Broader build/smoke verification followed in the same session.
