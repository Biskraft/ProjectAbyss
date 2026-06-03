# WorldBreakablePropRegistry

`game/src/scenes/world/WorldBreakablePropRegistry.ts` owns LDtk world procedural `BreakableProp` entity lifetime.

Current state:
- The registry owns the active `BreakableProp[]` list, entity-layer attachment, per-frame prop update, room-clear cleanup, and remove-at cleanup.
- `WorldBreakablePropRuntime` owns procedural placement exclusions, `spawnBreakableProps()` invocation, `TileMutator` registration/unregistration, sword/fire hit policy, shatter VFX/SFX, and pickup side effects.
- Runtime destruction performs break/drop/VFX side effects only; callers remove the prop through `WorldBreakablePropRegistry.removeAt()`.

Prevention rules:
- Do not add a scene-owned `breakableProps` array back to `LdtkWorldScene`.
- Register props with `TileMutator` before adding them to the registry, and unregister before every registry removal path.
- Do not call `BreakableProp.destroy()` inside runtime destruction side effects; registry removal owns final Pixi cleanup.

Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed with only existing line-ending warnings.
