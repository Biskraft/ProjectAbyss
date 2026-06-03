# WorldBuilderSpriteRuntime

`game/src/scenes/world/WorldBuilderSpriteRuntime.ts` owns LDtk Giant Builder `BuilderSprite` tile rendering.

Invariants:

- `spawnIfSprite(builder, entity)` handles only `BuilderSprite` entities and returns whether the entity was consumed, matching the other builder child spawn runtimes.
- The runtime reads the LDtk entity tile metadata, loads the authored tileset through `assetPath()`, creates a nearest-neighbor frame texture, and adds a bottom-center anchored sprite to `builder.bodyLayers.wall`.
- `LdtkWorldScene` still owns iterating builder entities and dispatching to builder child runtimes, but it should not keep a `BuilderSprite` switch case.
- Builder sprites are visual-only; they do not register collision or attachment state.
- Do not reintroduce Pixi asset/frame construction for `BuilderSprite` cases into `LdtkWorldScene.spawnBuilderEntities()`.

Verification on 2026-06-03: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed with only existing line-ending warnings.
