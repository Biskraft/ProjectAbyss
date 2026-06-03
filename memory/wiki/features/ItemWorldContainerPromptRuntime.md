# ItemWorldContainerPromptRuntime

- `game/src/scenes/itemworld/ItemWorldContainerPromptRuntime.ts` owns the procedural Item World lift/grab `KeyPrompt` lifetime.
- It wraps `@systems/ContainerInteraction.updateContainerPrompt()` and stores the reusable prompt container internally.
- `ItemWorldContainerCarryRuntime` owns the prompt during normal Item World gameplay. Keep this prompt runtime as the small UI lifetime wrapper; do not wire it directly from `ItemWorldScene`.
- `ItemWorldScene` still owns container collision/destruction/paint effects.
- Call `hide()` when the generated map/container list is reset so stale lift prompts do not remain visible for one frame.
- Call `destroy()` on scene exit/destroy because the prompt is attached to `game.uiContainer`, not the scene container.
- Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, and `http://localhost:3000/play/?debug=1` Puppeteer smoke passed.
