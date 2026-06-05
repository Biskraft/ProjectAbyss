# ItemWorldWeatherRuntime

- `game/src/scenes/itemworld/ItemWorldWeatherRuntime.ts` owns procedural Item World stratum weather lifetime.
- It reads the current Item World background area palette row, creates `WeatherSystem` only when `Weather=stratum`, maps weapon temperament to the stratum weather profile, binds the current full IntGrid as collision, updates by camera viewport, and destroys the weather system on scene exit/destroy.
- Camera-viewport weather update, weather collision solid predicate, and destroy/null cleanup are shared through `game/src/scenes/shared/WeatherRuntimeHelpers.ts`; palette lookup, stratum profile resolution, and full-grid collision binding remain in this runtime.
- `ItemWorldScene` still creates the world-space `weatherLayer` to preserve render order, and calls `weatherRuntime.init()` only after `buildFullMap()` plus `applyFluidGenericResolution()` so weather collision sees resolved tiles.
- Keep the runtime on lazy getters for theme slug, full grid, weather layer, and temperament because these values are assigned during `ItemWorldScene.init()` and stratum rebuild.
- Do not move Item World palette/weather-profile resolution into `WeatherRuntimeHelpers`; it should stay a camera-update/destroy helper.
- Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, and `/play/?debug=1` Puppeteer smoke passed after extraction.
