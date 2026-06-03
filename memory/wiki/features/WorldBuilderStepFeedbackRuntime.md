# WorldBuilderStepFeedbackRuntime

`game/src/scenes/world/WorldBuilderStepFeedbackRuntime.ts` owns LDtk world Giant Builder step camera-feedback state.

Invariants:

- The runtime owns the opt-in feedback flag, previous moving state, and step counter used for builder descent camera shakes.
- `reset(enabled)` is called when spawning a builder; `reset()` is called when clearing it.
- Cinematic builders always emit feedback; patrol builders emit only when the spawner opted into camera shake.
- This runtime does not own collision stamps, player carry, builder route state, or builder entity lifetime.
- Do not reintroduce `builderShakeEnabled`, `builderWasMoving`, or `builderStepCounter` fields to `LdtkWorldScene`.

Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed with only existing line-ending warnings.
