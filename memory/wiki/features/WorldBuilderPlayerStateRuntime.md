# WorldBuilderPlayerStateRuntime

`game/src/scenes/world/WorldBuilderPlayerStateRuntime.ts` owns LDtk world Giant Builder player/carry state.

Invariants:

- The runtime owns `onBuilder`, `inBuilder`, builder carrier Y velocity, and the one-way drop-through grace timer.
- `LdtkWorldScene` still owns builder surface snapping, player overlap tests, and collision resolution.
- `beginPlayerUpdate(player)` applies the previous on-builder state to `player.onCarrier` and `player.carrierVelocityY`.
- `setOnBuilder(player, false)` clears `player.carrierVelocityY` immediately, preserving the old detach behavior.
- `startDropThroughGrace()` uses the old 260 ms one-way builder snap grace window.
- Do not reintroduce `builderCarrierVelocityY`, `playerOnBuilder`, `playerInBuilder`, or `builderOneWayDropThroughGraceMs` to `LdtkWorldScene`.

Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed with only existing line-ending warnings.
