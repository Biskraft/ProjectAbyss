# PauseMenuBasePanel

## 2026-06-05

- `game/src/ui/pause/PauseMenuBasePanel.ts` owns construction of the base pause overlay, modal panel, title/divider, menu row labels, chevrons, and default selection pulse graphics.
- `PauseMenu.ts` keeps open/close state, navigation, fullscreen label refresh, modal subpanel orchestration, and pulse timing.
- Keep player-facing text resolved through existing localization keys; do not add pause UI literals outside `Sheets/Content_Localization.csv`.

- 2026-06-05: PauseMenuBasePanel also owns base cursor updates (updatePauseMenuCursor) and base selection pulse suppression alpha (setPauseMenuBaseSelectionPulseSuppressed). PauseMenu.ts keeps selected index/modal state and delegates base menu display state changes to the helper.

- 2026-06-05: `advancePauseMenuBaseCursor` owns base selection pulse timer advancement plus cursor redraw. `PauseMenu.ts` keeps selected index/timer state but should call base panel helpers directly instead of maintaining local cursor wrapper methods.

- 2026-06-05: `PauseMenu.ts` no longer keeps a local `setSelectionPulseSuppressed` wrapper; modal code calls `setPauseMenuBaseSelectionPulseSuppressed` directly so base pulse suppression stays owned by `PauseMenuBasePanel`.
