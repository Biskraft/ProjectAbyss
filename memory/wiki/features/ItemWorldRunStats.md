# ItemWorldRunStats

- `game/src/scenes/itemworld/ItemWorldRunStats.ts` owns procedural Item World run counters: earned EXP, earned gold, baseline save gold, cleared-room count, and total-room count.
- `ItemWorldScene` keeps a public `earnedGold` getter for `LdtkWorldScene` return handling, but should not reintroduce separate `earnedExp`, `earnedGold`, `baselineGold`, `roomsCleared`, or `totalRooms` fields.
- HUD gold display should use `displayGold`, which is `baselineGold + earnedGold`; returned-world reward payout should use only `earnedGold`.
- Combat clear, non-combat clear, room-state restore, escape-confirm payloads, HUD EXP display, and death EXP penalty should mutate/read this object through its methods or getters.
- Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, and `http://localhost:3000/play/?debug=1` Puppeteer smoke passed.
