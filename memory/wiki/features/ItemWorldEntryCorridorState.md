# ItemWorldEntryCorridorState

- `game/src/scenes/itemworld/ItemWorldEntryCorridorState.ts` owns pure entry-corridor flags: active state, bottom-exit Y, and deferred entry-dialogue delivery after corridor completion.
- `ItemWorldScene` still owns corridor activation/completion orchestration, grid handoff, player placement, and camera bounds, but should not reintroduce separate `entryCorridorActive`, `entryCorridorDialoguePending`, or `entryCorridorBottomExitY` fields.
- Use `activate()`, `requestDialogueAfterCompletion()`, `consumeDialogueAfterCompletion()`, `complete()`, and `reset()` for lifecycle changes so exit cleanup and deferred dialogue stay consistent.
- Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, and `http://localhost:3000/play/?debug=1` Puppeteer smoke passed.
