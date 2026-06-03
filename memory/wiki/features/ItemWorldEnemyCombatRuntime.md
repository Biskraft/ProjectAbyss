# ItemWorldEnemyCombatRuntime

`game/src/scenes/itemworld/ItemWorldEnemyCombatRuntime.ts` owns the procedural Item World enemy combat reward loop that used to sit directly inside `ItemWorldScene.update()`.

Current responsibilities:

- Resolve active player attack hits against alive enemies through the scene-owned `HitManager`.
- Spawn hit damage numbers, hit sparks, attack SFX, heavy-hit flash, and 100-damage milestone feedback.
- Process newly defeated enemies exactly once through `EntityRuntimeMeta` EXP-grant markers.
- Fire first-kill Ego callback for normal non-boss enemies.
- Track enemy kill analytics for non-`MemoryShardNPC` enemies.
- Spawn death particles for non-`MemoryShardNPC` enemies.
- Decrement room enemy counts, clear rooms, increment scene room clear count through callback, and persist room state.
- Grant kill EXP, item level-up feedback, non-boss recovery gain, healing drops, and gold drops.
- Remove enemies whose `shouldRemove` flag is set.

Scene-owned boundaries:

- `ItemWorldScene` still owns enemy spawning, boss portal/trapdoor/stratum-clear sequencing, `MemoryShardNPC.onSubdued`, and boss-clear special rewards.
- Boss enemies still flow through this runtime for kill EXP/drop/death-particle feedback before the scene's boss-clear portal logic runs.
- Do not move boss portal/trapdoor sequencing into this runtime; it depends on current room topology, final-stratum logic, and Item World return flow.

Verification after extraction: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed. `git diff --check` only reported existing line-ending warnings.
