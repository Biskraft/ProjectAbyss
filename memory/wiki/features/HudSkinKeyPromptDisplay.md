# HudSkinKeyPromptDisplay

## 2026-06-05

- `game/src/ui/hud/HudSkinKeyPromptDisplay.ts` owns skin-mode HUD key prompt sprite/text construction for flask, item, map, and action keys.
- `HUD.applySkin()` keeps `UISkin` lifecycle and field storage, while the helper returns pulse centers and flask icon metrics needed by existing redraw paths.
- Preserve existing localization/key prompt behavior; this helper only moves atlas placement and metric extraction out of `HUD.ts`.
