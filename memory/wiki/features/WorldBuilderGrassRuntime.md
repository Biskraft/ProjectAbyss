# WorldBuilderGrassRuntime

`game/src/scenes/world/WorldBuilderGrassRuntime.ts` owns Giant Builder procedural grass clump registration into the world fire/tile mutation systems.

Invariants:

- The runtime reads builder decorator grass clumps and registers them with `GrassClumpFireSystem.registerWithCellResolver()`.
- The resolver converts builder-local clump cells into world cells from the current rounded builder container position.
- Registered clumps are forwarded to `TileMutator.registerBurnable()` so normal fire propagation can ignite builder grass.
- `LdtkWorldScene` still owns the `GrassClumpFireSystem`, `TileMutator`, and active `GiantBuilder` lifetimes.
- Do not reintroduce `registerBuilderGrassClumps()` to `LdtkWorldScene`.

Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed with only existing line-ending warnings.
