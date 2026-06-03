# ItemWorldEntryGateState

- `game/src/scenes/itemworld/ItemWorldEntryGateState.ts` owns procedural Item World entry gating: the start-room spawn completion flag and the initial entry freeze timer.
- `ItemWorldScene` uses `tryMarkStartSpawnDone()` before spawning the first room, `clearFreeze()` when entry corridor gameplay starts/completes, `restartFreeze()` when entering normal ItemStratum gameplay, and `tickFreeze(dt)` during update.
- `ItemWorldRoomSpawnRuntime` reads `startSpawnDone` through a getter so the start hub still delays safe-room ambient spawning until the entry handoff has completed.
- Do not reintroduce separate `startSpawnDone` or `entryFreezeTimer` fields in `ItemWorldScene`.
- Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, and `http://localhost:3000/play/?debug=1` Puppeteer smoke passed.
