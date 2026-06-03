# WorldContainerCarryRuntime

`game/src/scenes/world/WorldContainerCarryRuntime.ts` owns LDtk world throwable-container carry UI/VFX state.

- Owns held/pulling container state, pull interpolation origin, lift prompt, and `ArcTether` lifetime.
- Uses the existing `ContainerInteraction` helpers for grab/release, held-position interpolation, prompt projection, and tether phase updates.
- `LdtkWorldScene` still owns container search, container physics/destruction/fluid interactions, and the Ego Shard cast suppression check via `heldContainer`.
- Room reload should call `reset()` after clearing container entities so held/pulling state and tether visibility do not leak across LDtk levels.

Verification: 2026-06-03 `npx tsc --noEmit`, `npm run build`, and Puppeteer smoke against `http://localhost:3000/play/?debug=1` passed.
