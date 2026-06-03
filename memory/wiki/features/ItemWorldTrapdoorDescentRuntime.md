# ItemWorldTrapdoorDescentRuntime

`game/src/scenes/itemworld/ItemWorldTrapdoorDescentRuntime.ts` owns the non-final Item World trapdoor floor-punch operation.

## Boundary

- Cuts the trapdoor vertical passage through `fullGrid` when the player continues to the next stratum.
- Adds erase-blend graphics to the full-map aggregate layers so baked LDtk wall/background/deco visuals match the opened collision hole.
- Preserves the old geometry: trapdoor-centered `IW_DOOR_V_WIDTH` plus one-tile margin, from trapdoor floor Y through the next plaza ceiling strip.
- `ItemWorldTrapdoorState` owns the pending trapdoor X/Y and boss-cell-row snapshot. `ItemWorldScene` still owns trapdoor entity state, stratum-clear overlay flow, hitstop/camera feedback, and final absorb/exit sequencing.
- `ItemWorldTrapdoorRuntime` still owns proximity prompt/input; this runtime does not handle interaction.

## Verification

- 2026-06-02: Extracted `breakBossFloor()` from `ItemWorldScene` into this runtime.
- 2026-06-02: Moved pending floor-punch snapshot state into `ItemWorldTrapdoorState`.
- Checks: `npx tsc --noEmit`, `npm run build`, `/play/?debug=1` Puppeteer smoke.
