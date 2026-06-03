# ItemWorldEntryCorridorLayout

- `game/src/scenes/itemworld/ItemWorldEntryCorridorLayout.ts` owns pure Item World entry corridor layout calculations.
- It parses corridor template identifiers, selects deterministic opening/tail level order from LDtk templates, builds the stitched collision composite, computes the bottom-exit Y, and resolves the left-side player spawn with a caller-provided AABB-clear predicate.
- `ItemWorldScene` still owns rendering the composite, player/camera mutation, corridor lifecycle state, and handoff back to the normal ItemStratum map.
- Corridor selection seed remains `item.uid * 20011 + currentStratumIndex * 353 + 91`; do not change it casually because it determines authored corridor order per item/stratum.
- Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, and `/play/?debug=1` Puppeteer smoke passed.
