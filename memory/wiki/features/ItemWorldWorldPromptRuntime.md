# ItemWorldWorldPromptRuntime

- `game/src/scenes/itemworld/ItemWorldWorldPromptRuntime.ts` owns Item World prompts that are anchored to world coordinates and rendered in the UI layer.
- It lazily creates a `KeyPrompt`, reuses it while the localization key is unchanged, projects world coordinates through `game.camera.renderX/renderY`, and hides/destroys the UI container on demand.
- `ItemWorldTrapdoorRuntime` and `ItemWorldAnvilRuntime` use it for Trapdoor/FloatingItemDrop and ItemStratum anvil return prompts. Keep those prompts out of scene-owned `Container | null` fields so camera/UI-scale projection stays in one place.
- Prompt suppression remains caller-owned. The interaction runtime decides when a prompt may show, while this runtime only handles prompt lifetime and placement.
- Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, and `/play/?debug=1` Puppeteer smoke passed.

- 2026-06-05: Prompt destroy now uses `DisplayObjectLifecycleHelpers.destroyDisplayObject(..., { children: true })`, preserving lazy prompt recreation and caller-owned suppression policy.
