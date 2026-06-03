# ItemWorldBossChoiceRuntime

- `game/src/scenes/itemworld/ItemWorldBossChoiceRuntime.ts` owns procedural Item World non-final boss choice input.
- It delegates panel rendering/lifetime to `ItemWorldUiController.showBossChoice()/hideBossChoice()` and stores no gameplay progress itself.
- Input order preserves the old scene behavior: `ATTACK` continues to the next stratum, `MENU` exits safely, and any visible boss-choice panel blocks gameplay update.
- `ItemWorldScene` still owns the actual continue/exit sequencing through callbacks (`_continueToNextStratum()` and `_exitAfterBoss()`).
- `ItemWorldEscapeRuntime` still checks boss-choice visibility so ESC leave-confirm does not open while boss-choice owns MENU.
- Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, and `http://localhost:3000/play/?debug=1` Puppeteer smoke passed.
