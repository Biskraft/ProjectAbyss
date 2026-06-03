# ItemWorldAbsorbDissolveRuntime

- `game/src/scenes/itemworld/ItemWorldAbsorbDissolveRuntime.ts` owns the final Item World clear absorb/dissolve sequence.
- It owns the pre-applied grayscale/contrast filter, the 1000 ms absorb timer, `WorldPullInTransitionController` lifetime, source restoration cleanup, and the trapdoor sprite fallback reparent before exit fade.
- `ItemWorldScene` starts the sequence when the final `FloatingItemDrop` is absorbed and receives only the completion callback that starts `exit_fade`.
- `prepareFilter()` preserves the existing behavior where the final floating item spawn immediately applies the environment grayscale/contrast filter before interaction.
- Do not reintroduce `absorbing` or `dissolving` into `ItemWorldScene.transitionState`; prompt suppression should read `ItemWorldAbsorbDissolveRuntime.suppressionState` while the runtime is active.
- Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, and `/play/?debug=1` Puppeteer smoke passed.
