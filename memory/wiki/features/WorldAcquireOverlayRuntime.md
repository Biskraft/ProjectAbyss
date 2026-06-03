# WorldAcquireOverlayRuntime

- `game/src/scenes/world/WorldAcquireOverlayRuntime.ts` owns LDtk world `AcquireOverlay` creation, z-order attachment, blocking update, confirm input consumption, and destruction.
- `LdtkWorldScene` should call `show(config)`, `update(dt)`, and read `isBlocking`; it should not directly create or store `AcquireOverlay`.
- The runtime hides HUD/minimap while an acquire modal is active, then restores HUD and restores minimap only when the scene is not in an Item Tunnel.
- `ATTACK` is always consumed while the modal is blocking; confirmation only fires once `AcquireOverlay.canConfirm()` is true.
- Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, and `/play/?debug=1` Puppeteer smoke passed.
