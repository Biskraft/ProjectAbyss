# ItemWorldAnvilRuntime

- `game/src/scenes/itemworld/ItemWorldAnvilRuntime.ts` owns LDtk-placed ItemStratum Anvil entity lifetime, per-frame animation, proximity checks, return prompt visibility, and `ATTACK` consumption.
- `ItemWorldScene` now only calls `spawn(ax, ay)`, `update(dt)`, and `clear()/destroy()`, and supplies `onReturnRequest()` to open the existing escape/return confirm flow.
- The runtime uses `ItemWorldWorldPromptRuntime` for UI-layer prompt projection. Keep prompt placement there; AnvilRuntime decides when the prompt is allowed to show.
- Prompt suppression is still scene-authored through `isInteractionSuppressed()` so modal, transition, and room-fade blocking rules stay centralized with Item World state.
- Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, and `http://localhost:3000/play/?debug=1` Puppeteer smoke passed.
