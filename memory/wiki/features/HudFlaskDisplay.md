# HudFlaskDisplay

## 2026-06-05

- `game/src/ui/hud/HudFlaskDisplay.ts` owns flask icon redraw for both fallback Graphics dots and UISkin flask sprites.
- `HUD.ts` keeps flask counts and skin sprite handle state, but should call `redrawHudFlasks(...)` directly when flask counts change instead of maintaining a local `redrawFlask()` wrapper.
- Preserve `previousSkinIcons` cleanup through `redrawHudFlasks(...)`; do not detach/rebuild skin flask sprites ad hoc in `HUD.ts`.
