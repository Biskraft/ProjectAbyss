# WorldVoidRuntime

`game/src/scenes/world/WorldVoidRuntime.ts` owns the LDtk world IntGrid void fade/input-lock state machine.

Invariants:

- The runtime detects `isInVoid()` against the current player AABB and `player.roomData`.
- Void fade timing is unchanged: 200 ms fade out, 1000 ms black hold, 500 ms fade in, and 2000 ms total input lock before release.
- The runtime stores the last safe position and selected return level, then calls `WorldVoidReturnRuntime.teleportTo()` at full black.
- `WorldVoidReturnRuntime` owns return-point resolution and teleport placement because those depend on builder volume/stamp collision rules and current LDtk level loading.
- During hold/fade-in the runtime repeatedly calls `player.forceGrounded(false, 'void-fade')` to preserve the landed reveal pose.
- Cooldown is runtime-owned (`500 ms`) so repeated contact cannot immediately retrigger after input unlock.

Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, and `/play/?debug=1` browser smoke on `127.0.0.1:5178` passed.
