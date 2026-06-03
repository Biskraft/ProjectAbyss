# WorldCameraInputRuntime

`game/src/scenes/world/WorldCameraInputRuntime.ts` owns small LDtk world camera-input state that does not belong in `LdtkWorldScene`.

Invariants:

- Vertical look uses a 400 ms hold timer while the player is idle; `LdtkWorldScene` supplies `playerIdle`, `lookUp`, and `lookDown`.
- Edge-transition render snapping is armed through `armPostTransitionSnap()` and consumed by `resolveRenderAlpha()`.
- Post-transition snapping is intentionally finite. The old scene field was set to 15 but never decremented, so interpolation stayed disabled after the first edge transition.
- Authored camera zones remain owned by `CameraZoneRuntime`; this runtime only owns local input/snap counters.

Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed with only existing line-ending warnings.
