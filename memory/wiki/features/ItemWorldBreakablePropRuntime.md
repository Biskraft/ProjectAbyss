# ItemWorldBreakablePropRuntime

`game/src/scenes/itemworld/ItemWorldBreakablePropRuntime.ts` owns Item World procedural breakable-prop creation and destruction side effects.

Current responsibilities:

- Run `BreakableProp.break()` and destroy the prop after side effects complete.
- Reset and spawn procedural Item World breakable props from the current fullGrid.
- Item World does not have a separate `ItemWorldBreakablePropRegistry`; this runtime manages the scene-owned `BreakableProp[]` reference through `getBreakableProps()`.
- Breakable prop array clear/destroy and add/attach lifecycle now shares `game/src/scenes/shared/BreakablePropRegistryHelpers.ts`; spawn exclusions and `TileMutator.registerBurnable()` stay in this runtime.
- Keep the existing start-room 8-tile exclusion radius so entry/landing stays clear.
- Attach spawned prop containers to the entity layer and register them with `TileMutator` as burnable.
- Apply sword-only hitstop, camera shake, and hit-spark direction from player facing.
- Spawn prop shatter VFX using the prop palette/artifact texture.
- Play the shared `breakable_destroy` SFX.
- Convert gold drops into burst `GoldPickup` instances registered to the scene-owned pickup list and entity layer.
- Apply flask drops directly to the player's flask charges.
- Gold/flask drop handling after `BreakableProp.break()` is shared through `game/src/scenes/shared/BreakableDropHelpers.ts`; Item World-specific spawn exclusion, VFX/SFX feedback, and final `prop.destroy()` stay in this runtime.
- Breakable prop destruction feedback after `BreakableProp.break()` is shared through `game/src/scenes/shared/BreakableFeedbackHelpers.ts`; Item World-specific spawn exclusion and final `prop.destroy()` stay in this runtime.
- The post-`break()` feedback+drop bundle is coordinated through `game/src/scenes/shared/BreakablePropDestructionHelpers.ts`; `BreakableProp.break()` and final `prop.destroy()` remain Item World-owned.
- `BreakableFeedbackHelpers` expects `getArtifactTexture(): Texture | null`, matching `BreakableProp`; keep artifact texture passing as a Pixi texture/null value.

Scene-owned boundaries:

- `ItemWorldScene` still owns the breakable-prop list reference, pickup lifecycle, and callbacks exposed to `ItemWorldStaticEntityRuntime` and `ItemWorldTileHazardRuntime`.
- `ItemWorldStaticEntityRuntime` and `ItemWorldTileHazardRuntime` still decide when a prop should break; this runtime only owns the consequence bundle.
- Do not duplicate prop spawning or prop drop/VFX handling in the scene when adding new prop break sources.
- Do not move `BreakableProp.break()` or final `prop.destroy()` into shared helpers; shared code should stay limited to leaf feedback/drop effects.
- Do not create a parallel `ItemWorldBreakablePropRegistry` unless ownership changes intentionally; current lifecycle sharing is through `BreakablePropRegistryHelpers`.

Verification after extraction: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed. `git diff --check` only reported existing line-ending warnings.
