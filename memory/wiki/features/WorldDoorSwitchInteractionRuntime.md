# WorldDoorSwitchInteractionRuntime

`game/src/scenes/world/WorldDoorSwitchInteractionRuntime.ts` owns LDtk world `LockedDoor` / `Switch` interaction policy.

Responsibilities:

- Check whether a locked door blocks the player's attack line to enemies.
- Maintain locked-door collision tiles on host and builder grids.
- Resolve player overlap against locked doors after player physics.
- Update locked-door reject/open animations.
- Unlock doors by event name or LDtk IID, including analytics, rumble, camera shake, screen flash, and toasts.
- Handle player attacks against stat/event/switch doors, including per-attack reject suppression through `WorldDoorAttackState`.
- Handle player attacks against switches and unlock linked doors.

Boundaries:

- `WorldDoorSwitchRegistry` owns door/switch lists, entity-layer attachment, membership checks, and per-entity collision-grid lookup.
- `WorldDoorSwitchSpawnRuntime` owns host LDtk door/switch construction and persisted spawn activation.
- Builder-spawned doors/switches are created by `WorldBuilderDoorSwitchRuntime` because they require builder attachment wiring.
- `LdtkWorldScene` keeps only the public `unlockDoors(eventName)` wrapper for compatibility and delegates to this runtime.

Prevention rules:

- Do not reintroduce scene-owned door/switch attack loops or collision-grid lookup helpers.
- Keep localization and analytics for door/switch interaction in this runtime after this extraction.
- Use the runtime's `refreshBuilderGrid` callback after any door/switch collision mutation so builder stamps stay synchronized.

Verification: 2026-06-03 `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed with only existing line-ending warnings.
