# ItemWorldBurnablePropRegistry

`game/src/scenes/itemworld/ItemWorldBurnablePropRegistry.ts` owns the procedural Item World burnable-prop array lifecycle.

Current responsibilities:

- Store Tier B `BurnableProp` instances spawned from LDtk `BurnableZone` data.
- Destroy and empty the list during full-map rebuild and stratum reload.

Boundaries:

- `ItemWorldRuntimeCellSpawner` still creates burnable props and registers them with `TileMutator`.
- `ItemWorldTileHazardRuntime` still updates burnable props and removes destroyed entries.
- `ItemWorldScene` still owns `TileMutator`, `GrassClumpFireSystem`, and ash/fluid residue manager reset ordering.
- Do not reintroduce a scene-owned `burnableProps` array; add new consumers through the registry.

Verification after extraction: `npx tsc --noEmit`, `npm run build`, and `http://localhost:3000/play/?debug=1` Puppeteer smoke passed.
