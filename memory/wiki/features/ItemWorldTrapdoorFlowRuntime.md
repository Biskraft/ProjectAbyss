# ItemWorldTrapdoorFlowRuntime

- `game/src/scenes/itemworld/ItemWorldTrapdoorFlowRuntime.ts` owns the trapdoor activation-to-transition handoff.
- It centralizes the descent start sequence and delegates final/intermediate outcomes via callbacks passed at construction:
  - captures descent snapshot (trapdoor position + boss cell row)
  - hides prompts and optional trapdoor entity disposal
  - blocks reentry when trapdoor is inactive/consumed
  - activates/consumes the trapdoor after the reentry guard and snapshot capture, before branch callbacks
  - triggers pre-descent/final/intermediate flow work via explicit callback branches based on `descentToWorld`
- 2026-06-05: Activation ownership was moved from `ItemWorldTrapdoorRuntime` input handling into this flow runtime. Do not call `trapdoor.activate()` before `startDescent()`; doing so marks entities consumed before the flow guard can start the descent.
- The scene owns concrete effects (HUD cleanup, clear-state transitions, overlay launch) as flow callbacks in the flow-runtime dependency wiring, while the runtime owns control branching.

## Why

- Aligns with existing Item World refactor direction (`ItemWorldEntryCorridorRuntime`, `ItemWorldBossClearRuntime`) by moving fixed gameplay flow edges out of scene hot paths.
