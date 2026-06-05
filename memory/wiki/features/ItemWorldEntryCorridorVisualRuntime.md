# ItemWorldEntryCorridorVisualRuntime

- `game/src/scenes/itemworld/ItemWorldEntryCorridorVisualRuntime.ts` owns Item World entry corridor visual container lifetime.
- It renders stitched LDtk corridor wall/special tiles, applies generic solid sprite substitution from the dive item temperament, registers rendered/fallback platform nodes with `ItemWorldEntryCorridorRevealRuntime`, applies corridor grayscale/contrast, and destroys the corridor container.
- `ItemWorldScene` still owns corridor activation, player/camera placement, collision-grid handoff, bottom-exit completion, and normal ItemStratum resume. `ItemWorldEntryCorridorState` owns the active/bottom-exit/deferred-dialogue values used by that orchestration.
- Keep fallback platform graphics centered when registering reveal nodes; LDtk-rendered tile sprites remain top-left converted inside `ItemWorldEntryCorridorRevealRuntime`.
- Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, and `/play/?debug=1` Puppeteer smoke passed after extraction.

- 2026-06-05: Entry corridor root container cleanup now uses DisplayObjectLifecycleHelpers.destroyDisplayObject(..., { children: true }); reveal runtime cleanup remains explicitly called after container destruction.
