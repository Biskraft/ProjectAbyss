# WorldMovementVfxRuntime

`game/src/scenes/world/WorldMovementVfxRuntime.ts` owns LDtk world movement/environment VFX manager instances.

- Creates and exposes landing dust, dash, jump, wall-slide, footstep, flask, surge, hit blood, dive impact, splash, steam, bubble, drop-through, and ice-skid VFX managers.
- Owns grouped update calls for character feedback and late environmental VFX.
- Owns player kinematic VFX event consumption/spawn timing for landing dust/SFX, dash boost, double jump, wall jump, dash afterimages, ground-jump takeoff, wall-slide dust, footstep puff/SFX, surge VFX, and dive landing impact.
- `WorldFluidFeedbackRuntime` owns gameplay policy and spawn timing for water/non-water fluid splashes, residue timers and hazards, and enemy movement/fluid VFX.
- `LdtkWorldScene` still owns player hit blood, player ice-skid emission, drop-through tutorial hooks, and manager update ordering.
- Keep `fluidResidue.update()` between steam/splash VFX updates and water-bubble updates to preserve the prior per-frame order.

Verification: 2026-06-03 `npx tsc --noEmit`, `npm run build`, and Puppeteer smoke against `http://localhost:3000/play/?debug=1` passed.
