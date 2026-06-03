# WorldBuilderInteriorVisibilityRuntime

`game/src/scenes/world/WorldBuilderInteriorVisibilityRuntime.ts` owns LDtk world Giant Builder interior dissolve alpha state.

Invariants:

- `GiantBuilder` still owns `isPlayerInInteriorCells()`.
- `LdtkWorldScene` computes whether the player is inside the active builder volume/interior and calls the runtime.
- The runtime owns the smoothed alpha value, applies it to `builder.builderInteriorLayer.alpha`, and forwards the same alpha to builder entrance glow VFX.
- `reset(builder)` restores a newly spawned builder interior to alpha `1`; `reset()` is called when clearing the builder.
- Do not reintroduce `builderInteriorAlpha` to `LdtkWorldScene`.

Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed with only existing line-ending warnings.
