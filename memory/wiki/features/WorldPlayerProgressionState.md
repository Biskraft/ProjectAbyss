# WorldPlayerProgressionState

`game/src/scenes/world/WorldPlayerProgressionState.ts` owns LDtk world player progression counters that are not entity lifetime arrays.

Current state:

- Owns world-scene `gold` and accumulated `healthShardBonus`.
- Initial save load restores both counters through `replaceFromSave()`.
- Respawn preserves the previous behavior: only `healthShardBonus` is restored/reset, while current gold is not overwritten by the respawn path.
- `WorldSaveRuntime` owns save payload assembly for these counters.
- `WorldPlayerStatRuntime` owns HP/ATK/DEF stat recalculation that reads `healthShardBonus`.
- `LdtkWorldScene` still owns HUD update timing and pickup/Item World reward policy.

Prevention rules:

- Do not add direct `gold` or `healthShardBonus` fields back to `LdtkWorldScene`.
- Do not move HUD update timing into this state object; it only owns counters.
- Do not add stat recalculation logic to this state object; use `WorldPlayerStatRuntime`.
- If death/respawn gold-loss behavior changes, update both this page and the `respawnPlayer()` save-restore path.

Verification on 2026-06-03: `npx tsc --noEmit`, `npm run build`, and `http://localhost:3000/play/?debug=1` Puppeteer smoke passed.
