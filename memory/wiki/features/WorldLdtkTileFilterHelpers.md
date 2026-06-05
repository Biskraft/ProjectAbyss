# WorldLdtkTileFilterHelpers

## Current State

- `game/src/scenes/world/WorldLdtkTileFilterHelpers.ts` owns world LDtk wall-tile filtering against the live collision grid.
- `LdtkWorldScene` uses it for initial level render and wall-layer rerender.

## Boundaries

- The helper preserves 2x1 slope visual stamps even when the sampled collision cell is air.
- Initial level render passes `excludeWaterCells: true` so static wall visuals do not duplicate dynamic fluid rendering.
- Rerender after tile mutation does not exclude water cells unless the caller opts in.

## Verification

- 2026-06-05: `npx tsc --noEmit` and `npm run build` passed from `game/`; build retained only the known LDtk/CSV `atlas/prologue_01.png` warning.
