# HudSkinFrameDisplay

## 2026-06-05

- `game/src/ui/hud/HudSkinFrameDisplay.ts` owns skin-mode HUD static frame, portrait, HP fill, floor fill, minimap frame, and depth gauge sprite construction.
- `HUD.applySkin()` stores the returned display handles and dynamic measurements, then continues to own visibility, redraw, layout re-application, and async skin lifecycle ordering.
- Keep player-facing text and key prompt behavior outside this helper; it should only build atlas-backed HUD frame/fill sprites and related masks.
