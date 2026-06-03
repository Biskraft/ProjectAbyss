# WorldEndingRuntime

`game/src/scenes/world/WorldEndingRuntime.ts` owns LDtk world ending triggers, the `EndingSequence` instance, and the transition into `EndingScene`.

Invariants:

- `loadLevel(level)` clears old ending triggers and parses LDtk `EndingTrigger` entities. `LdtkWorldScene` should not parse ending triggers directly.
- While `EndingSequence` is active but not done, world update continues; only player input is locked by the sequence. `update(dt)` returns `true` only once the ending transition has started, matching the previous early-return behavior.
- On completion, the runtime resets camera zoom/bounds, deletes the save, releases input lock, replaces with `EndingScene`, then disposes the sequence overlay.
- Scene teardown must call `destroy()` so a partially active ending overlay cannot leak into another scene.

Verification on 2026-06-03: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed with only existing line-ending warnings.
