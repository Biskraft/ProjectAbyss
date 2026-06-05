# ContainerDestructionRuntime

`game/src/scenes/shared/ContainerDestructionRuntime.ts` owns the shared throwable-container destruction VFX/SFX bundle used by LDtk World and Item World.

Current responsibilities:

- Spawn container shatter VFX using each container's shatter colors and texture.
- Play the shared `breakable_destroy` SFX with the existing randomized speed.
- Apply the existing container break hitstop and camera shake.
- Destroy the container after side effects are emitted.

Item World boundaries:

- `ItemWorldContainerFluidRuntime` still owns container fluid painting/effects and dirty flushes.
- `ItemWorldContainerPhysicsRuntime`, `ItemWorldStaticEntityRuntime`, and `ItemWorldEgoShardCombatRuntime` still decide when a container breaks.
- `ItemWorldScene.destroyContainerWithVFX()` remains as the callback adapter used by existing runtimes.
- Do not recreate an Item World-local destruction runtime unless behavior intentionally diverges.

Verification after extraction: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed. `git diff --check` only reported existing line-ending warnings.
