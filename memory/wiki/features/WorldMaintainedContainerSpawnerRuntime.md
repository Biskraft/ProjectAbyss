# WorldMaintainedContainerSpawnerRuntime

`game/src/scenes/world/WorldMaintainedContainerSpawnerRuntime.ts` owns LDtk world `ContainerSpawner` entities with `Maintain=true`.

Current state:

- `WorldContainerSpawnRuntime` performs the initial `ContainerSpawner` pass while loading a level because it also builds entity occupancy and settles the initial container batch.
- After initial spawn, `WorldContainerSpawnRuntime` registers maintained spawners with this runtime.
- The runtime owns the maintained spawner list, 500 ms re-check cadence, owned-container pruning, refill seed calculation, visual attachment, and spawn-time settling for refilled containers.
- Refill still happens only when all containers owned by that spawner have been destroyed. Partial losses do not trigger immediate replacement.

Prevention rules:

- Do not add `maintainedSpawners`, `MAINTAIN_CHECK_MS`, or `tickMaintainedSpawners()` back to `LdtkWorldScene`.
- Keep regular throwable-container physics, carrying, impact paint, and destruction VFX out of this runtime until the larger world container system is intentionally extracted.
- Keep the refill path using `runContainerSpawner()` so initial spawn and maintained refill keep the same placement semantics.

Verification on 2026-06-03: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed with only existing line-ending warnings.
