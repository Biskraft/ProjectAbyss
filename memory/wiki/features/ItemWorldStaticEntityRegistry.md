# ItemWorldStaticEntityRegistry

`game/src/scenes/itemworld/ItemWorldStaticEntityRegistry.ts` owns the procedural Item World static-entity arrays and destroy/clear lifecycle.

Current responsibilities:

- Store LDtk-authored static entity lists: spikes, cracked floors, breakable props, collapsing platforms, growing walls, switches, locked doors, buildings, and item displays.
- Destroy and empty those lists during floor rebuild, stratum transition, and scene cleanup through `clear()`.

Boundaries:

- `ItemWorldStaticEntitySpawner` still owns entity creation and pushes new instances into this registry.
- `ItemWorldStaticEntityRuntime`, `ItemWorldTileHazardRuntime`, and `ItemWorldBreakablePropRuntime` still own update/interactions and consume the registry arrays through scene-provided getters.
- `ItemWorldScene` still owns non-registry cleanup for camera zones, memory triggers, residents, trapdoors, and Item World anvils.
- `ItemWorldScene` should call existing runtimes directly for tile hazards, static-entity updates, container fluid/destruction, and Ego Shard impact; avoid re-adding one-line scene wrappers around those runtimes.
- Do not reintroduce scene-owned static entity arrays; use the registry when adding new static entity types.

Verification after extraction: `npx tsc --noEmit`, `npm run build`, and `http://localhost:3000/play/?debug=1` Puppeteer smoke passed.
