# ItemWorldStaticEntitySpawner

`game/src/scenes/itemworld/ItemWorldStaticEntitySpawner.ts` owns creation of LDtk-authored static entities for procedural Item World rooms.

Current responsibilities:

- Read room-template entities and instantiate `Building`, `Spike`, `CrackedFloor`, `CollapsingPlatform`, `GrowingWall`, `Switch`, `LockedDoor`, and `ItemDisplay`.
- Preserve room-scoped iid remapping for switch-to-locked-door links when a template is reused in multiple rooms.
- Inject collision into static entities that mutate or depend on the scene `fullGrid`.
- Apply the Item World wall palette filter to LDtk `Building` visuals and place them on the building layer.
- Forward `Memory`, `Camera`, and `Anvil` entities to their dedicated runtimes instead of owning those lifetimes itself.

Scene-owned boundaries:

- Static entity arrays and destroy/clear lifecycle belong to `ItemWorldStaticEntityRegistry`; this spawner only creates instances and appends them to registry arrays.
- `ItemWorldStaticEntityRuntime` still owns per-frame static entity update/interactions.
- `ItemWorldRuntimeCellSpawner` remains the lazy cell attachment owner and delegates static room entity creation through `spawnStaticEntitiesForRoom()`.
- Do not move static clear/update into this spawner; it is intentionally a creation-only boundary.

Verification after registry extraction: `npx tsc --noEmit`, `npm run build`, and `http://localhost:3000/play/?debug=1` Puppeteer smoke passed.
