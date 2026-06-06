# WorldTerrainPaletteRuntime

`game/src/scenes/world/WorldTerrainPaletteRuntime.ts` owns LDtk world terrain palette filters and filter bounds pinning.

Current state:

- Owns world shaft background/wall/natural/interior `PaletteSwapFilter` creation and the wall rim `RimLightFilter`.
- Applies renderer terrain filters, procedural decoration filters, and terrain filter/bounds areas.
- Exposes the wall rim filter to `WorldBuilderVisualFilterRuntime` so Giant Builder visuals continue to share the same rim-light treatment.
- `LdtkWorldScene` still owns when renderer/procedural layers are created and when filter areas are refreshed after tilemap rebuilds.

Prevention rules:

- Do not add direct `wallPaletteFilter`, `naturalPaletteFilter`, `wallRimFilter`, `bgPaletteFilter`, or `interiorPaletteFilter` fields back to `LdtkWorldScene`.
- Keep Pixi `filterArea`/`boundsArea` pinning with terrain palette filter ownership; missing bounds can make palette-filtered terrain disappear during camera render-target translation.
- Keep palette rows sourced from `Sheets/Content_System_Area_Palette.csv` through `areaPalettes.ts`.

Verification on 2026-06-03: `npx tsc --noEmit`, `npm run build`, and `http://localhost:3000/play/?debug=1` Puppeteer smoke passed.

- 2026-06-05: Wall palette selection is now level-aware. `LdtkWorldScene` resolves both BG and WALL AreaIDs per level prefix and calls `WorldTerrainPaletteRuntime.applyAreaPalette(bgAreaId, wallAreaId)` before rendering; `prologue_` maps use `world_prologue_bg` plus `world_prologue_wall`. Rim-light color is derived from the active wall palette instead of a hardcoded orange constant.

