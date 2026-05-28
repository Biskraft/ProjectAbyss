# Weather System

## LDtk Authoring

- Place an LDtk `Weather` entity in a world level to enable weather for that level.
- Supported fields are `WeatherType` (`Rain` or `Snow`), `Density` (`0..1`), `Wind` (`-1..1`), `StreakLength`, and `StreakWidth`.
- `LdtkWorldScene` currently uses the first `Weather` entity in a level and logs a warning if more than one exists.
- Weather uses the runtime collision grid for roof and impact checks. In world scenes, rain/snow collides with solid tiles and one-way platforms, not fluid or updraft cells.

## Implementation Notes

- Runtime class: `game/src/effects/WeatherSystem.ts`.
- Scene wiring: `game/src/scenes/LdtkWorldScene.ts`.
- Weather renders in a world-space `weatherLayer` above fluid/above-fluid VFX and below deployment/vivid layers.
- The camera view passed to `WeatherSystem.update` is level-local (`renderX/renderY`, `GAME_WIDTH / zoom`, `GAME_HEIGHT / zoom`), matching the rest of `LdtkWorldScene` coordinates.

## Rain Streak Collision

- Rain collision is checked against the visible streak tip, not the particle head. Long `StreakLength` values must despawn as soon as the drawn lower endpoint touches a solid/one-way tile.
- `WeatherSystem` uses a swept segment check between the previous and current streak tip, so high rain speed or long streaks do not tunnel through thin platforms.
- Snow keeps point-style collision because it renders as motes instead of streak lines.

## Rain Splash Sprites

- Rain impacts use one randomly selected small sprite texture per hit, not a droplet particle burst.
- Splash sprites are pooled and capped at 48 active instances. Do not replace this with per-impact multi-particle spray unless a stricter VFX budget is added.
- Splashes spawned from a dynamic collider store collider-local coordinates and follow that surface while they fade, so moving Builder surfaces do not leave impact sprites behind.

## Dynamic Colliders

- `WeatherSystem` supports per-frame dynamic grid colliders in addition to the static level collision grid.
- `LdtkWorldScene` passes the active `GiantBuilder` collision grid with the builder's current `container.x/y` as a dynamic collider.
- Builder-stamped host-grid cells are ignored by static weather collision; otherwise the tile-quantized stamp can win before the exact moving Builder collider and make rain/splash impacts appear offset.
