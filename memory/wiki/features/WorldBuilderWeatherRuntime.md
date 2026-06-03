# WorldBuilderWeatherRuntime

`game/src/scenes/world/WorldBuilderWeatherRuntime.ts` owns the LDtk world Giant Builder dynamic weather collider cache.

Invariants:

- The runtime owns the reusable `WeatherDynamicCollider` object for the active builder.
- `LdtkWorldScene` still owns the active `GiantBuilder` object and the `WeatherSystem` lifetime.
- `getDynamicColliders(builder)` returns an empty list when no builder is active and keeps the collider's grid/origin synced to the builder container while active.
- Builder weather collision treats solid and one-way builder cells as weather-blocking surfaces.
- `clear(weather)` must run when the active builder is destroyed so `WeatherSystem` drops stale dynamic colliders.
- Do not reintroduce `weatherBuilderCollider` or `getWeatherDynamicColliders()` state to `LdtkWorldScene`.

Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed with only existing line-ending warnings.
