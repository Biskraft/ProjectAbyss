# ItemWorldContainerPhysicsRuntime

- `game/src/scenes/itemworld/ItemWorldContainerPhysicsRuntime.ts` owns procedural Item World throwable-container body updates, environment impact checks, enemy/container overlap resolution, player/container overlap resolution, thrown-container enemy hit dispatch, player-pushed container X-occupancy checks, and final container-fluid flush.
- The per-frame physics orchestration is shared with the LDtk world runtime through `game/src/scenes/shared/ContainerPhysicsRuntimeHelpers.ts`; Item World keeps only procedural dependency wiring.
- `ItemWorldContainerRegistry` owns the shared container list and clear/settle lifecycle.
- `ItemWorldContainerCarryRuntime` remains the grab/carry/prompt state owner. Do not merge carry state into physics; physics should read the registry-provided container list and skip held/destroyed containers.
- `ItemWorldScene` still owns paint/destruction/fluid-effect callbacks (`paintContainerImpact`, `applyContainerEffectToFluid`, `destroyContainerWithVFX`) because those touch tile mutation, VFX, and fluid-system side effects outside the container physics boundary.
- Wood-family containers still treat fluid cells as solid through the runtime's `isContainerSolidCellFor()` rule, matching the previous scene-owned block.
- Verification on 2026-06-02 after moving the scene helper implementations into the runtime: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed. `git diff --check` only reported existing line-ending warnings.
