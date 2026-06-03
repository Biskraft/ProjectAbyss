# WorldEdgeTransitionFlowRuntime

`game/src/scenes/world/WorldEdgeTransitionFlowRuntime.ts` owns LDtk world edge-transition trigger flow.

Current state:
- The flow runtime detects when the player crosses passable level edges, chooses a normal neighbor, item-world corridor, or tunnel-exit transition, and starts `WorldEdgeTransitionRuntime`.
- It delegates pure neighbor geometry to `WorldTransitionController`.
- It delegates fade state to `WorldEdgeTransitionRuntime`.
- `LdtkWorldScene` still owns `loadLevel()`, parallax room handoff, actual `ItemWorldScene` creation/push, and post-transition camera snap.

Prevention rules:
- Do not add scene-local `checkLevelEdges()`, `startTransition()`, `updateTransition()`, or edge-neighbor wrapper methods back to `LdtkWorldScene`.
- Keep passable-edge detection and item-world corridor fallback in this flow runtime.
- Keep `WorldTransitionController` stateless and keep fade timers/pending state in `WorldEdgeTransitionRuntime`.

Verification on 2026-06-03: `npx tsc --noEmit`, `npm run build`, and `http://localhost:3000/play/?debug=1` Puppeteer smoke passed.
