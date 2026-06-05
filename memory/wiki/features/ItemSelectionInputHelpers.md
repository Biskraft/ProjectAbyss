# ItemSelectionInputHelpers

## Current State

- `game/src/scenes/shared/ItemSelectionInputHelpers.ts` owns shared up/down/confirm/cancel input flow for item selection UIs.
- Legacy `WorldScene` altar UI and `WorldAltarController` both use the helper.

## Boundaries

- The helper only changes selected index, triggers redraw, dispatches confirm, handles empty confirm, and handles cancel.
- Multi-action confirm/cancel checks use `InputPressHelpers.isAnyJustPressedAction()` and intentionally do not consume input.
- Keep item validation, toast copy, altar state mutation, portal spawning, and UI rendering in the caller.
- Continue using localization keys for player-facing row text; do not add hardcoded item UI labels in callers.

## Verification

- 2026-06-05: `npx tsc --noEmit` and `npm run build` passed from `game/`; build retained only the known LDtk/CSV `atlas/prologue_01.png` warning.
