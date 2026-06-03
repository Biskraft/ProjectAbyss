# ItemWorldStratumStartSnapshot

- `game/src/scenes/itemworld/ItemWorldStratumStartSnapshot.ts` owns the per-stratum item snapshot captured at Item World entry: item level, final attack, and innocent count.
- `ItemWorldScene` captures the snapshot after resolving the starting stratum and uses it for stratum-clear overlay before-values and death return-result payloads.
- Do not reintroduce separate `stratumStartAtk`, `stratumStartLevel`, or `stratumStartInnocentCount` fields in `ItemWorldScene`; use `capture(item)` and `innocentsCapturedBy(item)`.
- Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, and `http://localhost:3000/play/?debug=1` Puppeteer smoke passed.
