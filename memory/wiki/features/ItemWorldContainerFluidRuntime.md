# ItemWorldContainerFluidRuntime

`game/src/scenes/itemworld/ItemWorldContainerFluidRuntime.ts` owns Item World throwable-container interactions with fluid/elemental grid cells.

Current responsibilities:

- Paint container splash impact tiles into the unified Item World grid.
- Convert container kind to IntGrid fluid tile value.
- Ignite nearby flammable cells after magma splashes.
- Spawn steam puffs for magma, acid, and water/magma reactions.
- Solidify magma hit by `WaterBarrel` impacts and notify `TileMutator.onWallTileChanged`.
- Apply `AcidVial` container-chain exposure to nearby containers.
- Coalesce fluid mesh refreshes behind an internal dirty flag.
- Apply per-frame contact effects for `MagmaCrucible`, `AcidVial`, `ChargedCrate`/`ChargedCell`, and `CyroCanister`.
- Freeze connected fluid bodies for `CyroCanister` contact and freeze enemies standing in newly frozen cells.

Scene-owned boundaries:

- `ItemWorldScene` still owns container spawning, carrying, thrown-hit VFX, shatter VFX, and debug container spawn commands.
- `ItemWorldContainerPhysicsRuntime`, `ItemWorldStaticEntityRuntime`, and `ItemWorldEgoShardProjectileRuntime` should call this behavior through the scene wrapper or directly if their dependency contracts are updated together.
- `ItemWorldScene.getActiveTileBounds()` remains the public scene wrapper and delegates to `ItemWorldTileHazardRuntime`; this runtime uses it only for fluid mesh refresh.
- Do not move `onEgoShardImpact()` elemental terrain reactions into this runtime; that still mixes player attack/enchant behavior, residue, and shard retrieval.

Verification after extraction: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed. `git diff --check` only reported existing line-ending warnings.
