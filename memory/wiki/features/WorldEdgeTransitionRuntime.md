# WorldEdgeTransitionRuntime

- `game/src/scenes/world/WorldEdgeTransitionRuntime.ts` owns LDtk world edge-transition fade state: `fade_out`, pending level/direction, item-world special entry, and `fade_in`.
- `WorldEdgeTransitionFlowRuntime` owns passable-edge detection, neighbor-trigger decisions, item-world corridor fallback, and tunnel-exit transition starts.
- `LdtkWorldScene` still owns `loadLevel()`, parallax handoff, and actual Item World scene creation.
- The runtime stores the previous player world tile used by `WorldPlayerSpawnRuntime` to choose the closest entry-edge passage after a level load.
- Use `ITEM_WORLD_TRANSITION_LEVEL_ID` instead of hardcoding `__item_world__`.
- On anvil/fixed Item World returns, call `WorldEdgeTransitionRuntime.reset()` instead of clearing transition fields manually.
- Verification on 2026-06-03: `npx tsc --noEmit`, `npm run build`, and `/play/?debug=1` Puppeteer smoke passed after extracting `WorldEdgeTransitionFlowRuntime`.
