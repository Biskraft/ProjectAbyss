# WorldContainerPhysicsRuntime

`game/src/scenes/world/WorldContainerPhysicsRuntime.ts` owns LDtk world throwable-container body physics and overlap resolution.

Invariants:

- `WorldContainerRegistry` still owns the container list and `removeAt()` lifecycle.
- `WorldContainerCarryRuntime` still owns grab/carry/prompt/tether state; physics skips held or destroyed containers.
- The runtime owns per-frame container body updates, environmental impact checks, thrown-container enemy hits, player/container overlap resolution, enemy/container overlap resolution, container/container overlap resolution, player pre-update top-support checks, player-pushed X occupancy checks, and final container-fluid flush delegation.
- The per-frame physics orchestration is shared with Item World through `game/src/scenes/shared/ContainerPhysicsRuntimeHelpers.ts`; world keeps only its LDtk dependency wiring and `isPlayerStandingOnTop()` public query.
- `WorldContainerFluidRuntime` owns paint/effect/dirty-refresh callbacks; `WorldContainerDestructionRuntime` owns destruction VFX/SFX.
- Wood-family containers continue to treat fluid cells as support through the runtime's `isContainerSolidCellFor()` rule.
