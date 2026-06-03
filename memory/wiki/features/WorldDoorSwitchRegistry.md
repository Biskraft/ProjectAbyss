# WorldDoorSwitchRegistry

`game/src/scenes/world/WorldDoorSwitchRegistry.ts` owns LDtk world `LockedDoor` / `Switch` entity lifetime and per-entity collision-grid mapping.

Current state:
- The registry owns active `LockedDoor[]` and `Switch[]` lists, entity-layer attachment, door/switch room-clear cleanup, builder attachment membership checks, and door/switch collision-grid lookup.
- `WorldDoorSwitchSpawnRuntime` owns host LDtk spawn field parsing and active-level host door/switch instantiation.
- `WorldDoorSwitchInteractionRuntime` owns unlock policy, stat-gate feedback, switch-to-door linking, player-door body resolution, locked-door collision maintenance, analytics, toasts, and builder stamp refresh callbacks.
- `LdtkWorldScene` still owns builder-spawned door/switch construction because it requires builder attachment wiring.
- Host-level and builder-level doors/switches register through the same registry so `getDoorCollisionGrid()` and `getSwitchCollisionGrid()` can resolve the correct host or builder grid.

Prevention rules:
- Do not add scene-owned `lockedDoors`, `switches`, `doorCollisionGrids`, or `switchCollisionGrids` back to `LdtkWorldScene`.
- Inject door/switch collision before registering, and pass the same grid to `WorldDoorSwitchRegistry.addDoor()` / `addSwitch()`.
- Keep unlock side effects and builder stamp refresh callbacks in `WorldDoorSwitchInteractionRuntime`.
- Keep host LDtk spawn parsing in `WorldDoorSwitchSpawnRuntime`; keep builder-spawned door/switch creation in builder dispatch until attachment wiring is extracted.

Verification on 2026-06-03: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed with only existing line-ending warnings.
