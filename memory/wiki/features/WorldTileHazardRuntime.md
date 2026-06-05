# WorldTileHazardRuntime

`game/src/scenes/world/WorldTileHazardRuntime.ts` owns the per-frame world tile-hazard and fluid simulation loop.

Related runtime boundaries:

- `FluidReactionRuntime` owns shared `FluidSystem` arc/evaporation callbacks plus `TileMutator` steam/electric reaction callback wiring for World and Item World.
- `LdtkWorldScene` still owns wall tile rerender invalidation callbacks after tile mutation.

Current responsibilities:

- Advance `TileHazard` / `TileMutator` overlays against the current room grid.
- Update procedural grass fire propagation and burnable property cleanup.
- Tick breakable burn-out flow and tile-mutation overlay renderer refresh.
- Drive `FluidSystem` and `FluidSpawnerManager` updates (tick, gravity, pressure drain) and crest-foam updates.
- Apply tile/waterfall hazards to the player and enemies:
  - Player/Enemy HP damage with hazard-specific multipliers.
  - Fire/cyro/acid/magma status handling and camera/flash/DN feedback.
  - Death guardrails when HP reaches 0.
- Player tile-hazard feedback, waterfall hazard ticks, and enemy tile-hazard damage loops are shared with Item World through `game/src/scenes/shared/TileHazardRuntimeHelpers.ts`; world still passes its room grid and keeps the tile-hazard death hitstop callback.

Scene-owned boundaries:

- `WorldTileMutationRuntime` owns the wall/surface paint update pipeline and dirty-state handoff.
- `LdtkWorldScene` owns level-level tile change sources and rerender calls.
- `LdtkWorldScene` owns room/segment transitions and player spawn/room-data wiring that gates this runtime?™s inputs.
- `WorldBreakablePropRuntime` / `WorldBurnablePropRuntime` / `WorldGrassFireRuntime` are updated through dependency callbacks to preserve current update ordering.

Invariants:

- Runtime should not mutate scene lifecycle flags directly; it consumes room/player/enemy pointers and mutation/query APIs from deps.
- Scene remains owner of one-off cinematic/stateful effects triggered by specific hazard events.

