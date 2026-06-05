# WorldGrassFireRuntime

`game/src/scenes/world/WorldGrassFireRuntime.ts` owns LDtk world procedural grass-fire and ash-remnant manager instances.

- Creates and exposes the `GrassClumpFireSystem` used by builder grass registration and procedural grass clump ignition.
- Registers procedural grass clumps as TileMutator burnables through `registerProceduralBurnables()`.
- Creates, updates, and clears `AshRemnantManager`.
- `LdtkWorldScene` still owns burnable-prop policy, TileMutator mutation policy, and when to register or ignite clumps.
- `releaseWorldVisualsForItemWorld()` still clears grass fire state only, matching the prior behavior; room load clears ash separately.

Verification: 2026-06-03 `npx tsc --noEmit`, `npm run build`, Puppeteer smoke against `http://localhost:3000/play/?debug=1`, and `git diff --check` passed. `git diff --check` only printed existing line-ending warnings.

- 2026-06-05: `registerProceduralBurnables()` now owns the procedural clump registration loop into `TileMutator`; `LdtkWorldScene` still decides when level-load procedural decor registration runs. Verified with `npx tsc --noEmit` and `npm run build` from `game/`; build retains the existing LDtk `atlas/prologue_01.png` CSV warning only.
