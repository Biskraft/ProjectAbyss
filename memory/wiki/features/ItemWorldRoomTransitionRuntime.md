# ItemWorldRoomTransitionRuntime

- `game/src/scenes/itemworld/ItemWorldRoomTransitionRuntime.ts` owns procedural Item World room-to-room fade state.
- It owns only `fade_out` / `fade_in` timing, fade overlay alpha, and the pending target room coordinates.
- `ItemWorldScene` still owns door-trigger detection, current room coordinate assignment, spawn resolution, player mutation, exit fade, and stratum-clear hold state. Final absorb/dissolve is owned by `ItemWorldAbsorbDissolveRuntime`.
- Prompt suppression must treat `ItemWorldRoomTransitionRuntime.isActive` as a non-`none` transition. `ItemWorldUiController.shouldSuppressWorldPrompts()` can receive `roomTransitionRuntime.suppressionState` for that purpose.
- Do not put room fade states back into `ItemWorldScene.transitionState`; that union now remains for non-room flows such as `exit_fade` and `post_clear_hold`.
- Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, and `/play/?debug=1` Puppeteer smoke passed.
