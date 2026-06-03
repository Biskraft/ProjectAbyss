# ItemWorldRuntimeCellSpawner

`game/src/scenes/itemworld/ItemWorldRuntimeCellSpawner.ts` owns runtime attachment for procedural Item World cells as they become active.

Current responsibilities:

- Track spawned cell keys and prevent duplicate per-cell runtime attachment.
- Spawn LDtk `Container` entities and procedural `ContainerSpawner` output for the active cell.
- Spawn LDtk `FluidSpawner` entities into the scene-owned fluid spawner list.
- Apply `BurnableZone` entities through the shared burnable-zone helper, append resulting props to `ItemWorldBurnablePropRegistry`, and register them with `TileMutator`.
- Settle newly spawned containers for several short physics steps so authored/spawned containers do not start intersecting nearby solids.
- Delegate static room entities through the scene callback after dynamic cell spawns.

Scene-owned boundaries:

- `ItemWorldScene` still owns full map construction, cell visual records, tile mutation, static entity construction, and fluid spawner ownership.
- Container arrays belong to `ItemWorldContainerRegistry`; burnable-prop arrays belong to `ItemWorldBurnablePropRegistry`.
- `spawnStaticEntitiesForRoom()` remains scene-owned for now because it wires many static entity types plus camera zones, memory triggers, residents, trapdoors, and anvils.
- Do not re-add eager full-map runtime entity spawning in `buildFullMap()`. Cell runtime attachment should stay lazy and deduplicated through this runtime.

Verification after extraction: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed. `git diff --check` only reported existing line-ending warnings.
