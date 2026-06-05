# ItemWorldTileHazardRuntime

`game/src/scenes/itemworld/ItemWorldTileHazardRuntime.ts` owns the procedural Item World per-frame tile hazard and fluid simulation loop.

Current responsibilities:

- Compute active fluid/tile bounds around the camera with current-room fallback.
- Tick `TileMutator` overlays against the unified Item World grid.
- Update and clean up Tier B `BurnableProp` entities from `ItemWorldBurnablePropRegistry`.
- Run grass clump fire propagation and ash remnant updates.
- Process `BreakableProp` burn-out through the scene's shared breakable destroy callback.
- Update `TileMutatorRenderer` overlays.
- Coalesce wall-tile mutation refreshes through an internal `fluidGridDirty` flag.
- Update `FluidSpawnerManager`, `FluidSystem`, gravity ticks, pressure drains, and crest foam.
- Apply tile and waterfall hazards to the player, including damage feedback, death, burn/cyro/acid/magma state, and screen/camera feedback.
- Apply tile hazards to enemies using elemental multipliers and spawn enemy hazard damage numbers.
- Player tile-hazard feedback, waterfall hazard ticks, and enemy tile-hazard damage loops are shared with world through `game/src/scenes/shared/TileHazardRuntimeHelpers.ts`; Item World still passes the unified full grid and keeps active-bounds fluid simulation ownership.

Scene-owned boundaries:

- `ItemWorldFullMapLayerRuntime` owns wall-mutation visual masks and hardened-wall overlays because they repaint aggregate room visuals.
- Burnable-prop list storage and rebuild-time clear belong to `ItemWorldBurnablePropRegistry`.
- `ItemWorldScene` still wires `TileMutator.onWallTileChanged` and forwards wall-to-air / hardened-wall events to `ItemWorldFullMapLayerRuntime`.
- Container fluid impact helpers live in `ItemWorldContainerFluidRuntime`; they use this runtime's active tile bounds through dependency wiring.
- `ItemWorldStaticEntityRuntime` triggers tile hazards directly through this runtime to preserve the static-entity update order.
- Do not move boss clear, item rewards, or room topology transitions into this runtime.

Verification after extraction: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed. `git diff --check` only reported existing line-ending warnings.
