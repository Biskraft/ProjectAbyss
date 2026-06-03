# WorldEnemyKillRuntime

`game/src/scenes/world/WorldEnemyKillRuntime.ts` owns LDtk world enemy kill rewards, analytics, and boss-kill side effects.

Current state:
- `LdtkWorldScene` still decides when a kill has occurred during enemy update/combat loops and calls `WorldEnemyKillRuntime.handle(enemy)`.
- The runtime increments kill stats, sends enemy-kill analytics, unlocks target doors, marks boss keys, flashes/deactivates boss lock, handles fixed Item World boss item level-up rewards, schedules the delayed boss portal, and spawns gold/healing drops.
- `WorldEnemyRegistry` still owns enemy lifetime/list cleanup; `WorldEnemySpawnRuntime` still owns enemy creation and boss-lock activation during spawn.
- The delayed boss portal keeps the previous initialized-scene guard through the `isSceneInitialized` callback.

Prevention rules:
- Do not re-add kill reward/drop/analytics blocks to `LdtkWorldScene`; route kill side effects through this runtime.
- Keep kill detection and duplicate-kill guards in the caller loops unless that entire enemy update/combat phase is intentionally extracted.

Verification: 2026-06-03 `npx tsc --noEmit`, `npm run build`, Puppeteer smoke against `http://localhost:3000/play/?debug=1`, and `git diff --check` passed; diff check only printed existing line-ending warnings.
