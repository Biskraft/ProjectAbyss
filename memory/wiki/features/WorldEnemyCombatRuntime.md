# WorldEnemyCombatRuntime

`game/src/scenes/world/WorldEnemyCombatRuntime.ts` owns LDtk World player-attack-to-enemy hit resolution.

Responsibilities:

- Check active player attacks against alive LDtk World enemies.
- `WorldScene` and world-specific combat path now use shared `getAliveEnemiesAsCombatTargets(...)` from `@scenes/shared/EnemyRegistryHelpers` and then apply `isAttackBlocked` where required.
- Exclude enemies blocked by `WorldDoorSwitchInteractionRuntime.isAttackBlocked()` so locked doors prevent attack penetration.
- Route hit detection through `HitManager.checkHits()`.
- Spawn damage numbers, hit sparks, attack-hit SFX, and heavy-hit screen flash feedback.

Boundaries:

- `LdtkWorldScene` still owns enemy update order and decides when to invoke player attack, kill processing, projectile, and contact runtimes.
- `WorldEnemyKillRuntime` still owns defeated-enemy rewards, drops, boss side effects, and analytics.
- `WorldEnemyContactRuntime` still owns body-contact damage orchestration.
- Do not move kill rewards, body-contact damage, or tile-hazard policy into this runtime.

Verification: 2026-06-05 `npx tsc --noEmit` and `npm run build` from `game/` passed. Build retains the existing LDtk `atlas/prologue_01.png` CSV warning only.
