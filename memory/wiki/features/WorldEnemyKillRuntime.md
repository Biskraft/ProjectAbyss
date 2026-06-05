# WorldEnemyKillRuntime

`game/src/scenes/world/WorldEnemyKillRuntime.ts` owns LDtk world enemy kill rewards, analytics, and boss-kill side effects.

Current state:
- `LdtkWorldScene` now routes 죽음 처리를 오직 `WorldEnemyKillRuntime.processDefeatedEnemies(this.enemies)`로만 일원화해, `_postDefeatHandled` 가드 기반으로 모든 사망 경로(일반/도트/공격)를 처리한다.
- `LdtkWorldScene`는 더 이상 죽음 직후 바로 `WorldEnemyKillRuntime.handle(enemy)`를 직접 호출하지 않고, 프레임 단위 단일 처리 경로를 사용한다.
- `WorldEnemyKillRuntime.processDefeatedEnemies`는 `shouldRemove` 표시된 적 정리까지 런타임이 직접 수행해, 적 컨테이너 제거/삭제/보상/분석까지 동일 패스로 수렴한다.
- The runtime increments kill stats, sends enemy-kill analytics, unlocks target doors, marks boss keys, flashes/deactivates boss lock, handles fixed Item World boss item level-up rewards, schedules the delayed boss portal, and spawns gold/healing drops.
- Enemy-kill analytics payload construction is shared through `game/src/scenes/shared/EnemyCombatAnalyticsHelpers.trackEnemyKillForArea()`; world still decides that all handled world enemies are tracked.
- Enemy bottom-left drop coordinate construction is shared through `game/src/scenes/shared/EnemyCombatDropHelpers.getEnemyBottomLeftDropCoordinates()`, but world drops still pass through `resolveBottomLeftPickupSpawn()` before spawning to preserve collision-aware pickup placement.
- Enemy drop spawning now routes through `EnemyCombatDropHelpers.spawnEnemyDrops()` with explicit `['gold', 'healing']` order; keep the world collision-aware `resolveBottomLeftPickupSpawn()` step before calling it.
- Dead-enemy one-shot post-defeat guarding and `shouldRemove` removal iteration are shared through `game/src/scenes/shared/EnemyDefeatProcessingHelpers.processEnemyPostDefeats()`; world kill rewards, analytics, boss unlock, portal scheduling, and drop sequencing remain in this runtime.
- `WorldEnemyRegistry` still owns enemy lifetime/list cleanup; `WorldEnemySpawnRuntime` still owns enemy creation and boss-lock activation during spawn.
- The delayed boss portal is timer-driven through `update(dtMs)` (not `setTimeout`) and guarded by `isSceneInitialized` at execution time.

Progress (2026-06-04):
- Removed scene-level duplicate kill dispatch in `LdtkWorldScene` and moved all dead-enemy side effects through `WorldEnemyKillRuntime.processDefeatedEnemies` (including shouldRemove-flagged dead enemies) to align with Item World combat runtime behavior.

Progress (2026-06-05):
- `WorldEnemyKillRuntime` now receives `getEnemies` as an injected dependency; `LdtkWorldScene` calls `processDefeatedEnemies()` without passing the registry-owned enemy list each frame.

Prevention rules:
- Do not re-add kill reward/drop/analytics blocks to `LdtkWorldScene`; route kill side effects through this runtime.
- Keep kill detection and duplicate-kill guards in the caller loops unless that entire enemy update/combat phase is intentionally extracted.
- Do not merge world and Item World drop sequencing implicitly: world applies collision-aware bottom-left spawn resolution and passes explicit gold-before-healing order.
- Do not move world-specific boss unlock/portal/item-level side effects into shared analytics helpers.
- Do not move world-specific kill rewards or boss side effects into `EnemyDefeatProcessingHelpers`; it should stay a loop/guard/removal helper.

Verification: 2026-06-03 `npx tsc --noEmit`, `npm run build`, Puppeteer smoke against `http://localhost:3000/play/?debug=1`, and `git diff --check` passed; diff check only printed existing line-ending warnings.
