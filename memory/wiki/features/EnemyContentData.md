# EnemyContentData

`game/src/data/enemyStats.ts` merges enemy stat rows and behavior rows into the existing `getEnemyStats()` API.

Current state:

- `Sheets/Content_Stats_Enemy.csv` owns simple numeric stat/reward fields only: `Type`, `Level`, `HP`, `ATK`, `DEF`, `Exp`.
- `Sheets/Content_Enemy.csv` owns one behavior/tuning identity row per enemy `Type`: `DetectRange`, `AttackRange`, `MoveSpeed`, `AttackCooldown`, `JumpTiles`, `MovementType`, `Attribute`, `Archetype`.
- Runtime callers still use `getEnemyStats(type, level)` so entity constructors and spawn runtimes do not need to know which CSV owns each field.
- `MawDrone` is a flying charger enemy: stats scale by level in `Content_Stats_Enemy.csv`, while behavior is a single `Content_Enemy.csv` row with `MovementType=flying` and `Archetype=A-01`.
- `MawDrone` visual uses `game/public/assets/characters/mawdrone_01_atlas.json` / `.png`; the Graphics body is fallback only.
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

## 2026-06-06 - MawDrone atlas visual
- `game/src/entities/MawDrone.ts` now loads `assets/characters/mawdrone_01_atlas.json` and swaps the placeholder Graphics body to the authored atlas Sprite when available.

## 2026-06-06 - MawDrone opacity fix
- `game/src/entities/MawDrone.ts` no longer lowers atlas/body alpha during the attack tell. The authored `mawdrone_01_atlas` sprite stays fully opaque; use separate VFX/tint for future telegraphs instead of making the enemy body transparent.

## 2026-06-06 - MawDrone atlas frame fix
- Fixed `MawDrone` atlas slicing to match project atlas loaders: JSON frame bounds are now wrapped in `new Rectangle(...)` before creating the Pixi `Texture`. Passing the raw `{x,y,w,h}` frame object can produce an invisible/transparent sprite.

## 2026-06-06 - MawDrone slice VFX
- `MawDrone` reads `eye` and `booster` slices from `mawdrone_01_atlas.json`. Slice bounds+pivot are converted from atlas pixels into the sprite's bottom-center anchored local space.
- The `eye` slice drives a small `GlowFilter` light fixed to the drone sprite. The `booster` slice emits local smoke particles only while the drone is moving, so the exhaust follows the drone body while drifting backward.

## 2026-06-06 - Lurker chase FSM and Bulwark shield fix
- Fixed Lurker post-ambush crash by adding the missing `chase` state inside Lurker's overridden FSM. After the first ambush, Lurker now chases normally and uses a regular melee tell/active attack instead of repeating the ambush dash.
- Fixed Bulwark shield direction: `modifyIncomingHitDamage()` and shield art now both use `shieldFacingRight = this.facingRight`. `dirX` from `HitManager` is the attack direction, so a player attacking into the visible shield face is blocked for 0 damage.

## 2026-06-06 - Lobber bomb fire fix
- Fixed Lobber showing only the ground telegraph by removing the second `hasLineOfSightToPoint(targetX,targetY)` check in `fireBomb()`. Lobber already checks line of sight before entering attack; the bomb is an arcing projectile and should still spawn toward the locked landing marker even if the ground target point is not direct-line visible.

## 2026-06-06 - Projectile LOS collision consistency
- Enemy projectile wall collision now checks the projectile center tile instead of the full 8x8 AABB. This keeps turret/Sentry LOS rays and projectile destruction consistent: if the center ray can see through a gap, the projectile no longer dies immediately because its edge overlaps a wall tile. Projectiles still die when their center enters `TILE_WALL`; platforms/fluids/air remain pass-through.

## 2026-06-07 - Sentry projectile ray alignment
- Fixed Sentry/Turret projectile path mismatch: LOS uses enemy center to target center, but `Sentry.fire()` previously computed velocity from top-left positions. It now computes start/target from centers and spawns the 8x8 visual projectile with its center on the same ray. Projectile wall collision remains point-based via center tile.

## 2026-06-07 - Projectile debug visualization
- Shift+I now visualizes projectile-related enemy debugging: every enemy draws its actual center-to-target LOS ray, Lobber draws the locked bomb arc while its landing telegraph is visible, and `Projectile` draws its actual center-point collision marker. This is intended to catch mismatches between LOS, projectile spawn direction, and wall collision.

## 2026-06-07 - Projectile LOS uses solid tiles
- Enemy projectile LOS now blocks on `isSolid(getTile(...))` instead of only `TILE_WALL`. This aligns turret/Sentry/Ghost/Lobber LOS with gameplay solids: wall, ice, breakable, metal, and wood block shots; platform, fluids, hazards, grass, and air remain pass-through.
- `Projectile` point collision uses the same `isSolid()` predicate for its center tile, keeping LOS and projectile destruction consistent.

## 2026-06-07 - Bulwark active attack box
- Bulwark now draws a placeholder active attack box/effect while its attack window is active. The shield is lowered during attack/anticipate as before.
- Bulwark shield art no longer double-inverts: shield geometry is authored on the local right side and relies on the base enemy sprite flip for left-facing visuals.
- World and Item World contact runtimes now call `applyEnemyMeleeAttackDamageForPlayer()` before generic contact damage, using `enemy.isAttackActive()`. `Enemy` provides a default false implementation so archetype overrides can opt into active melee damage.

## 2026-06-07 - Bulwark attack timing retune
- Bulwark attack loop is now: 500ms guarded telegraph -> immediate active attack box -> 1500ms unguarded anticipate/vulnerable window -> cooldown/guard. The old order that attacked after the anticipate window is obsolete.
- Bulwark active attack box was doubled to 40x32 and exposed through `getAttackAABB()`. Shared enemy melee damage now uses `enemy.getAttackAABB()` when available, so the visible placeholder box and damage box match.

## 2026-06-07 - Bulwark telegraph and turn timing
- Bulwark guarded telegraph before the active attack box is now 250ms.
- Bulwark combat-facing changes are delayed by 1000ms instead of instant-turning toward the player. Patrol facing remains immediate; chase/detect/cooldown combat facing uses the delayed turn helper.

## 2026-06-07 - Bulwark delayed turn enforcement
- Fixed Bulwark still instant-turning during chase: base `moveTowardTarget()` mutates `facingRight`, bypassing the 1000ms delayed combat turn. Bulwark chase now sets `vx` directly toward the player and leaves facing to `updateCombatFacing()`.

## 2026-06-07 - Bulwark guard-facing split
- Bulwark now separates movement from shield/attack facing via `guardFacingRight`. Chasing can move toward the player immediately, but shield art, block direction, attack AABB, and rendered body facing only change after the 1000ms delayed turn completes.
- This avoids base/enemy movement side effects re-flipping the shield and keeps shield visuals and block logic on the same delayed-facing value.

## 2026-06-09 - B01-B52 non-surface batch
- Added the non-surface, non-cut B-series task enemies from `Documents/Plan/Task_Enemy_B*.md` to `Sheets/Content_Enemy.csv`, `Sheets/Content_Stats_Enemy.csv`, and `Sheets/Content_ItemWorld_SpawnTable.csv`.
- `game/src/entities/ArchetypeEnemies.ts` now provides pattern-based variant classes instead of one class per B-series enemy: ground chargers, bruisers, swarmers, shooters, bombardiers, fliers, defenders, ambushers, and summoners.
- `game/src/entities/EnemyFactory.ts` maps the new B-series `MonsterType` strings onto those pattern variants. Surface enemies B48-B52 remain intentionally excluded from spawn data until the DEC-055 wall/ceiling movement module exists.
- Do not paste task-file CSV examples directly into `Content_Enemy.csv`; those examples use an older schema with size tokens. Current schema is `Type,DetectRange,AttackRange,MoveSpeed,AttackCooldown,JumpTiles,MovementType,Attribute,Archetype,Role,IsNeutralBase,EliteEligible`.

## 2026-06-09 - Temporary rollback: remove B01-B46 temporary variants
- B-series temporary variants in game/src/entities/ArchetypeEnemies.ts were removed as part of a full rollback for re-planning; only base archetypes remain in implementation. game/src/entities/EnemyFactory.ts now routes any ^B\\d{2}_ monster type to Skeleton fallback before the legacy switch. Sheets/Content_Enemy.csv, Sheets/Content_Stats_Enemy.csv, and Sheets/Content_ItemWorld_SpawnTable.csv entries for B-prefixed IDs were removed, and game/public/assets/World_ProjectAbyss_ExternalEnums.json was regenerated accordingly.

## 2026-06-10 - B07-B52 task behavior pass
- Replaced thin wrapper implementations for B07/B20/B24/B25/B27/B35/B37/B39/B45/B46/B50/B52 in `game/src/entities/ArchetypeEnemies.ts` with task-specific FSMs: gunner spacing, flit dive melee, gunship high-hover shooting, air bomber marker drops, carrier flit summons, bunker stationary shield/retaliation, totem summoning, emitter area pulse, hidden sniper reveal-shot-reposition, trap layer floor traps, ceiling dropling vertical ambush, and wall gun fixed shooting.
- Corrected B-series `Sheets/Content_Enemy.csv` rows to include the blank `Attribute` column so `Archetype`, `Role`, `IsNeutralBase`, and `EliteEligible` do not shift left.
- B50/B52 remain implemented as `MovementType=flying` fixed/ceiling-compatible approximations because `surface` locomotion is not yet in `enemyStats.ts`/runtime movement; do not switch CSV to `surface` until DEC-055 wall/ceiling movement exists.
- Verification: `npx tsc --noEmit` and `npm run build` from `game/` passed.

## 2026-06-10 - Surface enemy locomotion first pass
- Added `MovementType=surface` in `game/src/data/enemyStats.ts` and a third movement branch in `game/src/entities/Enemy.ts` for ceiling/left-wall/right-wall attachment with simple surface snapping and no gravity.
- `Enemy.chooseNearestSurfaceAttachment()` lets fixed surface enemies bind to the nearest authored solid wall/ceiling after spawn.
- `B50_CeilingDropling` now uses true ceiling attachment while patrolling, detaches to `flying` only during its vertical drop/return, then reattaches to the ceiling.
- `B52_WallGun` now uses `surface` movement and auto-picks ceiling/left-wall/right-wall attachment as a fixed LOS shooter.
- `Sheets/Content_Enemy.csv` now declares B50/B52 as `surface`. Verification: `npx tsc --noEmit` and `npm run build` from `game/` passed.

## 2026-06-10 - B53-B56 death-management enemies
- Added B53/B54/B55/B56 task enemies in `game/src/entities/ArchetypeEnemies.ts`, `EnemyFactory.ts`, `Sheets/Content_Enemy.csv`, and `Sheets/Content_Stats_Enemy.csv`.
- B53_Kamikaze chases and self-detonates only after close-range telegraph; normal kill uses normal death with no explosion.
- B54_Volatile delays death by 300ms, flashes, then emits an explosion before final removal.
- B55_Brood delays death briefly, then emits three CinderImp broodlings through the existing `pendingSummons` path.
- B56_Rupture combines delayed explosion and three broodling summons, and is `EliteEligible=true`.
- `ExplosionProjectile` is a short-lived hostile projectile used for these death/self-destruct blasts. Verification: `npx tsc --noEmit` and `npm run build` from `game/` passed.

## 2026-06-10 - B57-B58 air death-management variants
- Added B57_AirKamikaze and B58_AirBrood in `game/src/entities/ArchetypeEnemies.ts`, `EnemyFactory.ts`, `Sheets/Content_Enemy.csv`, and `Sheets/Content_Stats_Enemy.csv`.
- B57_AirKamikaze is a flying homing self-destruct enemy with a short final telegraph and the same enlarged 72px explosion radius as B53.
- B58_AirBrood is a flying brood enemy that delays death briefly, then releases three B20_Flit broodlings through `pendingSummons`.
- CSV uses `MovementType=flying`; the task text says `air`, but current runtime schema accepts `ground|flying|surface`. Verification: `npx tsc --noEmit` and `npm run build` from `game/` passed.

## 2026-06-10 - Adaptive ground enemy jump height
- `JumpTiles` now means maximum jump capability, not a fixed impulse height. `game/src/entities/Enemy.ts` computes an adaptive jump height from immediate wall height and target elevation, then clamps it to the CSV maximum.
- Wall-blocked jumps and ceiling-gap jumps both use the adaptive calculation, reducing over-jumping when enemies only need to clear a low obstacle.
- Keep moving ground enemies at their desired maximum `JumpTiles`; tune movement feel through the adaptive logic before lowering CSV caps. Verification: `npx tsc --noEmit` and `npm run build` from `game/` passed.

## 2026-06-10 - Wall-blocked planned enemy jumps
- Ground enemies now attempt a local landing-candidate jump when blocked by a wall: scan forward tiles, find a standable floor candidate, compute an arc (`vx`/`vy`) to that landing, and carry the planned `vx` during flight.
- Landing failures are tracked by comparing jump start, landing position, and target candidate. Failed planned jumps add a 1500ms `jumpFailCooldownMs` backoff to reduce repeated same-spot hopping.
- The player-above ceiling-gap path still uses adaptive impulse only; full vertical-path planning remains separate. Verification: `npx tsc --noEmit` and `npm run build` from `game/` passed.

## 2026-06-10 - Ground jump landing/arc validation
- Wall-blocked planned jumps now require pixel-accurate body AABB clearance at the landing point and along the computed jump arc.
- Removed the blind fallback jump when no valid landing candidate exists. If no candidate/arc is valid, the enemy waits through a short failure backoff instead of jumping into a wall side.
- Prevention rule: tune `JumpTiles` as maximum capability only; do not reintroduce blind impulse fallback for blocked ground enemies without a real landing target.
- Player-above ceiling-gap jumps also route through planned landing/arc validation instead of raw vertical impulse. Ground enemies should not repeatedly hop just because the player is above them; they need a real upper-floor landing candidate that moves them closer to the target.

## 2026-06-10 - Lightweight platform navigation first pass
- Ground enemies now extract local platform segments from the collision grid when the target is above them. The navigator finds a takeoff point on the current platform and a reachable landing point on the target platform, then walks to the takeoff before using the existing planned jump executor.
- This is a lightweight platform navgraph, not a full navmesh: first pass supports current-platform walking into a validated jump edge toward the target platform, with legacy ceiling-gap search as fallback.
- Prevention rule: do not fix cross-platform chase by increasing jump impulse or scan radius alone. Add/adjust platform edges so enemies know where to walk before jumping.


## 2026-06-10 - Platform navgraph multi-step search
- Lightweight platform navigation now searches platform segments with BFS and chooses the first step toward the target platform instead of only attempting a direct current-platform to target-platform jump.
- Supported first-step edge types are validated jump edges and drop edges. Jump edges still reuse the planned jump arc/AABB validator; drop edges walk to the selected drop point and let gravity handle descent.
- Keep this as a platformer navgraph layer above jump execution: path selection decides where to go, planned jump execution decides whether an individual jump is physically valid.


## 2026-06-10 - Platform navgraph Shift+I debug
- Shift+I enemy debug now renders lightweight platform navigation data from game/src/entities/Enemy.ts: platform segments, current platform, target platform, and the selected first jump/drop edge.
- Colors: cyan = candidate platforms, yellow = current platform, orange = target platform, green = jump edge/arc, yellow edge = drop edge.
- Keep navgraph visualization gated behind Debug.infoVisible; do not render or build debug graphics during normal play.


## 2026-06-10 - CinderImp and Bulwark platform navigation
- CinderImp chase no longer applies raw vertical impulse (y=-210) for height differences. It now routes chase through base moveTowardTarget(), so swarmer pursuit uses the shared platform navgraph and planned jump validation.
- Bulwark now has JumpTiles=8 in Sheets/Content_Enemy.csv and its chase movement routes through moveTowardTarget() instead of direct x assignment. Bulwark still restores acingRight from delayed guardFacingRight after base update so shield facing delay remains intact.
- Prevention rule: enemy-specific chase code should not add raw navigation jumps; use the shared ground movement/navgraph path unless the jump is an explicit attack move.
