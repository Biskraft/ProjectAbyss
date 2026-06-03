# WorldFluidContactState

`game/src/scenes/world/WorldFluidContactState.ts` owns LDtk world previous-frame non-water fluid contact state.

Current state:
- The state tracks whether the player and indexed enemies were previously inside non-water fluids, so entry/exit splash and impulse VFX fire only on transitions.
- `WorldFluidFeedbackRuntime` owns fluid type detection, water/fluid splash spawning, impulse application, steam puffs, residue timers, and residue hazard policy.
- Enemy tracking intentionally preserves the prior index-based behavior; it does not yet track by stable enemy id.

Prevention rules:
- Do not add `prevPlayerInOtherFluid` or `prevEnemyInOtherFluid` back to `LdtkWorldScene`.
- Keep contact-transition state separate from `WorldFluidFeedbackRuntime` so future stable enemy-id tracking can be changed in one place.

Verification on 2026-06-03: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed with only existing line-ending warnings.
