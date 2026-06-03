# WorldCombatFeedbackRuntime

`game/src/scenes/world/WorldCombatFeedbackRuntime.ts` owns LDtk world combat feedback manager instances.

- Creates and exposes `DamageNumberManager`, `HitSparkManager`, `PropShatterManager`, and `ScreenFlash`.
- `LdtkWorldScene` still owns combat/gameplay policy and decides when to spawn damage numbers, hit sparks, prop shatter chunks, or screen flashes.
- Use `updateImpactOnly()` for early-return overlay states that previously advanced hit sparks, prop shatter, and screen flash without ticking damage numbers.
- Use `clearDamageNumbers()` before releasing overworld visuals or pushing Item World, matching the prior behavior that only removed shared-UI floating text.

Verification: 2026-06-03 `npx tsc --noEmit`, `npm run build`, Puppeteer smoke against `http://localhost:3000/play/?debug=1`, and `git diff --check` passed. `git diff --check` only printed existing line-ending warnings.
