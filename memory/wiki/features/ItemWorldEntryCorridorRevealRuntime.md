# ItemWorldEntryCorridorRevealRuntime

- `game/src/scenes/itemworld/ItemWorldEntryCorridorRevealRuntime.ts` owns the entry corridor platform reveal list and scale animation.
- Rendered LDtk tile nodes are registered through `registerRenderedTileNode()`, which tints `Sprite` nodes black, recenters their pivot, starts them at scale 0, and tracks their reveal progress.
- Fallback graphics are already center-positioned, so they use `registerCenteredTileNode()`.
- `ItemWorldScene` still owns corridor level selection, composite rendering, fallback platform creation, collision handoff, and player movement; it only calls `update(dt, playerCenterX, playerCenterY)` each corridor frame.
- Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, and `/play/?debug=1` Puppeteer smoke passed.
