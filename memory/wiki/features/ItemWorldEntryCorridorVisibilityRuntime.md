# ItemWorldEntryCorridorVisibilityRuntime

- `game/src/scenes/itemworld/ItemWorldEntryCorridorVisibilityRuntime.ts` owns visual suppression/restoration while the Item World entry corridor is active.
- It hides the normal Item World layers while preserving the player container, applies the corridor background grayscale/contrast/brightness filter, restores hidden layer visibility on handoff, and runs the 1000 ms hold plus 1000 ms color-restore filter.
- `ItemWorldScene` still owns corridor selection, composite grid construction, collision handoff, and player placement. Corridor platform reveal animation is owned by `ItemWorldEntryCorridorRevealRuntime`, and active/deferred-dialogue flags are owned by `ItemWorldEntryCorridorState`.
- Keep corridor world visibility/filter state out of `ItemWorldScene`; call `suppressWorld()`, `restoreWorld()`, `updateColorRestore()`, and `clearColorRestore()` through the runtime.
- Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, and `/play/?debug=1` Puppeteer smoke passed.
