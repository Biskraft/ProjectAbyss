# ItemWorldTrapdoorState

- `game/src/scenes/itemworld/ItemWorldTrapdoorState.ts` owns procedural Item World trapdoor state that is not entity lifetime: whether the spawned trapdoor descends to the world, and the pending trapdoor X/Y/boss-cell-row snapshot used by the non-final floor-punch path.
- `ItemWorldScene` still owns Trapdoor/FloatingItemDrop entity creation/destruction, boss-kill delayed spawn orchestration, final absorb/exit sequencing, and continue/exit callbacks.
- `ItemWorldTrapdoorRuntime` owns proximity prompt/input, and `ItemWorldTrapdoorDescentRuntime` owns the floor-punch mutation/erase visuals.
- Do not reintroduce `descentToWorld`, `pendingTrapX`, `pendingTrapY`, or `pendingTrapBossCellRow` fields in `ItemWorldScene`; use `setDescentToWorld()`, `resetForStratum()`, `captureDescentFromTrapdoor()`, and `pendingDescentSnapshot`.
- Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, and `http://localhost:3000/play/?debug=1` Puppeteer smoke passed.
