# ItemWorldContainerFluidRuntime

`game/src/scenes/itemworld/ItemWorldContainerFluidRuntime.ts` owns Item World throwable-container interactions with fluid/elemental grid cells.

Current responsibilities:

- Paint container splash impact tiles into the unified Item World grid.
- Convert container kind to IntGrid fluid tile value.
- Shared helper coverage lives in `game/src/scenes/shared/ContainerFluidHelpers.ts`: container kind to tile mapping, live container/fluid contact effects, acid exposure chaining, water-vs-magma solidification cell mutation, connected-fluid freeze flood fill, and enemy freeze application.
- Impact side effects shared with World also live in `ContainerFluidHelpers.ts`: magma steam, water-vs-magma solidification feedback, and acid chain exposure. Item World still owns radius-based magma ignition and active-bounds fluid refresh.
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
- Item World splash paint still owns radius-based magma ignition and active-bounds fluid refresh; World uses a different painted-cell ignition plus tilemap rerender policy.

Verification after extraction: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed. `git diff --check` only reported existing line-ending warnings.
