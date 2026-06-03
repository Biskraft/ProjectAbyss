# WorldFluidFeedbackRuntime

`game/src/scenes/world/WorldFluidFeedbackRuntime.ts` owns LDtk world fluid/residue feedback during the movement VFX phase.

Current state:
- Owns player water entry/exit splash and impulse, non-water fluid transition splash/impulse/steam, residue timers/emission, residue hazard ticks, and submerged bubble emission.
- Owns enemy water/non-water transition feedback, enemy bubbles, enemy ice skid streaks, enemy landing/takeoff dust, and enemy residue damage/damage-number side effects.
- Uses `WorldFluidContactState` for previous-frame non-water contact transitions; do not duplicate that state in `LdtkWorldScene`.
- `WorldFluidRuntime` still owns `FluidSystem`, `FluidSpawnerManager`, `FluidCrestFoamManager`, and `FluidResidueManager` lifecycle and LDtk `FluidSpawner` parsing.
- `LdtkWorldScene.updateMovementVfx()` still owns call ordering, player drop-through grace/tutorial hooks, player ice-skid emission, player hit blood, and manager update ordering.

Prevention rules:
- Do not re-add player/enemy residue timer or residue damage blocks to `LdtkWorldScene`; route fluid-feedback changes through this runtime.
- Keep `updatePlayer(dt)` before drop-through tutorial hooks and `updateEnemies(dt)` after player ice-skid emission unless a gameplay test covers the ordering change.

Verification: 2026-06-03 `npx tsc --noEmit`, `npm run build`, Puppeteer smoke against `http://localhost:3000/play/?debug=1`, and `git diff --check` passed; diff check only printed existing line-ending warnings.
