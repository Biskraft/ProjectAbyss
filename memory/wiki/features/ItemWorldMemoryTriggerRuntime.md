# ItemWorldMemoryTriggerRuntime

`game/src/scenes/itemworld/ItemWorldMemoryTriggerRuntime.ts` owns LDtk `Memory` entity trigger visuals and re-readable lore activation in procedural Item World rooms.

Current responsibilities:

- Build the orange shard/glow/particle visual from an LDtk `Memory` entity plus room offset.
- Animate shard bob, pulse, rotation sway, particle spawn, and particle lifetime.
- Detect player overlap with the trigger AABB and open `LoreDisplay` once per entry.
- Reset trigger `active` state when the player leaves so the memory can be re-read.
- Clear all owned shard visuals and particles during static entity cleanup.

Scene-owned boundaries:

- `ItemWorldMemoryRoomPlacementRuntime` owns Memory Room placement selection.
- `ItemWorldScene` still owns `MemoryShardNPC` spawn/reward behavior and Ego dialogue persistence.
- `spawnStaticEntitiesForRoom()` should delegate `Memory` entities to this runtime; avoid reintroducing a scene-owned `memoryTriggers` collection.

Verification after extraction: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed. `git diff --check` only reported existing line-ending warnings.

- 2026-06-05: Trigger particle/shard/glow/container cleanup now uses DisplayObjectLifecycleHelpers and explicitly destroys Graphics on clear/particle expiry instead of detach-only cleanup.
