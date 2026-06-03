# WorldPlayerImpactRuntime

`game/src/scenes/world/WorldPlayerImpactRuntime.ts` owns LDtk world player surge-contact and dive-landing impact side effects.

Responsibilities:

- Detect `player.diveLanded` and apply the existing dive landing tier rules.
- Apply dive landing camera shake, hitstop, screen flash, hit sparks, enemy area damage, damage numbers, and enemy death handling.
- Delegate dive landing cracked-floor and growing-wall shatter checks through callbacks.
- Detect `player.surgeActive` and delegate surge-contact cracked-floor/growing-wall shatter checks.

Boundaries:

- `WorldMovementVfxRuntime` still owns render-only surge and dive landing VFX.
- `WorldCrackedFloorRuntime` and `WorldGrowingWallRuntime` still own their own shatter persistence, feedback, toasts, and registry cleanup.
- `LdtkWorldScene` no longer owns surge-contact or dive-landing gameplay side effects; it only calls `WorldPlayerImpactRuntime.update()` in the combat/update sequence.

Verification: 2026-06-03 `npx tsc --noEmit`, `npm run build`, Puppeteer smoke against `http://localhost:3000/play/?debug=1`, and `git diff --check` passed. `git diff --check` only printed existing line-ending warnings.
