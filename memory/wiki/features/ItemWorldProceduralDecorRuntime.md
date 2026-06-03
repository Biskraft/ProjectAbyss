# ItemWorldProceduralDecorRuntime

`game/src/scenes/itemworld/ItemWorldProceduralDecorRuntime.ts` owns Item World full-map procedural decoration generation.

Current responsibilities:

- Create `ProceduralDecorator` for Item World with the reduced decoration budget and surface overlay enabled.
- Apply item theme, 1/4 Item World density scaling, and stratum-depth density boost.
- Generate deterministic decoration layers from the final stitched `fullGrid`.
- Attach natural, artificial, and structural decoration layers to the scene-owned aggregate containers.
- Register generated grass clumps with `GrassClumpFireSystem` and `TileMutator`.

Scene-owned boundaries:

- `ItemWorldScene.buildFullMap()` still decides when generation runs and supplies final `fullGrid`, item theme/id, stratum index, and depth ratio.
- Aggregate container lifetime, palette filters, and burnable cleanup remain scene/runtime-owned elsewhere.
- Keep procedural decoration generation out of `ItemWorldScene`; update this runtime when Item World decoration policy changes.

Verification after extraction: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed. `git diff --check` only reported existing line-ending warnings.
