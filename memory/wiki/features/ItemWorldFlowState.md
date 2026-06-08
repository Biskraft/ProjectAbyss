# ItemWorldFlowState

- `game/src/scenes/itemworld/ItemWorldFlowState.ts` owns the remaining non-room procedural Item World flow state: `none`, `exit_fade`, and `post_clear_hold`.
- `ItemWorldRoomTransitionRuntime` still owns room fade state, `ItemWorldExitFadeRuntime` still owns exit-fade overlay timing, and `ItemWorldStratumClearRuntime` still owns `post_clear_hold` input handling.
- `ItemWorldScene` should use `isExitFade`, `isPostClearHold`, `startExitFade()`, `startPostClearHold()`, and `reset()` instead of reintroducing a scene-owned `transitionState` field.
- Prompt suppression still reports room transitions and absorb/dissolve first, then falls back to explicit exit/post-clear flags.
- 2026-06-21: `isActive` public getter removed to keep the state API surface to explicit flag getters only (`isExitFade`/`isPostClearHold`) and reduce ambiguous transition queries.
- Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, and `http://localhost:3000/play/?debug=1` Puppeteer smoke passed.

- 2026-06-08 prologue death policy: death inside prologue Item World does not run the normal death result/exit flow. ItemWorldScene restarts the prologue Item World run by resetting per-run progress (isitedRooms, clearedRooms, spawnedRooms, ossPortals, lastSafeStratum, deepestUnlocked, cleared), respawning the source player, and replacing the active ItemWorldScene under TransitionDirector black cover. Normal Item World death remains unchanged. Verification: 
px tsc --noEmit from game/ passed.
