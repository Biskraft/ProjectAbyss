# LegacyWorldAltarSpawnHelpers

`game/src/scenes/shared/LegacyWorldAltarSpawnHelpers.ts` owns the legacy procedural `WorldScene` altar spawn candidate calculation.

- `getLegacyWorldAltarSpawnCandidate(...)` preserves the procgen policy: cap at two altars, 30% room chance, floor Y at `roomHeight - 3`, and X jitter around room center.
- The helper returns coordinates only.

Boundaries:

- `WorldScene` still owns `Altar` entity construction, list ownership, entity-layer attachment, and altar UI/portal side effects.
- LDtk authored altar spawning remains in `WorldAltarController`; do not route authored entities through this procgen helper.
