# ItemWorldDebugInputRuntime

- `game/src/scenes/itemworld/ItemWorldDebugInputRuntime.ts` owns procedural Item World debug/enchant input routing.
- In `?debug` with Shift held, it handles Shift+1/2/3 elemental terrain debug callbacks, Shift+O unified cheat toggling/toasts, and Shift+G debug container spawning.
- Shift+G now creates the four debug throwable containers inside the runtime; `ItemWorldScene` only provides the player, container list, and entity layer.
- Without Shift, it handles 1/2/3 active enchant selection for Ego Shard previews/spawns.
- `ItemWorldDevOverlayRuntime` remains responsible only for debug overlay/topology key listeners; do not move RoomGraph overlay or Shift+L topology cycling into this runtime.
- Verification on 2026-06-02 after moving Shift+G spawn creation into the runtime: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke with Shift+G, and `git diff --check` passed. `git diff --check` only reported existing line-ending warnings.
