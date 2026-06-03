# ItemWorldContainerDestructionRuntime

`game/src/scenes/itemworld/ItemWorldContainerDestructionRuntime.ts` owns the Item World throwable-container destruction VFX/SFX bundle.

Current responsibilities:

- Spawn container shatter VFX using each container's shatter colors and texture.
- Play the shared `breakable_destroy` SFX with the existing randomized speed.
- Apply the existing container break hitstop and camera shake.
- Destroy the container after side effects are emitted.

Scene-owned boundaries:

- `ItemWorldContainerFluidRuntime` still owns container fluid painting/effects and dirty flushes.
- `ItemWorldContainerPhysicsRuntime`, `ItemWorldStaticEntityRuntime`, and `ItemWorldEgoShardCombatRuntime` still decide when a container breaks.
- `ItemWorldScene.destroyContainerWithVFX()` remains as the callback adapter used by existing runtimes.

Verification after extraction: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed. `git diff --check` only reported existing line-ending warnings.
