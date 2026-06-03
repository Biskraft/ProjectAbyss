# WorldBreakablePropRuntime

`game/src/scenes/world/WorldBreakablePropRuntime.ts` owns LDtk world procedural `BreakableProp` placement, update delegation, attack/fire cleanup, and destruction side effects.

Responsibilities:

- Build level-specific procedural exclusion cells around `Player`, `GameSaver`, and edge passages.
- Spawn `BreakableProp` instances through `spawnBreakableProps()` and register them with `TileMutator`.
- Delegate per-frame prop updates through `WorldBreakablePropRegistry`.
- Handle player sword-hit tests and fire/burned-out cleanup.
- Apply hitstop, camera shake, shatter VFX, SFX, hit sparks, gold burst drops, flask drops, and pickup registration.

Boundaries:

- `WorldBreakablePropRegistry` owns the active list, entity-layer attachment, room-clear cleanup, and Pixi destroy on removal.
- `WorldBreakablePropRuntime.destroyWithEffects()` performs break/drop/VFX side effects only; it does not call `BreakableProp.destroy()`.
- Runtime paths unregister props from `TileMutator` before every registry removal, including sword destruction, burned-out cleanup, and room clear.

Prevention rules:

- Do not add procedural `BreakableProp` placement, hit loops, or drop side effects back to `LdtkWorldScene`.
- Keep authored LDtk `Breakable` handling in `WorldBreakableRuntime`; procedural `BreakableProp` remains separate.
- Register props with `TileMutator` before adding them to the registry so fire propagation can ignite them.

Verification: 2026-06-03 `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed; diff check only printed existing line-ending warnings.
