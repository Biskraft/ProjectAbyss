# PauseMenuPulse

## 2026-06-05

- `game/src/ui/pause/PauseMenuPulse.ts` owns the shared pause-menu selection pulse alpha formula and redraw wrapper.
- `PauseMenu.ts` keeps modal active state and pulse timers, while confirm/preset/settings/audio/default row pulse drawing now delegates to `redrawPauseMenuPulse(...)`.
- Keep this helper display-only; modal construction remains in the existing `PauseMenuConfirm`, `PauseMenuPresetSelector`, `PauseMenuSettingsPanel`, and `PauseMenuAudioPanel` helpers.

- 2026-06-05: PauseMenu.ts now calls edrawPauseMenuPulse(...) directly for the default selection pulse as well as modal pulses; PauseMenuPulse remains the display-only pulse geometry/alpha owner.

- 2026-06-05: `PauseMenuPulse.advancePauseMenuPulse` now owns modal pulse timer advancement plus redraw gating. `PauseMenu.ts` keeps the timer fields and modal active state, but should not duplicate per-modal `timer += dt` / redraw blocks.
