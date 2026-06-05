# WorldFrozenReturnRuntime

- `game/src/scenes/world/WorldFrozenReturnRuntime.ts` owns the frozen-snapshot return interaction UI used by the LDtk world dungeon-atmosphere flow.
- It owns the snapshot proximity handler, `[C] Return` prompt, Item World leave-confirm panel, confirm/cancel input consumption, and the white return fade ticker.
- `WorldDungeonAtmosphereRuntime` owns the dungeon atmosphere filters, and `WorldFrozenSnapshotRuntime` owns the frozen player snapshot render copy plus RGB/grayscale distance filter updates. `WorldItemDeploymentAtmosphereFlowRuntime` owns player reparenting to `vividLayer`; `LdtkWorldScene` still owns the deployment-state cancellation callback.
- The runtime reads the snapshot through `WorldFrozenSnapshotRuntime.snapshot`; do not re-add frozen snapshot render/filter fields to `LdtkWorldScene`.
- `LdtkWorldScene` calls `WorldFrozenReturnRuntime.updatePrompt()` directly during the world update loop; do not add a scene-local prompt wrapper back.
- `deactivateDungeonAtmosphere()` should call `WorldFrozenReturnRuntime.clearInteraction()`, not destroy the runtime, because the return white fade may still be active until its fade-out phase completes.
- Scene `exit()` / `destroy()` must call `WorldFrozenReturnRuntime.destroy()` so ticker callbacks and overlay graphics cannot leak across scene changes.
- Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, and `/play/?debug=1` Puppeteer smoke passed.

- 2026-06-05: Runtime-owned prompt, confirm panel, and return fade overlay cleanup now uses `DisplayObjectLifecycleHelpers.destroyDisplayObject`; proximity/ticker removal and transition state ownership remain unchanged.
- 2026-06-05: Confirm/cancel input consumption now uses `InputPressHelpers`: `ATTACK` confirm consumes a single action, while cancel checks `JUMP/DASH/MENU/CANCEL` and consumes the full cancel set in the previous order.
