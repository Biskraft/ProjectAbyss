# WorldContainerRegistry

`game/src/scenes/world/WorldContainerRegistry.ts` owns the LDtk world throwable-container array lifecycle.

Current state:

- The registry owns the active `ThrowableContainer[]` list, entity-layer attachment for new containers, remove-at cleanup, and room-clear cleanup.
- Container list add/attach, addMany, remove-at destroy/splice, and clear destroy lifecycle are shared through `game/src/scenes/shared/ContainerRegistryHelpers.ts`.
- `WorldContainerSpawnRuntime` owns LDtk `Container` and initial `ContainerSpawner` creation decisions.
- `LdtkWorldScene` still owns container physics update order, grab/carry state, player/enemy/container collision, thrown impact damage, Ego Shard container hits, fluid paint/effects, and debug-spawn input policy.
- `LdtkWorldScene` currently keeps a private compatibility getter for read/iteration paths, but the backing array is registry-owned.

Prevention rules:

- Do not add a scene-owned `containers` array back to `LdtkWorldScene`.
- Use `WorldContainerRegistry.add()` for new world containers so visual attachment and list ownership stay together.
- Use `removeAt()` / `clear()` for lifecycle cleanup instead of manually destroying containers and splicing arrays in the scene.
- Do not parse LDtk `Container` or initial `ContainerSpawner` entities in the scene; use `WorldContainerSpawnRuntime.spawnForLevel()`.
- Keep `WorldMaintainedContainerSpawnerRuntime` focused on maintained spawner refill policy; regular container physics and VFX remain outside that runtime until intentionally extracted.
- Do not move LDtk spawn parsing, maintained-spawner policy, carry/physics/fluid/destruction behavior, or debug-spawn policy into `ContainerRegistryHelpers`; it should stay a list/container lifecycle helper.

Verification on 2026-06-03: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed with only existing line-ending warnings.
