# PauseMenuModalLifecycle

## 2026-06-05

- `game/src/ui/pause/PauseMenuModalLifecycle.ts` owns the repeated pause sub-modal mount/destroy rule: destroy the prior panel with children, add the new panel to the pause root, and reset pulse timer state.
- `PauseMenu.ts` still owns active flags, selection indices, settings persistence, and modal-specific redraw pulse methods.
- Keep modal content construction in the existing confirm, preset, settings, and audio panel helpers; this lifecycle helper should not create player-facing text.

- 2026-06-05: mountPauseModalPanelAndApply() centralizes the repeated mount-result handoff for confirm, preset, settings, and audio sub-modals. PauseMenu.ts still owns modal-specific fields and pulse redraw calls.

- 2026-06-05: destroyPauseModalPanelAndApply() centralizes sub-modal destroy plus owner-field reset handoff. PauseMenu.ts still owns active flags and suppression policy.

- 2026-06-05: mountPauseModalPanelAndRedraw() now combines sub-modal replacement, mounted field handoff, and initial pulse redraw. PauseMenu.ts still owns modal-active state, selection indices, and base selection suppression policy.
