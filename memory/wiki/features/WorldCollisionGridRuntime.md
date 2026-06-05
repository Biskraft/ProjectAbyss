# WorldCollisionGridRuntime

`game/src/scenes/world/WorldCollisionGridRuntime.ts` owns the LDtk world runtime collision-grid object.

- `LdtkWorldScene` accesses the grid directly through `WorldCollisionGridRuntime.grid`; the old private scene pass-through getter has been removed.
- Room load and room-state restore now clone LDtk `level.collisionGrid` through `cloneFrom()` instead of assigning scene fields directly.
- Do not add broad `replace()` APIs here unless a caller can prove it is outside active gameplay. DEC-042 still applies: temporary Item World entry mutations should use scoped collision transactions that mutate the live grid object in place.
- This boundary is intentionally small; tile mutation, fluid updates, builder stamps, and entity-specific collision injection still live in their existing runtimes.

Verification: 2026-06-03 `npx tsc --noEmit`, `npm run build`, and Puppeteer smoke against `http://localhost:3000/play/?debug=1` passed.

- 2026-06-05: Removed the `LdtkWorldScene` `collisionGrid` pass-through getter. Verified with `npx tsc --noEmit` and `npm run build` from `game/`; build retains the existing LDtk `atlas/prologue_01.png` CSV warning only.
