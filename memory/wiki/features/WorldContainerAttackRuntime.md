# WorldContainerAttackRuntime

`game/src/scenes/world/WorldContainerAttackRuntime.ts` owns LDtk world player sword-hit checks against throwable containers.

Responsibilities:

- Read the active player attack hitbox via `getActivePlayerAttackHitbox()`.
- Apply player `atk` damage to overlapping non-held, non-destroyed containers.
- Preserve MetalCrate sword-hit immunity while still spawning the existing strong hit spark.
- On container break, call `WorldContainerFluidRuntime.paintImpact()`, `WorldContainerDestructionRuntime.destroyWithVfx()`, and `WorldContainerRegistry.removeAt()`.

Boundaries:

- `WorldContainerPhysicsRuntime` owns body physics, thrown-container impacts, overlaps, environmental impact checks, and final fluid flush delegation.
- `WorldEgoShardCombatRuntime` owns Ego Shard container-hit policy.
- `WorldContainerDestructionRuntime` owns the VFX/SFX bundle only; it does not decide break policy.
- `WorldContainerFluidRuntime` owns fluid paint/effect/dirty refresh policy.

Verification: 2026-06-03 `npx tsc --noEmit`, `npm run build`, Puppeteer smoke against `http://localhost:3000/play/?debug=1`, and `git diff --check` passed. `git diff --check` only printed existing line-ending warnings.
