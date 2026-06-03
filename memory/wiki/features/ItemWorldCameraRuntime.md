# ItemWorldCameraRuntime

- `game/src/scenes/itemworld/ItemWorldCameraRuntime.ts` owns the procedural Item World per-frame camera follow path.
- It clamps the player inside the generated Item World map before assigning `game.camera.target`, preserving the previous update order from `ItemWorldScene`.
- It owns the `LOOK_UP`/`LOOK_DOWN` idle hold timer and writes `camera.lookDirection`; do not add another look-hold timer back to `ItemWorldScene`.
- `ItemWorldScene` supplies the live player and generated map size through getters. Other camera flows such as entry freeze, room fades, and exit fades remain scene/transition-owned.
- Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, and `http://localhost:3000/play/?debug=1` Puppeteer smoke passed.
