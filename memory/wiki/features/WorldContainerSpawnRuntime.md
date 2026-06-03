# WorldContainerSpawnRuntime

`game/src/scenes/world/WorldContainerSpawnRuntime.ts` owns LDtk world initial throwable-container spawning during `LdtkWorldScene.loadLevel()`.

Current state:

- The runtime reads authored `Container` entities, resolves explicit kind / `Generic_A/B/C` slots, creates `ThrowableContainer` instances, and attaches them through `WorldContainerRegistry`.
- The runtime performs the initial `ContainerSpawner` pass, including occupied-cell construction, debug spawner rectangles, stable per-level auto-seeding, and initial spawned-container settling.
- Debug Shift+G container spawning routes to `debugSpawnNear(playerX, playerY)` so ad hoc container creation also uses registry attachment.
- Maintained spawners are registered with `WorldMaintainedContainerSpawnerRuntime` after the initial pass. Refill policy remains owned by that runtime.
- `LdtkWorldScene` now only clears the registry on room load and calls `worldContainerSpawnRuntime.spawnForLevel(level)`.

Prevention rules:

- Do not move LDtk `Container` or initial `ContainerSpawner` parsing back into `LdtkWorldScene`.
- Keep initial spawn and maintained refill on `runContainerSpawner()` so both paths share placement semantics.
- Use `WorldContainerRegistry.add()` for every new initial-spawn container so entity-layer attachment and list ownership remain centralized.
- Keep debug container creation in this runtime instead of adding scene-local `new ThrowableContainer(...)` helpers.

Verification on 2026-06-03: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed with only existing line-ending warnings.
