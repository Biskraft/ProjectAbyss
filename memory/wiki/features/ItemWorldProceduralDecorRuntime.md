# ItemWorldProceduralDecorRuntime

`game/src/scenes/itemworld/ItemWorldProceduralDecorRuntime.ts` owns Item World full-map procedural decoration generation.

Current responsibilities:

- Create `ProceduralDecorator` for Item World with the reduced decoration budget and surface overlay enabled.
- Apply item theme, 1/4 Item World density scaling, and stratum-depth density boost.
- Generate deterministic decoration layers from the final stitched `fullGrid`.
- Attach natural, artificial, and structural decoration layers to the scene-owned aggregate containers.
- Procedural decor layer attachment is shared through `game/src/scenes/shared/ProceduralDecorLayerHelpers.ts`; Item World still owns decorator creation options, theme/density policy, seed formula, and grass burnable registration.
- Register generated grass clumps with `GrassClumpFireSystem` and `TileMutator`.

Scene-owned boundaries:

- `ItemWorldScene.buildFullMap()` still decides when generation runs and supplies final `fullGrid`, item theme/id, stratum index, and depth ratio.
- Aggregate container lifetime, palette filters, and burnable cleanup remain scene/runtime-owned elsewhere.
- Keep procedural decoration generation out of `ItemWorldScene`; update this runtime when Item World decoration policy changes.
- Do not move Item World theme/density/seed policy or grass/TileMutator registration into `ProceduralDecorLayerHelpers`; it should stay a layer attach/detach helper.

Verification after extraction: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed. `git diff --check` only reported existing line-ending warnings.

- 2026-06-05: `ProceduralDecorLayerHelpers.detachProceduralDecorLayers()` now uses `DisplayObjectLifecycleHelpers.detachDisplayObject()` for detach-only layer cleanup; Item World theme/density/seed and grass registration policy remain runtime-owned.
