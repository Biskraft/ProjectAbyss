# WorldBossLockRuntime

`game/src/scenes/world/WorldBossLockRuntime.ts` owns LDtk world boss arena locking.

Invariants:

- Boss lock doors are temporary `LockedDoor` entities injected into the active collision grid and added to the entity layer with `container.visible = false`; they are collision-only barriers.
- `activate()` is idempotent while a lock is active, preventing duplicate `trackBossFight({ phase: 'start' })` events.
- `deactivate()` unlocks/destroys the temporary doors, hides the boss HP bar through the scene callback, and emits the matching `phase: 'clear'` telemetry using the boss/level captured at activation.
- `LdtkWorldScene` still owns boss spawning, boss death rewards, and fixed Item World boss-return progression.

Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, and `/play/?debug=1` browser smoke on `127.0.0.1:5178` passed.
