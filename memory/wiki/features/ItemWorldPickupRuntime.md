# ItemWorldPickupRuntime

- `game/src/scenes/itemworld/ItemWorldPickupRuntime.ts` owns procedural Item World healing/gold pickup arrays, entity-layer attachment, clearing, update, and collection.
- Call `updateHealing()` before breakable prop sway updates and `updateGold()` after them to preserve the old `ItemWorldScene` update order.
- The runtime mutates player HP for healing pickups, shows `toast.hp_gain`, flashes green, spawns pickup glow, updates earned gold through a scene callback, and spawns gold floating text.
- Drop creation decisions remain with enemy combat, breakable props, room rewards, and boss rewards, but those systems must add pickups through `ItemWorldPickupRuntime.addHealingPickup()` / `addGoldPickup()`.
- Do not reintroduce scene-owned `healingPickups` / `goldPickups`; stratum cleanup should use `ItemWorldPickupRuntime.clear()`.
- Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, and `http://localhost:3000/play/?debug=1` Puppeteer smoke passed.
