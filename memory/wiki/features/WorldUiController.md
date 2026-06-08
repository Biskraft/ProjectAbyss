# WorldUiController

`game/src/scenes/world/WorldUiController.ts` owns LDtk world shared UI input routing.

- Handles pause/death input routing, world-map toggle/update, inventory input, persistent toast/tutorial updates, and Item World UI detach.
- Pause state should be derived from `PauseMenu.visible`; do not add a separate `LdtkWorldScene.isPaused` flag.
- Pause open/close callbacks are optional and only needed when a caller has extra side effects.

Verification: 2026-06-03 `npx tsc --noEmit`, `npm run build`, Puppeteer smoke against `http://localhost:3000/play/?debug=1`, and `git diff --check` passed. `git diff --check` only printed existing line-ending warnings.

- 2026-06-05: Item World detach and controller destroy paths now route external UI container removal through detachDisplayObject(); HUD/minimap/world-map/inventory/pause/death containers remain non-destructively detached.
- 2026-06-05: World-map toggle now uses `InputPressHelpers.consumeJustPressedAction()` for the `MAP` press/consume gate; map visibility, HUD/minimap visibility, and open callback ordering remain controller-owned.
- 2026-06-05: Inventory Identity Archive `JUMP` entry and inventory `ATTACK/MENU` callback consumption now also route through `InputPressHelpers.consumeJustPressedAction()`; archive visibility guards and InventoryUI behavior remain controller-owned.
- 2026-06-05: Identity Archive and pause menu direction routing now use `DirectionalInputHelpers.updateVerticalFirstDirectionalInput()` for the shared up/down/left/right order. Inventory keeps its separate left/right-first helper.
- 2026-06-07: `enter()` must respect `game.hudReady` when attaching HUD/minimap. Do not set gameplay UI visible during the first world-entry frame before the intro handoff reveals it.

- 2026-06-07 startup HUD gate: gameplay HUD/minimap must stay hidden while Game.hudReady is false. World intro handoff must not flip hudReady true or reveal HUD after its title delay; the first Item World scene is the reveal point and sets hudReady = true. Modal/respawn/inventory callbacks in LdtkWorldScene must gate HUD/minimap visibility with hudReady.

- 2026-06-08 HUD reveal update: Start_Room_01 is also a gameplay HUD reveal point. LdtkWorldScene.loadLevel() sets Game.hudReady = true and keeps HUD/minimap visible when entering Start_Room_01, while title/prologue pre-start levels can still remain HUD-hidden.

- 2026-06-08 HUD on/off unification: LDtk world HUD/minimap visibility is centralized in LdtkWorldScene via gameplayHudWanted, gameplayHudBlocks, setGameplayHudWanted(), setGameplayHudBlock(), and econcileGameplayHudVisibility(). Do not set hud.container.visible or worldMinimap.setVisible() directly from world callbacks; route modal/cinematic/tunnel/debug map changes through the block system. Item World keeps its own scene-local combat HUD.

- 2026-06-08 world death respawn policy: World game-over respawn now routes through LdtkWorldScene.respawnWorldPlayerAtStartRoom(). It clears game-over/fixed-item/tunnel state, restores saved inventory/progress/abilities when available, sets scene to chapter_01, loads Start_Room_01 with down-entry, and relies on WorldPlayerSpawnRuntime to place the player at the LDtk Player entity. Do not snap to save points on death respawn. Verification: 
px tsc --noEmit from game/ passed.

- 2026-06-08 save-load gameplay restore policy: LdtkWorldScene.restoreWorldGameplayAfterSaveLoad() centralizes world restore cleanup after save load and death/debug respawn. It clears input lock, re-enables player attack input, clears game-over/fixed-item/tunnel/deployment/dive UI state, closes modal UI, clears HUD blocks, and reveals gameplay HUD. Use this instead of direct HUD/input flag edits when restoring world gameplay from persisted or interrupted states. Verification: 
px tsc --noEmit from game/ passed.

- 2026-06-08 save-load tutorial restore policy: TutorialHint.clearTransientState() and InventoryTutorialHintRuntime.clearTransientState() preserve completed hint IDs but remove active panels and pending inventory hint timers during LdtkWorldScene.restoreWorldGameplayAfterSaveLoad(). HUD restore must not re-display tutorial hints after save load. Verification: 
px tsc --noEmit from game/ passed.
