# ItemWorldEgoShardImpactRuntime

`game/src/scenes/itemworld/ItemWorldEgoShardImpactRuntime.ts` owns procedural Item World Ego Shard terrain impact reactions and the debug elemental terrain sweeps.

Current responsibilities:

- Apply fire, ice, and thunder shard impact side effects to `fullGrid`.
- Keep fire impact residue ignition and grass-clump ignition together with the impact cell selection.
- Spawn steam/plasma/toxic puffs and camera shake for elemental terrain reactions.
- Refresh fluid bodies only for the same impact paths that previously refreshed them in `ItemWorldScene`.
- Handle debug Shift+1/2/3 terrain sweeps through `ItemWorldDebugInputRuntime` callbacks.

Scene-owned boundaries:

- `ItemWorldScene` still owns Ego Shard projectile flight, enemy hit checks, container hit checks, shard retrieval on enemy death, and manager clearing.
- `ItemWorldContainerFluidRuntime` still owns throwable-container fluid paint/contact reactions; do not move container splash logic into this runtime.
- `ItemWorldTileHazardRuntime` still owns per-frame tile hazards, fluid simulation, and TileMutator overlay ticking.

Verification after extraction: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed. `git diff --check` only reported existing line-ending warnings.
