# ItemWorldContainerRegistry

`game/src/scenes/itemworld/ItemWorldContainerRegistry.ts` owns the procedural Item World throwable-container array lifecycle.

Current responsibilities:

- Store the shared `ThrowableContainer[]` list used by carry, physics, fluid, debug, static entity, and Ego Shard runtimes.
- Reset or clear the list during stratum reload/full-map rebuild.
- Destroy containers on clear.
- Settle all containers spawned during full-map build in dependency order.
- Check whether the player is standing on a container top for one-way-platform handling.

Boundaries:

- Grab/carry input remains in `ItemWorldContainerCarryRuntime`.
- Body physics, overlap, thrown hits, and fluid flush ordering remain in `ItemWorldContainerPhysicsRuntime`.
- Fluid painting/effects remain in `ItemWorldContainerFluidRuntime`.
- VFX/SFX destruction remains in `ItemWorldContainerDestructionRuntime`.
- `ItemWorldScene` may still iterate the registry array for scene-owned fluid arc and steam burst effects.
- Do not reintroduce a scene-owned `containers` array; add new container consumers through the registry.

Verification after extraction: `npx tsc --noEmit`, `npm run build`, and `http://localhost:3000/play/?debug=1` Puppeteer smoke passed.
