# EnemyContentData

`game/src/data/enemyStats.ts` merges enemy stat rows and behavior rows into the existing `getEnemyStats()` API.

Current state:

- `Sheets/Content_Stats_Enemy.csv` owns simple numeric stat/reward fields only: `Type`, `Level`, `HP`, `ATK`, `DEF`, `Exp`.
- `Sheets/Content_Enemy.csv` owns one behavior/tuning identity row per enemy `Type`: `DetectRange`, `AttackRange`, `MoveSpeed`, `AttackCooldown`, `JumpTiles`, `MovementType`, `Attribute`, `Archetype`.
- Runtime callers still use `getEnemyStats(type, level)` so entity constructors and spawn runtimes do not need to know which CSV owns each field.
- `MawDrone` is a flying charger enemy: stats scale by level in `Content_Stats_Enemy.csv`, while behavior is a single `Content_Enemy.csv` row with `MovementType=flying` and `Archetype=A-01`.
- LDtk `MonsterType` is an external enum sourced from `game/public/assets/World_ProjectAbyss_ExternalEnums.json`, generated from `Sheets/Content_Enemy.csv`.
- `game/src/entities/ArchetypeEnemies.ts` provides first-pass spawnable implementations for remaining task-list archetypes: `Lobber` A-03b, `Bulwark` A-04, `SparkBat` A-05, `CinderImp` A-06, `Lurker` A-07, `Conduit` A-08, and `Sentry` A-10.
- These implementations cover baseline FSM/spawnability. Advanced hooks remain intentionally separate: Lobber AoE pools, Bulwark directional damage reduction, CinderImp boid flock manager, Conduit real summon/buff links.

Prevention rules:

- Do not add behavior fields back to `Content_Stats_Enemy.csv`.
- Keep simple combat reward/stat values in `Content_Stats_Enemy.csv`; do not move `HP`, `ATK`, `DEF`, or `Exp` into `Content_Enemy.csv`.
- Do not add `Level` back to `Content_Enemy.csv`; level scaling belongs to stats only.
- If a new enemy behavior column is added, add it to `Content_Enemy.csv` and merge it in `enemyStats.ts`.
- When adding enemy types, update `Content_Enemy.csv` first, then refresh the LDtk external enum file before editing LDtk placements.

## 2026-06-06 - Lobber Bombardier first pass
- Lobber now owns an A-03b Bombardier FSM in game/src/entities/ArchetypeEnemies.ts: patrol/hold, 500ms landing marker, arcing bomb projectile, short AoE explosion window, retreat when the player enters close range.
- Shared projectile collection now drains any alive enemy with pendingProjectiles, not only Ghost, so archetype projectile enemies can reuse the world/itemworld projectile runtimes.
- Enemy.applyStats(type, level) stores monsterType; LDtk world Shift+I render shows that type above enemy heads through WorldEnemyRenderRuntime.

## 2026-06-06 - CinderImp Swarmer feel pass
- CinderImp is no longer only the shared melee baseline. It now skitters while chasing, performs a short leap attack, and scatters after the leap so the A-06 Swarmer role is visible at individual-enemy scale.
- Full A-06 flock spawning remains a spawn-runtime task: enforce 3-5 CinderImp packs and room-level pack limits outside the enemy class.

## 2026-06-06 - SparkBat reachable hover correction
- Fixed SparkBat cooldown recovery in game/src/entities/ArchetypeEnemies.ts: it no longer applies constant upward velocity after every dive. Cooldown now steers back toward a reachable hover band near the player/spawn point, preventing repeated dives from carrying the flier out of chaseable space.

## 2026-06-06 - Conduit and Lurker behavior pass
- Conduit now has a visible cast payoff: after a 720ms pulse tell it fires a 3-shot projectile burst toward the player, then enters cooldown. It retreats if the player gets inside close range. True summon/buff registry integration remains future work.
- Lurker now follows the A-07 ambusher feel at class scale: hidden idle, reveal tell/flicker, then a fast one-shot dash strike before cooldown.

## 2026-06-06 - Conduit summon integration and Bulwark shield facing
- Conduit now queues real CinderImp summons instead of only casting projectiles. Each cast can create up to 2 imps, capped at 6 issued summons per Conduit; summoned imps inherit the Conduit's collision grid and target.
- EnemyRegistryHelpers.updateEnemies() now drains pendingSummons from alive enemies and attaches them to the active entity layer. LDtk world and Item World both pass their entity layer into the shared update path.
- Bulwark redraws its shield on the facing side so the visible shield no longer appears reversed when it turns.

## 2026-06-06 - Bulwark directional shield rule
- HitManager now lets combat targets override incoming player-hit damage through modifyIncomingHitDamage(damage, dirX, attacker) after base damage calculation and before HP subtraction.
- Bulwark uses the hook for A-04 Shielder behavior: front hits deal 20% damage with a shield flash, while rear hits deal 120% damage. The intended answer is to get behind the shield or use future shield-break weapon tags.

## 2026-06-06 - Bulwark guard/anticipate loop
- Bulwark now uses a Hollow Knight-style guard loop instead of passive always-on shield art: patrol normally, raise shield on player contact, drop shield for a 1500ms vulnerable anticipate before attacking, push forward briefly, then return to guard.
- Damage rule changed with the loop: guarded front hits still deal 20%, guarded rear hits deal 120%, and unguarded anticipate/attack windows deal 150%. Shield art is raised only while guarding and lowered during vulnerable/attack windows.

## 2026-06-06 - Bulwark damage tuning
- Current Bulwark damage rule: guarded front hits deal 0 damage, guarded rear hits deal 100%, and unguarded anticipate/attack windows also deal 100%. Older 20/120/150 tuning is obsolete.

## 2026-06-06 - Bulwark movement and attack timing tuning
- Bulwark now moves at its normal CSV moveSpeed during patrol/chase instead of using reduced multipliers while guarding.
- Bulwark pre-attack timing is now 500ms guarded telegraph followed by 1500ms unguarded vulnerable anticipate, then the push attack.

## 2026-06-06 - Lurker post-ambush chase and Bulwark shield orientation
- Lurker now spends its stealth ambush once. After the reveal dash strike it no longer re-hides; it transitions into normal chase/attack behavior.
- Bulwark shield orientation and front-block damage predicate were inverted together so the visible shield side matches the actual 0% damage guard side.

## 2026-06-06 Build validation note
- `Sheets/tools/validate.mjs` currently requires an `Attribute` header in `Sheets/Content_Stats_Enemy.csv` even when values are blank. Keep the column present; blank values still resolve through runtime/theme fallback.
