# ItemWorldRoomRewardSpawner

`game/src/scenes/itemworld/ItemWorldRoomRewardSpawner.ts` owns designer-placed `ItemSpawner` reward creation for procedural Item World rooms.

Current responsibilities:

- Read room-keyed `ItemSpawner` points captured during full-map construction.
- Capture LDtk `ItemSpawner` entity points into room-keyed unified-grid pixel coordinates during full-map construction.
- Deterministically roll gold versus healing rewards from item uid, room col, and absolute row.
- Scale gold by item rarity and stratum depth.
- Spawn Forge Ember healing pickups from player max HP, including the existing legendary/ancient bonus ember chance.
- Register created pickups into the scene-owned gold/healing arrays and entity layer.

Scene-owned boundaries:

- `ItemWorldScene` delegates `ItemSpawner` capture during `buildFullMap()` and still owns pickup update/collection/clear lifecycle plus enemy-room spawning order.
- `spawnEnemiesInRoom()` still decides when reward spawns are allowed relative to room type and enemy spawning.
- Reward values are still hardcoded parity with the old scene method. If reward tuning moves to CSV, update this runtime rather than reintroducing the logic in `ItemWorldScene`.

Verification after extraction: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed. `git diff --check` only reported existing line-ending warnings.
