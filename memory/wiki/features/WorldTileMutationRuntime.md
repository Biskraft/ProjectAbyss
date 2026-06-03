# WorldTileMutationRuntime

`game/src/scenes/world/WorldTileMutationRuntime.ts` owns LDtk world dynamic tile-mutation state.

- Owns the `TileMutator` instance, its overlay renderer, and the coalesced wall-layer dirty flag.
- `LdtkWorldScene` still owns gameplay policy: steam/electric/acid callbacks, camera shake, damage, solidified magma overlay, tile hazard application, rerender timing, and fluid refresh.
- Keep `consumeWallLayerDirty()` immediately before `rerenderTilemap()` so many tile mutations still collapse into one wall-layer rebuild per frame.
- Keep room reload calling `reset()` before new burnable registrations so stale frozen/burning/electric overlays do not leak across LDtk levels.

Verification: 2026-06-03 `npx tsc --noEmit`, `npm run build`, and Puppeteer smoke against `http://localhost:3000/play/?debug=1` passed.
