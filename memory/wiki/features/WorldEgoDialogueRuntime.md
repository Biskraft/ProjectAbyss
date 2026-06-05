# WorldEgoDialogueRuntime

`game/src/scenes/world/WorldEgoDialogueRuntime.ts` owns LDtk world post-return dialogue scheduling and short-lived world-EGO throttling.

Current state:

- Manages return and swap dialogues in update-driven queues (`WORLD_RETURN_DIALOGUE_DELAY_MS`) and keeps only a pending queue as runtime state.
- `fireWorldReturnDialogue(weaponDefId)` now uses injected save-state contract (`isFirstItemWorldBossDefeated`) to decide whether to prioritize retirement dialogue (`EGO_ANVIL_RETIRED`) before the normal world-return line.
- `notifyWeaponSwap` owns the one-shot weapon-swap hint gating through event set membership and active `LoreDisplay` check.
- `clear()` owns queue reset and async action cancellation token bump; scene-level clear should always call this during handoff/exit.

Dependencies:

- `getPlayer`, `getAnvil`, `getLoreDisplay`, `getUnlockedEvents`
- `isFirstItemWorldBossDefeated` (injected from `LdtkWorldScene`)

Boundaries:

- Do not add world-sound or scene-ownership branching here; this runtime owns only dialogue timing and one-shot conditions.
- Do not re-add direct `sacredSave` reads in this runtime.
- Scene-level transition code remains responsible for when to call `clear()` and `fireWorldReturnDialogue`.

Verification:

- Confirmed by direct code inspection: no `sacredSave` import; callback dependency used in all boss-retirement gating.
