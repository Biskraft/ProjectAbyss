# DeferredFocus

## 2026-06-05

- `game/src/ui/DeferredFocus.ts` owns zero-delay DOM focus deferral for UI code that must wait for browser/Pixi focus transitions before calling `.focus()`.
- `FeedbackPanel` uses it for hidden textarea focus after open/category/send pointer interactions.
- This is a UI focus escape hatch only; do not use it for gameplay lifecycle timing. Gameplay timers should remain update-driven runtimes with cleanup.
