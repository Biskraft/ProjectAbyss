# HudNumeric

## 2026-06-05

- `game/src/ui/hud/HudNumeric.ts` owns HUD-local ratio normalization helpers.
- Use `clampHudRatio` for closed `[0, 1]` HUD ratios, `capHudRatio` only when legacy code intentionally capped the upper bound without a lower clamp, and `hudRatio` for value/max pairs with a safe fallback.
- Keep these helpers HUD-scoped unless non-HUD systems need the same semantics; shared scene math remains in `game/src/scenes/shared/NumericHelpers.ts`.
