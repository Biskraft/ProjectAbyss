---
feature: BuilderInterior Visibility
status: active
last_updated: 2026-05-27
---
# BuilderInterior Visibility

## Current Rule

- `GiantBuilder` computes BuilderInterior IntGrid cells for overlap checks.
- `LdtkWorldScene` keeps BuilderInterior visible as an occluder until the player actually overlaps a BuilderInterior cell.
- On overlap, the whole BuilderInterior layer dissolves away; it fades back in after the player leaves those cells.
- Do not add the 2026-05-27 circular player reveal mask back without a new visual direction. It was removed because the next readability pass will use a different approach.

## Implementation Notes

- `game/src/entities/GiantBuilder.ts`: owns `isPlayerInInteriorCells`.
- `game/src/scenes/LdtkWorldScene.ts`: owns the full-layer dissolve alpha.
- There is no overlap hint layer and no circular reveal mask.

## Verification

- 2026-05-27: `npx tsc --noEmit` passes.
- 2026-05-27: `npm run build` from `game/` passes. Remaining warnings are existing LDtk/CSV tileset divergence warnings plus the existing Vite large chunk warning.
