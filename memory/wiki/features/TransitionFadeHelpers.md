# TransitionFadeHelpers

- `game/src/scenes/shared/TransitionFadeHelpers.ts` owns tiny remaining-timer-to-alpha formulas for scene transitions.
- `getFadeOutAlphaFromRemaining(remainingMs, durationMs)` preserves the existing `Math.min(1, 1 - remainingMs / durationMs)` formula.
- `getFadeInAlphaFromRemaining(remainingMs, durationMs)` preserves the existing `Math.max(0, remainingMs / durationMs)` formula.
- Initial users: `WorldEdgeTransitionRuntime`, `ItemWorldRoomTransitionRuntime`, `ItemWorldExitFadeRuntime`, and `WorldTransitionHelpers`.
- Keep transition state machines and timer ownership in their runtime/helper callsites; this helper only centralizes the alpha math.
