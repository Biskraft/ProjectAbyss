# ItemWorldTrapdoorRuntime

- `game/src/scenes/itemworld/ItemWorldTrapdoorRuntime.ts` owns Item World Trapdoor/FloatingItemDrop proximity updates, world-anchored prompt visibility, and `ATTACK` consumption.
- `ItemWorldScene` still owns Trapdoor entity creation/destruction, `startTrapdoorDescent()`, stratum clear overlays, and final absorb/exit sequencing. `ItemWorldTrapdoorState` owns the final-descent flag and pending floor-punch coordinates.
- `ItemWorldTrapdoorDescentRuntime` owns the non-final floor-punch operation that opens the passage to the next stratum.
- The runtime uses `ItemWorldWorldPromptRuntime` for prompt projection. It selects `prompt.descend` for `Trapdoor` and `prompt.absorb` for `FloatingItemDrop`.
- Prompt suppression is supplied by the scene through `isInteractionSuppressed()` so room fades and `ItemWorldFlowState` transitions continue to block interaction without moving transition state into this runtime.
- Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, and `http://localhost:3000/play/?debug=1` Puppeteer smoke passed.
