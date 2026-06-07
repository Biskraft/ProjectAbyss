# TransitionDirector

- `game/src/effects/TransitionDirector.ts` is the single owner for C2 cover/swap/reveal screen transitions.
- `Game` creates one top-level `transitionLayer` and one `transitionDirector`; the layer is stage-level, camera-independent, and above normal HUD containers.
- The director locks input and blocks `SceneManager.update()` while active.
- `coverSwapReveal` contract: cover to alpha 1, run `onSwap`, hold one rendered frame at alpha 1, then reveal.
- 2026-06-06 first routed users: LDtk world edge swaps, World void return, Item World room swaps, Item World exit fade, Item World entry push, Item World return fade, and legacy `WorldScene` room/portal swaps.
- 2026-06-06 follow-up: Anvil deployment `ItemWorldEntrySequence` final black handoff and Frozen Return white return fade also route through the director. `ItemWorldTransitionController` still owns the signal-cut rarity-ring visual, but its final black load handoff now runs under the director.
- 2026-06-06 follow-up 2: Item World absorb/pull-in completion now finishes under a director full-black handoff. `WorldPullIn` remains the C3 fragment visual owner, but state mutation/onComplete is no longer run on an uncovered frame.
- 2026-06-06 follow-up 3: `TitleScene` start-to-world handoff no longer creates a local fade overlay; it uses `TransitionDirector` for black cover, scene replace, and reveal.
- 2026-06-06 follow-up 4: Prologue end handoff now routes final Item World `onDone()` and Chapter 1 `enterChapter1FromPrologue()` through `TransitionDirector`. Threat/cinematic overlays remain C3 visuals, but scene mutation happens under cover.
- 2026-06-06 dive fix: `ItemWorldEntryPushTransition` must perform its scene push whenever it is called while `TransitionDirector` is already active, not only when `alreadyBlack` is true. Some world-to-ItemWorld dive paths invoke the push from a director-covered handoff without setting `alreadyBlack`; gating on that flag can skip the actual dive after the shrink/cover visual.
- 2026-06-06 prologue wake fix: `ItemWorldPrologueEndRuntime` requires the `game` dependency so its final handoff can use `Game.transitionDirector`. Prologue wake input must not rely only on `InputManager.isDown()` because that path respects `inputLocked`; include raw movement key checks for the wake gate while keeping actual movement locked until the wake delay ends.
- 2026-06-06 prologue white transition timing: after Malsoja appears, `ItemWorldPrologueEndRuntime` fades to white, then the Chapter 1 handoff enters `WorldPrologueEndRuntime` with a 2000ms white hold, 2500ms white-in, and a long 10000ms 0.1 -> 1.0 zoom. The scene mutation remains under `TransitionDirector`; the post-swap white-in is a cinematic overlay so the camera can move while white fades out.
- Legacy `PortalTransition` still owns its colored signal/wipe visual, but its final scene push is handed off under a director-owned rarity-colored cover.
- Do not add new C2 fade overlays or local fade state machines. Route content swaps through `Game.transitionDirector`.

- 2026-06-07 startup UI follow-up: SceneManager.replace() must not hide global UI containers (uiContainer, legacyUIContainer, eedbackOverlayContainer) during director-covered swaps. TransitionDirector owns the cover layer; scene/UI visibility should remain scene-owned to avoid post-transition UI disappearance.
