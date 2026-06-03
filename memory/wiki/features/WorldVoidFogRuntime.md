# WorldVoidFogRuntime

`game/src/scenes/world/WorldVoidFogRuntime.ts` owns LDtk world void-fog particle lifetime.

Invariants:

- `WorldVoidRuntime` owns void contact, fade, teleport, and input-lock behavior.
- `WorldVoidFogRuntime` owns only render-only black fog particles from void tiles.
- Item World visual release calls `clear()` so hidden overworld fog graphics and particles are dropped before the procedural scene is pushed.
- Scene destruction calls `destroy()` to remove the underlying `VoidFogSystem`.

