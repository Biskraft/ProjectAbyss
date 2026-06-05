# ItemWorldDevOverlayRuntime

- `game/src/scenes/itemworld/ItemWorldDevOverlayRuntime.ts` owns procedural Item World developer overlays and debug key listeners.
- It mounts the RoomGraph debug overlay when `?debug=1` or `?debug=graph` is present, toggles it with `Shift+2`, shows the top-left topology source label, and cycles `?topology=` with `Shift+L`.
- `ItemWorldScene` still owns URL topology parsing because that value feeds `generateUnifiedGridFromGraph()` before the overlay is initialized.
- The runtime reads room graphs, item rarity/uid, weapon topology override, and stratum config through getters; do not capture those values at construction because they are assigned during `ItemWorldScene.init()`.
- Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, and `/play/?debug=1` Puppeteer smoke passed after extraction.

- 2026-06-05: RoomGraph debug overlay and topology label cleanup now uses DisplayObjectLifecycleHelpers, preserving child-destroy semantics for the RoomGraph container.
