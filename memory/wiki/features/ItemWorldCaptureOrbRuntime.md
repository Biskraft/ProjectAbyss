# ItemWorldCaptureOrbRuntime

- `game/src/scenes/itemworld/ItemWorldCaptureOrbRuntime.ts` owns the MemoryShardNPC capture seal-orb VFX in procedural Item World.
- It creates the world-space orb graphics under `entityLayer`, homes them toward the live player center, shrinks/fades them, flashes on arrival, and clears any remaining graphics on scene teardown.
- `ItemWorldScene` still owns the gameplay event: subdued innocent bookkeeping, damage-number text, HUD update, capture SFX, and Ego shard-recall dialogue trigger.
- The runtime uses lazy getters for `entityLayer` and player center so construction can stay in the scene constructor before `init()` creates the player and layers.
- Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, and `/play/?debug=1` Puppeteer smoke passed after extraction.
