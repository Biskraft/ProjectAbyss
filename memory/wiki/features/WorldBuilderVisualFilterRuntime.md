# WorldBuilderVisualFilterRuntime

`game/src/scenes/world/WorldBuilderVisualFilterRuntime.ts` owns LDtk world Giant Builder palette filter construction and application.

Invariants:

- The runtime owns builder-specific background, wall, interior-wall, and natural `PaletteSwapFilter` instances.
- `LdtkWorldScene` still owns the host world palette filters and shared `RimLightFilter`.
- `initialize(atlas)` must use `world_shaft_builder_bg` and `world_shaft_builder_wall` palette rows from `Content_System_Area_Palette.csv`.
- `apply(builder, wallRimFilter)` applies the builder palette to decorator/body/interior/outside/leg layers and pins filter bounds after leg filters are set.
- Builder interior uses the same wall palette row as builder walls so split LDtk layers stay visually coherent while the builder moves.
- Do not reintroduce `builderBgPaletteFilter`, `builderWallPaletteFilter`, `builderInteriorWallPaletteFilter`, `builderNaturalPaletteFilter`, or `applyBuilderVisualFilters()` to `LdtkWorldScene`.

Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed with only existing line-ending warnings.
