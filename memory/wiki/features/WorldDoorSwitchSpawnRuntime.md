# WorldDoorSwitchSpawnRuntime

`game/src/scenes/world/WorldDoorSwitchSpawnRuntime.ts` owns host LDtk `LockedDoor` and `Switch` spawning for the world scene.

Responsibilities:

- Parse active-level `LockedDoor` fields: unlock condition, event key, stat type, and stat threshold.
- Instantiate host-grid `LockedDoor` entities, inject collision, register them through `WorldDoorSwitchRegistry`, and immediately unlock already-persisted doors.
- Parse active-level `Switch` target entity references.
- Instantiate host-grid `Switch` entities, inject or activate collision state based on persisted unlock state, and register them through `WorldDoorSwitchRegistry`.

Boundaries:

- `WorldDoorSwitchRegistry` owns active lists, entity-layer attachment, collision-grid lookup, and builder membership checks.
- `WorldDoorSwitchInteractionRuntime` owns attack policy, unlock side effects, stat-gate feedback, switch attack handling, player-door body resolution, analytics, toasts, and builder stamp refresh callbacks.
- Builder-spawned doors/switches live in `WorldBuilderDoorSwitchRuntime` because they require builder attachment wiring and local-grid placement.

Prevention rules:

- Do not move unlock feedback or stat-gate localization into this spawn runtime; those belong to `WorldDoorSwitchInteractionRuntime`.
- Inject door/switch collision before registry registration, and pass the same grid to the registry.
- Do not add builder-local door/switch construction to this host spawn runtime; use `WorldBuilderDoorSwitchRuntime` for builder-mounted doors and switches.

Verification: 2026-06-03 `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed; diff check only printed existing line-ending warnings.
