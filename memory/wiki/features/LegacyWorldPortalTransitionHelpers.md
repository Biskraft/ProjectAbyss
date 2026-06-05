# LegacyWorldPortalTransitionHelpers

`game/src/scenes/shared/LegacyWorldPortalTransitionHelpers.ts` owns legacy procedural `WorldScene` portal transition construction.

- `createLegacyWorldPortalTransition(...)` converts portal world coordinates to screen coordinates using the current camera render offset and creates `PortalTransition` with the portal rarity/source payload.

Boundaries:

- `WorldScene` still owns altar UI closing, transition container attachment, camera shake/hitstop callbacks, portal removal/destruction, and pending portal data.
- `WorldScenePortalItemWorldFlowRuntime` still owns the later Item World scene entry/return orchestration after the transition completes.
