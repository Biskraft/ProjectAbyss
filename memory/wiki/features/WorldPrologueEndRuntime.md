# WorldPrologueEndRuntime

`game/src/scenes/world/WorldPrologueEndRuntime.ts` owns the prologue ending fade/threat sequence that transitions the player from chapter prologue cutscene into chapter 1.

Current state:

- Runs a 3-phase sequence (`arm` -> `threat` -> `fade`) once `loadLevel(PROLOGUE_END_LEVEL)` is called.
- `threat` and `fade` phases are owned by this runtime; each updates `fadeOverlay.alpha` directly.
- On fade completion, transitions scene state to `chapter_01` and loads `Start_Room_01` through callbacks.

Dependencies:

- `getFadeOverlay` (`Graphics` for alpha updates)
- `loadLevel(levelId, enterFrom)` scene transition callback
- `showToast`
- `isPrologueScene` callback instead of direct save read
- `setScene` callback (`chapter_01`) instead of direct save write

Boundaries:

- Do not add world-level scene-graph branching back into this runtime.
- Keep scene transition side-effects (`loadLevel`, scene-id write) delegated through callbacks from `LdtkWorldScene`.
- Keep fade visuals in this runtime to avoid duplicated fade logic at scene scope.

Verification:

- Confirmed by direct code inspection: no `sacredSave` import; scene checks and writes are injected as callbacks.
