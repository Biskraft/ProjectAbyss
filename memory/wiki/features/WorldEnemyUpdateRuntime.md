# WorldEnemyUpdateRuntime

`game/src/scenes/world/WorldEnemyUpdateRuntime.ts` owns the LDtk World enemy `update(dt)` iteration loop.

Responsibilities:

- Iterate the registry-owned `Enemy<string>[]` list from back to front.
- Call each enemy's `update(dt)` without changing combat, kill, spawn, or lifecycle ownership.

Boundaries:

- `LdtkWorldScene` still owns the order of enemy update, player attack processing, defeated-enemy processing, projectile updates, and body-contact damage.
- `WorldEnemyRegistry` still owns the active enemy array and list lifecycle.
- `WorldEnemyCombatRuntime` owns player-attack hit resolution.
- `WorldEnemyKillRuntime` owns defeated-enemy rewards/drops and side effects.
- `WorldEnemyContactRuntime` owns body-contact damage orchestration.

Verification: 2026-06-05 `npx tsc --noEmit` and `npm run build` from `game/` passed. Build retains the existing LDtk `atlas/prologue_01.png` CSV warning only.
