# WorldWeatherRuntime

`game/src/scenes/world/WorldWeatherRuntime.ts` owns LDtk world `Weather` entity parsing and `WeatherSystem` lifetime.

Current state:

- Owns weather creation/destruction, Weather entity field parsing, camera-view update, and dynamic collider assignment for the active Giant Builder.
- Camera-viewport weather update, weather collision solid predicate, and destroy/null cleanup are shared through `game/src/scenes/shared/WeatherRuntimeHelpers.ts`; LDtk Weather entity parsing, dynamic collider assignment, and ignored-cell policy remain in this runtime.
- `LdtkWorldScene` still owns weather-layer creation, level-load timing, builder lifetime, and collision-grid ownership.
- Builder stamped cells are ignored through a scene-provided callback so rain/snow collision does not hit builder-stamped temporary cells.
- `WorldBuilderWeatherRuntime` now only owns the reusable active-builder collider object; world weather clears the actual dynamic colliders.

Prevention rules:

- Do not add a direct `weather: WeatherSystem | null` field back to `LdtkWorldScene`.
- Keep LDtk `Weather` field parsing in this runtime, not in the scene.
- When clearing a builder, call `WorldWeatherRuntime.clearDynamicColliders()` before clearing `WorldBuilderWeatherRuntime`'s cached collider.
- Do not move LDtk Weather field parsing or builder dynamic-collider policy into `WeatherRuntimeHelpers`; it should stay a camera-update/destroy helper.

Verification on 2026-06-03: `npx tsc --noEmit`, `npm run build`, and `http://localhost:3000/play/?debug=1` Puppeteer smoke passed.
