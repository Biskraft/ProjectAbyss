# ItemWorldContainerCarryRuntime

- `game/src/scenes/itemworld/ItemWorldContainerCarryRuntime.ts` owns procedural Item World grab/carry input state for throwable containers.
- It stores the held/pulling container state, pull interpolation timer, and reusable lift prompt through `ItemWorldContainerPromptRuntime`.
- Empty carry-state construction, grab/carry/tether state advancement, and player lift-pose clearing are shared through `game/src/scenes/shared/ContainerCarryStateHelpers.ts`; Item World still owns `ItemWorldContainerPromptRuntime`, scene-provided `ArcTether`, and update sequencing around prompt projection.
- Update order is preserved from `ItemWorldScene`: grab input, held-container carry interpolation, prompt projection, then arc tether update.
- `ItemWorldContainerRegistry` owns the shared container list and clear/settle lifecycle.
- `ItemWorldScene` still owns container collision/destruction/paint effect wiring, debug spawning dependencies, and `ArcTether` display object attachment.
- Cast/aim logic should use `hasHeldContainer()` instead of reading a scene field.
- Call `reset()` when rebuilding the generated full map so stale held state, prompt visibility, and lift pose are cleared together.
- Do not move `ItemWorldContainerPromptRuntime` ownership or scene-provided `ArcTether` attachment into `ContainerCarryStateHelpers`; shared helpers may advance tether state but must not own prompt lifetime or display attachment.
- Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, and `http://localhost:3000/play/?debug=1` Puppeteer smoke passed.
