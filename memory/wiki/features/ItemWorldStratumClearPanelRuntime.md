# ItemWorldStratumClearPanelRuntime (retired)

- This legacy runtime was removed from active Item World flow ownership.
- `ItemWorldScene` now uses `ItemWorldStratumClearRuntime` + `StratumClearOverlay` for post-clear input and hold flow.
- Legacy `ItemWorldStratumClearPanelRuntime.ts` was deleted after removing last scene usage.
- Legacy compatibility hook `ItemWorldUiController.hasStratumClearPanel()` has been removed, and all scene flow-control references are gone.
- `ItemWorldProgressController` now owns only stratum transition pending snapshot + continue/exit callbacks for the unified overlay path.
