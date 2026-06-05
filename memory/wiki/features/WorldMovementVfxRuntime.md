# WorldMovementVfxRuntime

`game/src/scenes/world/WorldMovementVfxRuntime.ts` owns LDtk world movement/environment VFX manager instances.

- Creates and exposes landing dust, dash, jump, wall-slide, footstep, flask, surge, hit blood, dive impact, splash, steam, bubble, drop-through, and ice-skid VFX managers.
- Owns grouped update calls for character feedback and late environmental VFX.
- Owns player kinematic VFX event consumption/spawn timing for landing dust/SFX, dash boost, double jump, wall jump, dash afterimages, ground-jump takeoff, wall-slide dust, footstep puff/SFX, surge VFX, and dive landing impact.
- Player basic kinematic VFX event consumption and spawn timing are shared through `game/src/scenes/shared/MovementVfxHelpers.updatePlayerKinematicVfx()`. World still owns manager construction, manager accessors, grouped update order, and non-shared environment/fluid feedback boundaries.
- Legacy procedural `WorldScene` also uses `updatePlayerKinematicVfx(..., { playSfx: false })` because that scene did not previously play the helper-owned land/footstep SFX.
- Legacy procedural `WorldScene` also uses `updateCommonMovementVfxManagers(...)` for its overlapping transient VFX manager update bundle; `steamPuff` is optional in the shared helper because legacy procgen does not construct that manager.
- Legacy procedural `WorldScene` uses `updateEnemyKinematicVfx(...)` for enemy water-transition splash, bubbles, ice skid, landing, and jump takeoff VFX.
- `WorldFluidFeedbackRuntime` owns gameplay policy and spawn timing for water/non-water fluid splashes, residue timers and hazards, and enemy movement/fluid VFX.
- `LdtkWorldScene` still owns player hit blood, player ice-skid emission, drop-through tutorial hooks, and manager update ordering.
- Keep `fluidResidue.update()` between steam/splash VFX updates and water-bubble updates to preserve the prior per-frame order.
- Do not move world manager construction/accessors or fluid/environment feedback into `MovementVfxHelpers`; it should stay limited to shared player and enemy kinematic VFX bundles.

Verification: 2026-06-03 `npx tsc --noEmit`, `npm run build`, and Puppeteer smoke against `http://localhost:3000/play/?debug=1` passed.
