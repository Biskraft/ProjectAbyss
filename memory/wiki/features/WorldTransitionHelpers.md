# WorldTransitionHelpers

`game/src/scenes/shared/WorldTransitionHelpers.ts` owns small shared calculations for legacy/procedural world room transitions.

Current state:

- `findDoorTransitionCandidate(...)` resolves player/door-trigger overlap, neighbor direction, bounds checks, and non-empty target-cell validation for legacy `WorldScene`.
- 2026-06-06: `stepLegacyWorldTransition(...)` was removed. Legacy `WorldScene` room swaps now use `Game.transitionDirector.startCoverSwapReveal(...)` for cover/swap/reveal timing.
- `WorldScene` remains the owner of concrete side effects: loading rooms, mutating current room coordinates, player placement, enemy spawning, and minimap redraw.

Prevention rules:

- Do not move `WorldScene.loadRoom(...)`, player placement, room assembly, enemy spawning, or minimap redraw side effects into this helper.
- Keep this helper calculation-only unless a dedicated runtime is introduced for the full legacy procedural scene flow.
- Do not reintroduce local fade state machines here; C2 screen swaps must route through `TransitionDirector`.
