# WorldFluidRuntime

`game/src/scenes/world/WorldFluidRuntime.ts` owns LDtk world dynamic-fluid manager instances.

Progress:

- 2026-06-05: `LdtkWorldScene` no longer exposes private pass-through getters for `fluidSystem`, `fluidSpawners`, `fluidCrestFoam`, or `fluidResidue`; callsites reference `WorldFluidRuntime` getters directly.

- Creates and exposes `FluidSystem`, `FluidSpawnerManager`, `FluidCrestFoamManager`, and `FluidResidueManager`.
- Owns grouped teardown/clear calls used by Item World visual release and room reload.
- Owns level attach for dynamic fluid: `attachLevel(level)` attaches `FluidSystem`, clears spawners/crest foam, parses LDtk `FluidSpawner` entities, expands multi-cell rect spawners, and registers them with `FluidSpawnerManager`.
- `WorldFluidFeedbackRuntime` owns player/enemy fluid-contact VFX and residue effects during the movement VFX phase.
- `LdtkWorldScene` still owns arc callbacks, tile mutation integration, tile hazard application, and per-frame fluid simulation/update order.
- Keep the current update order stable unless a gameplay test covers fluid waterfalls, residue, tile mutation, and Item World entry together.

Prevention rules:

- Do not parse LDtk `FluidSpawner` entities in `LdtkWorldScene`; use `WorldFluidRuntime.attachLevel(level)`.
- Keep `FluidSystem.attach(level)` and spawner clearing/registration together so room reloads cannot leave stale waterfalls or foam segments.

Verification: 2026-06-03 `npx tsc --noEmit`, `npm run build`, Puppeteer smoke against `http://localhost:3000/play/?debug=1`, and `git diff --check` passed with only existing line-ending warnings.
