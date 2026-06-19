# ItemWorldEgoDialogueRuntime

`game/src/scenes/itemworld/ItemWorldEgoDialogueRuntime.ts` owns procedural Item World Ego dialogue entry state and trigger policy.

Current responsibilities:

- Detect whether the entered item has Ego dialogue and increment the persistent entry counter event.
- Own the per-entry "entry dialogue started" gate so corridor completion and direct entry cannot schedule duplicate enter dialogue.
- Own per-entry Ego trigger flags so one-shot lines do not repeat within the same run.
- Gate first-boss-onboarding lines on `EGO_EVENT.BOSS_KILLED`.
- Fire entry, monster-visible, first-kill, room-clear, innocent, player-death, boss-kill, re-entry, weapon-swap-return, and affinity-max dialogue lines through the scene-owned `LoreDisplay`.
- The active/flagged/idle `LoreDisplay` dialogue fire gate is shared through `game/src/scenes/shared/EgoDialogueRuntimeHelpers.ts`; this runtime still owns which Ego lines are eligible and when.

Scene-owned boundaries:

- `ItemWorldScene` still owns `egoUnlockedEvents` persistence and passes the set into this runtime.
- `LoreDisplay` lifetime remains scene-owned because it is shared by memory triggers, residents, and other scene flows.
- Keep the public `fireEgo*()` wrappers in `ItemWorldScene` as compatibility delegates unless all existing callers are migrated.
- `ItemWorldResidentRuntime` may write to the runtime-provided `egoFlags`/`egoUnlockedEvents` for proximity resident lines, but it does not own entry counts or global Ego trigger policy.

Verification after extraction: `npx tsc --noEmit`, `npm run build`, and `http://localhost:3000/play/?debug=1` Puppeteer smoke passed.

2026-06-02 update: moved the remaining `entryDialogueStarted` flag from `ItemWorldScene` into this runtime through `tryMarkEntryDialogueStarted()`. Verification: `npx tsc --noEmit`, `npm run build`, and `http://localhost:3000/play/?debug=1` Puppeteer smoke passed.

## 2026-06-17 - Rustborn dialogue reset

- Rustborn/Ego dialogue is intentionally reset for rewriting.
- `game/src/data/EgoDialogue.ts` keeps exported dialogue hooks and event keys, but all Rustborn/Ego `LoreLine[]` exports currently return empty arrays.
- `LoreDisplay.showDialogue([])` is a no-op so existing trigger paths can remain wired without showing stale dialogue.
- `Sheets/Content_Localization.csv` and generated locale JSON had `ego.*` and `prologue.rustborn.*` text keys removed. Item names/descriptions such as `item.sword_rustborn.*` remain.
- Prevention rule: do not reintroduce Rustborn player-facing dialogue outside the localization SSoT and the explicit `EgoDialogue.ts` exports.
