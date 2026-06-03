# WorldUpdraftRuntime

`game/src/scenes/world/WorldUpdraftRuntime.ts` owns LDtk world updraft system lifetime and builder updraft-channel composition.

Invariants:

- `UpdraftSystem` still owns tile value 4 physics and particles.
- `LdtkWorldScene` passes the active player room grid to the runtime each frame; this preserves builder riding behavior because `player.roomData` can be the builder grid.
- The runtime adds the active Giant Builder collision grid as an extra channel so builder-authored updraft cells render and affect the player while the builder moves.
- Scene transitions may call `clear()` to drop transient particles without destroying the entity-layer graphics; scene destruction calls `destroy()`.

