# LegacyWorldDoorMarkerHelpers

`game/src/scenes/shared/LegacyWorldDoorMarkerHelpers.ts` owns legacy procedural `WorldScene` door marker shape creation.

- `createLegacyWorldDoorMarkers(...)` returns Pixi `Graphics[]` for left/right/up/down room exits using the existing marker colors, alpha, dimensions, and positions.
- `WorldScene` still owns marker lifecycle: detaching prior markers, attaching new markers to `entityLayer`, and storing them in `doorMarkers`.

Boundaries:

- Door transition trigger resolution remains in `WorldTransitionHelpers`.
- Do not move room loading, current room mutation, or marker lifecycle ownership into this helper.
