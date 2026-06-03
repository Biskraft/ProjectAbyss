# WorldFrozenSnapshotRuntime

`game/src/scenes/world/WorldFrozenSnapshotRuntime.ts` owns the LDtk world frozen player snapshot render copy used by the dungeon-atmosphere return flow.

Invariants:

- The runtime owns the snapshot container, `RGBSplitFilter`, and grayscale `ColorMatrixFilter`.
- `createFromPlayer()` captures the player's current rendered pose and attaches it to the caller-provided vivid layer.
- `update()` grows RGB split and grayscale intensity from player distance to the frozen snapshot.
- `destroySnapshot()` removes/destroys the snapshot and clears filter references.
- `WorldFrozenReturnRuntime` still owns proximity UI, confirm input, and the white return fade; it reads the snapshot through `WorldFrozenSnapshotRuntime.snapshot`.
- `WorldItemDeploymentAtmosphereFlowRuntime` owns player reparenting between `entityLayer` and `vividLayer` during anvil-entry dungeon atmosphere.

Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed with only existing line-ending warnings.
