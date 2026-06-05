# WorldContainerCarryRuntime

`game/src/scenes/world/WorldContainerCarryRuntime.ts` owns LDtk world throwable-container carry UI/VFX state.

- Owns held/pulling container state, pull interpolation origin, lift prompt, and `ArcTether` lifetime.
- Empty carry-state construction plus grab/carry/tether state advancement are shared through `game/src/scenes/shared/ContainerCarryStateHelpers.ts`; world still owns its prompt container, `ArcTether` creation/attachment, and update sequencing around prompt projection.
- Uses the existing `ContainerInteraction` helpers for grab/release, held-position interpolation, prompt projection, and tether phase updates.
- `LdtkWorldScene` still owns container search, container physics/destruction/fluid interactions, and the Ego Shard cast suppression check via `heldContainer`.
- Room reload should call `reset()` after clearing container entities so held/pulling state and tether visibility do not leak across LDtk levels.
- Do not move world prompt container ownership or `ArcTether` display attachment into `ContainerCarryStateHelpers`; shared helpers may advance tether state but must not own display attachment or prompt lifetime.

Verification: 2026-06-03 `npx tsc --noEmit`, `npm run build`, and Puppeteer smoke against `http://localhost:3000/play/?debug=1` passed.
