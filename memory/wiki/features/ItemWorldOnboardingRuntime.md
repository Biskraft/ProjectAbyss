# ItemWorldOnboardingRuntime

- `game/src/scenes/itemworld/ItemWorldOnboardingRuntime.ts` owns procedural Item World onboarding message composition and blocking `ATTACK` advance input.
- It keeps live keybinding text in the onboarding copy through `actionKey(GameAction.MENU/JUMP)`.
- `ItemWorldScene` calls `updateBlockingInput()` during the early modal/input block and no longer owns onboarding message arrays or advance wrappers.
- The old Item World `ControlsOverlay` construction was removed. It was created with `visible=false`, never attached as active UI, and registered device-change behavior without a gameplay path.
- Onboarding start is intentionally exposed through `start()` for future re-enablement; current `ItemWorldUiController` default remains `onboardingDone=true`.
- Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, and `http://localhost:3000/play/?debug=1` Puppeteer smoke passed.

## 2026-06-05 - Jump hint moved to Item World floor contact

- `game/src/scenes/ItemWorldScene.ts` owns the `hint_jump` tutorial.
- The timer starts when the Item World player is grounded for the first time, then shows `tutorial.jump` after 1000ms.
- Pressing jump dismisses the hint after 1000ms and suppresses it for that scene instance.
