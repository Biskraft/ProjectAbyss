# ItemWorldEnemyCombatRuntime

`game/src/scenes/itemworld/ItemWorldEnemyCombatRuntime.ts` owns the procedural Item World enemy combat reward loop that used to sit directly inside `ItemWorldScene.update()`.

Current responsibilities:

- Resolve active player attack hits against alive enemies through the scene-owned `HitManager`.
- Spawn hit damage numbers, hit sparks, attack SFX, heavy-hit flash, and 100-damage milestone feedback.
- Process newly defeated enemies exactly once through `EnemyMetadata` EXP-grant markers.
- Fire first-kill Ego callback for normal non-boss enemies.
- Track enemy kill analytics for non-`MemoryShardNPC` enemies.
- Enemy-kill analytics payload construction is shared through `game/src/scenes/shared/EnemyCombatAnalyticsHelpers.trackEnemyKillForArea()`; this runtime still owns the policy that `MemoryShardNPC` enemies are not tracked.
- Spawn death particles for non-`MemoryShardNPC` enemies.
- Enemy death particle center-coordinate spawning is shared through `game/src/scenes/shared/EnemyDeathFeedbackHelpers.spawnEnemyDeathParticles()`; this runtime still decides MemoryShard exclusion and boss/heavy flag.
- Decrement room enemy counts, clear rooms, increment scene room clear count through callback, and persist room state.
- Grant kill EXP, item level-up feedback, non-boss recovery gain, healing drops, and gold drops.
- Enemy bottom-left drop coordinate construction is shared through `game/src/scenes/shared/EnemyCombatDropHelpers.getEnemyBottomLeftDropCoordinates()`, but Item World drops still use raw room coordinates and keep healing-before-gold order.
- Enemy drop spawning now routes through `EnemyCombatDropHelpers.spawnEnemyDrops()` with explicit `['healing', 'gold']` order; keep raw room coordinates.
- Dead-enemy one-shot post-defeat guarding and `shouldRemove` removal iteration are shared through `game/src/scenes/shared/EnemyDefeatProcessingHelpers.processEnemyPostDefeats()`; Item World first-kill, analytics policy, death particles, room clear, boss callback, EXP, and drop sequencing remain in this runtime.
- Remove enemies whose `shouldRemove` flag is set.

Scene-owned boundaries:

- `ItemWorldScene` still owns enemy spawning, boss portal/trapdoor/stratum-clear sequencing, `MemoryShardNPC.onSubdued`, and boss-clear special rewards.
- Boss enemies still flow through this runtime for kill EXP/drop/death-particle feedback before the scene's boss-clear portal logic runs.
- Do not move boss portal/trapdoor sequencing into this runtime; it depends on current room topology, final-stratum logic, and Item World return flow.
- Do not merge world and Item World drop sequencing implicitly: Item World keeps raw room-coordinate drops and passes explicit healing-before-gold order.
- Do not move the `MemoryShardNPC` analytics exclusion into shared helpers unless all modes adopt the same exclusion policy.
- Do not move room-clear, EXP, or boss callback side effects into `EnemyDefeatProcessingHelpers`; it should stay a loop/guard/removal helper.
- Do not move MemoryShard death-particle exclusion or boss-clear sequencing into `EnemyDeathFeedbackHelpers`; it should stay a coordinate/particle helper.

Verification after extraction: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed. `git diff --check` only reported existing line-ending warnings.
