# WorldTransitionHelpers

`game/src/scenes/shared/WorldTransitionHelpers.ts` owns small shared calculations for legacy/procedural world room transitions.

Current state:

- `findDoorTransitionCandidate(...)` resolves player/door-trigger overlap, neighbor direction, bounds checks, and non-empty target-cell validation for legacy `WorldScene`.
- `stepLegacyWorldTransition(...)` advances legacy fade transition state and fade alpha without owning scene side effects.
- `WorldScene` remains the owner of concrete side effects: loading rooms, mutating current room coordinates, setting transition fields, and attaching/detaching Pixi objects.

Prevention rules:

- Do not move `WorldScene.loadRoom(...)`, player placement, room assembly, enemy spawning, or minimap redraw side effects into this helper.
- Keep this helper calculation-only unless a dedicated runtime is introduced for the full legacy procedural scene flow.
- Preserve `fade_out -> load room -> fade_in -> none` ordering for legacy procedural room transitions.
