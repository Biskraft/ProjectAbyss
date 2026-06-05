# WorldBuilderAttachmentRuntime

`game/src/scenes/world/WorldBuilderAttachmentRuntime.ts` owns LDtk world Giant Builder child-entity attachment tracking.

Invariants:

- The runtime owns the attachment list, local builder offsets, alive checks, optional reparenting, and per-frame sync callbacks.
- `WorldBuilderItemRuntime` owns builder-mounted item attachment decisions, `WorldBuilderStaticEntityRuntime` owns builder-mounted `Spike` / `Breakable` / `CollapsingPlatform` attachment decisions, `WorldBuilderDoorSwitchRuntime` owns builder-mounted `LockedDoor` / `Switch` attachment decisions, `WorldBuilderEntranceRuntime` owns builder-mounted entrance glow attachment decisions, and `WorldAnvilSpawnRuntime` owns builder-mounted `Anvil` attachment decisions. `LdtkWorldScene` still owns the active `GiantBuilder` object lifetime.
- Reparented entities move into `builder.container` and keep local coordinates; non-reparented entities must provide a sync callback for world-space updates.
- Use `attachWorldPositioned()` for non-reparented entities whose `x/y` and `container.x/y` should follow builder-local offsets.
- Use `attachSizedWorldPositioned()` for centered, sized entities such as `Breakable`; it keeps the visual container in world space and then restores bottom-center gameplay `x/y`.
- If an attached entity exposes `baseY`, reparenting updates it to the builder-local Y so idle bobbing and prompt tests stay aligned with the visual.
- `clear()` must run when the active builder is destroyed so stale alive checks do not survive into the next level.
- Do not reintroduce a scene-owned `builderAttachments` array or one-line `attachToBuilder()` wrapper to `LdtkWorldScene`.

Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed with only existing line-ending warnings.

- 2026-06-05: Builder-mounted entity reparent now uses `DisplayObjectLifecycleHelpers.detachDisplayObject()` before adding to `builder.container`; local-coordinate/baseY sync semantics remain unchanged.
