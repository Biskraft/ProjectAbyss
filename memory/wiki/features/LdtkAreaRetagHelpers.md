# LdtkAreaRetagHelpers

## Current State

- `game/src/level/LdtkAreaRetagHelpers.ts` owns default-authored world LDtk BG/WALL/optional shadow retagging.
- `LdtkWorldScene` and `GiantBuilder` use `applyDefaultWorldAreaRetags(...)`.

## Boundaries

- Only tiles authored with the default world tileset `atlas/world_01.png` are retagged.
- Caller owns choosing BG/WALL area ids and whether shadow tiles are retagged with the wall area id.
- Do not retag LDtk levels that intentionally override tileset paths such as builder-specific tilesets.

## Verification

- 2026-06-05: `npx tsc --noEmit` and `npm run build` passed from `game/`; build retained only the known LDtk/CSV `atlas/prologue_01.png` warning.
