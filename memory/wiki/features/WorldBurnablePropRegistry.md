# WorldBurnablePropRegistry

`game/src/scenes/world/WorldBurnablePropRegistry.ts` owns LDtk world Tier B `BurnableProp` entity lifetime.

Current state:
- The registry owns the active `BurnableProp[]` list, entity-layer attachment, room-clear cleanup, and remove-at cleanup for burned-out props.
- `WorldBurnablePropRuntime` owns `BurnableZone` parsing, `TileMutator.registerBurnable()` / `unregisterBurnable()`, ash-remnant spawning, and burned-out cleanup policy.
- `LdtkWorldScene` no longer keeps a `burnableProps` getter; runtime consumers read through the registry.

Prevention rules:
- Do not add a scene-owned `burnableProps` array back to `LdtkWorldScene`.
- Register props with `TileMutator` before adding them to `WorldBurnablePropRegistry`, and unregister before `removeAt()` when a prop burns out.
- Keep tile mutation and ash side effects out of the registry; those belong to `WorldBurnablePropRuntime`.

Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed with only existing line-ending warnings.
