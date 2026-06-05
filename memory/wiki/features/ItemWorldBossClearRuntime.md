# ItemWorldBossClearRuntime

- `game/src/scenes/itemworld/ItemWorldBossClearRuntime.ts` owns Item World boss-clear timing currently used for lifecycle transitions.
- It replaces in-scene `setTimeout` usage with an update-driven step queue.
- Sequence by default:
  - 160ms follow-up burst callback.
  - 2500ms trapdoor spawn callback (may return a Promise).
- The runtime is advanced from `ItemWorldScene.update()` and cleared in scene `exit()/destroy()`.
- Time scaling is controlled through `getTimeScale()` from scene context.

## Notes

- Async actions are supported; the runtime pauses until the awaited callback resolves before continuing.
- This runtime is intentionally narrow and scene-agnostic: scene code owns the concrete callback effects.
