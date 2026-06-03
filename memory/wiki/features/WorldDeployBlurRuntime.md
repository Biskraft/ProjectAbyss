# World Deploy Blur Runtime

## Current State

- `game/src/scenes/world/WorldDeployBlurRuntime.ts` owns the anvil Item World deployment blur filter, ramp timer, target filter append/remove, and filter destruction.
- `LdtkWorldScene` supplies only the current blur targets: background container, LDtk renderer container, entity layer, fluid layer, and deployment FX layer.
- The runtime is updated before early returns in `LdtkWorldScene.update()` so deployment growth blur still ramps while modal/cinematic branches are active.

## Prevention Rules

- Do not reintroduce deployment blur filter/timer fields or target mutation helpers directly into `LdtkWorldScene`.
- Always call `WorldDeployBlurRuntime.clear()` or `destroy()` before world renderer/background teardown because `game.backgroundContainer` persists outside the scene.
- Keep palette/desaturation filters compatible by appending/removing only the runtime-owned `BlurFilter` instance.
