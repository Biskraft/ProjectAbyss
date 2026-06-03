# ItemWorldBreakablePropRuntime

`game/src/scenes/itemworld/ItemWorldBreakablePropRuntime.ts` owns Item World procedural breakable-prop creation and destruction side effects.

Current responsibilities:

- Run `BreakableProp.break()` and destroy the prop after side effects complete.
- Reset and spawn procedural Item World breakable props from the current fullGrid.
- Keep the existing start-room 8-tile exclusion radius so entry/landing stays clear.
- Attach spawned prop containers to the entity layer and register them with `TileMutator` as burnable.
- Apply sword-only hitstop, camera shake, and hit-spark direction from player facing.
- Spawn prop shatter VFX using the prop palette/artifact texture.
- Play the shared `breakable_destroy` SFX.
- Convert gold drops into burst `GoldPickup` instances registered to the scene-owned pickup list and entity layer.
- Apply flask drops directly to the player's flask charges.

Scene-owned boundaries:

- `ItemWorldScene` still owns the breakable-prop list reference, pickup lifecycle, and callbacks exposed to `ItemWorldStaticEntityRuntime` and `ItemWorldTileHazardRuntime`.
- `ItemWorldStaticEntityRuntime` and `ItemWorldTileHazardRuntime` still decide when a prop should break; this runtime only owns the consequence bundle.
- Do not duplicate prop spawning or prop drop/VFX handling in the scene when adding new prop break sources.

Verification after extraction: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed. `git diff --check` only reported existing line-ending warnings.
