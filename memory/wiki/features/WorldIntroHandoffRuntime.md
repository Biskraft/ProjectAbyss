# WorldIntroHandoffRuntime

`game/src/scenes/world/WorldIntroHandoffRuntime.ts` owns the LDtk world title-scene handoff fade, first `Shaft_01` area-title queue, and initial HUD/minimap reveal gate.

Invariants:

- Capture the `TITLE_FADE_OVERLAY_LABEL` graphics before `LdtkWorldScene` creates HUD UI, so async init frames do not flash HUD/minimap over the black title fade.
- Save-data entry calls `skipIntroSequence()`: keep fading the title overlay if it exists, but do not hold HUD/minimap behind the new-game area-title gate.
- `isMinimapIntroHidden` intentionally matches only `fadeIn` and `title`, preserving the older minimap hidden-state semantics. The longer `awaitingHud` delay is applied by explicit HUD/minimap visibility updates.
- `LdtkWorldScene` still owns level-specific visibility rules such as `Shaft_DemoEnd`; the runtime only owns the first world-entry handoff.

Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, and `/play/?debug=1` browser smoke on `127.0.0.1:5178` passed.
