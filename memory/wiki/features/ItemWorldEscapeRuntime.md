# ItemWorldEscapeRuntime

- `game/src/scenes/itemworld/ItemWorldEscapeRuntime.ts` owns procedural Item World leave-confirm modal data and input handling.
- It builds the leave-confirm payload from live item/progress getters and delegates panel rendering to `ItemWorldUiController`.
- The rooms-cleared, total-rooms, earned-EXP, and earned-gold values come from `ItemWorldRunStats` via scene-supplied getters.
- The `post_clear_hold` check comes from `ItemWorldFlowState` via the scene-supplied transition-state getter.
- Update order preserves the old `ItemWorldScene` behavior: MENU toggles the panel except during `post_clear_hold`, ATTACK confirms exit, and DASH/JUMP cancels.
- Visible-panel ATTACK confirm and DASH/JUMP cancel now route through `ConfirmCancelInputHelpers.updateConfirmCancelInput({ cancelActions })`; MENU toggle/close remains runtime-local because it opens and closes the panel before modal confirm/cancel routing.
- Keep `post_clear_hold` excluded so the stratum-clear overlay continues to own MENU/ATTACK during boss-clear decisions.
- `ItemWorldScene` still owns the actual exit fade and return sequencing through the `onExitConfirmed` callback.
- Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, and `http://localhost:3000/play/?debug=1` Puppeteer smoke passed.
