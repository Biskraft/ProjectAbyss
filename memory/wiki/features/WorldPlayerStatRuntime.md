# WorldPlayerStatRuntime

`game/src/scenes/world/WorldPlayerStatRuntime.ts` owns LDtk world player stat synchronization from inventory, base CSV stats, buffs, HealthShard bonus, innocents, and debug cheat state.

Current state:
- `sync()` recalculates ATK/DEF, equipped weapon metadata, attack hitbox multiplier, and MaxHP while preserving current HP ratio across MaxHP changes.
- Base stats come from `Sheets/Content_Stats_Character_Base.csv` through `getPlayerBaseStats(1)`.
- Innocent ATK/DEF/HP bonuses come from the equipped item via `calcInnocentBonus()`.
- `WorldPlayerProgressionState` still owns the stored `healthShardBonus` counter; this runtime only reads it.
- `LdtkWorldScene` and other flow runtimes still decide when to call stat sync and when to update HUD text.

Prevention rules:
- Do not re-add `updatePlayerAtk()` or direct player stat recalculation to `LdtkWorldScene`; call `WorldPlayerStatRuntime.sync()`.
- Keep HUD update timing outside this runtime unless the caller contract is intentionally changed.

Verification: 2026-06-03 `npx tsc --noEmit`, `npm run build`, Puppeteer smoke against `http://localhost:3000/play/?debug=1`, and `git diff --check` passed; diff check only printed existing line-ending warnings.
