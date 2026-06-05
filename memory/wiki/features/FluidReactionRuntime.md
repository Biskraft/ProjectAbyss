# FluidReactionRuntime

`game/src/scenes/shared/FluidReactionRuntime.ts` owns shared fluid reaction callback wiring for LDtk World and Item World.

Responsibilities:

- Bind `FluidSystem` arc scan/discharge and evaporation callbacks.
- Scan player, alive enemies, metal crates, and conductive/fluid cells for arc links.
- Apply arc discharge damage, charged state, damage numbers, camera shake, and thunder-chain tile mutation.
- Drop permanent fluid residue for oil/acid/magma evaporation events.
- Bind `TileMutator` steam/electric callbacks for steam puffs, hit sparks, acid steam burst damage, and steam lift.

Boundaries:

- Host scenes still own when callbacks are bound during scene initialization.
- World and Item World still own their own `FluidSystem`, spawner, foam, residue, tile-mutator, and wall-tile rerender lifecycles.
- `WorldFluidFeedbackRuntime` and `ItemWorldMovementVfxRuntime` still own per-frame movement/contact feedback.
- Tile hazard runtimes still own per-frame tile-hazard/fluid simulation order.
- Do not move wall tile rerender invalidation, static tile mutation ordering, or collision-grid replacement into this runtime.

Verification: 2026-06-05 `npm run build` from `game/` passed. Build retains the existing LDtk `atlas/prologue_01.png` CSV warning only.
