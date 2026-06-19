# StarterItemFactory

`game/src/items/StarterItemFactory.ts` owns deterministic creation of starter item instances.

- `createBrokenSwordStarterItem()` selects `sword_broken` from `SWORD_DEFS`, falls back to `SWORD_DEFS[0]`, and returns a fresh `ItemInstance`.
- `createRustbornStarterItem()` selects `sword_rustborn` from `SWORD_DEFS`, falls back to `SWORD_DEFS[0]`, and returns a normal-rarity fresh `ItemInstance`.
- Legacy procedural `WorldScene` uses this helper for its initial equipped sword instead of reading weapon master data directly.
- LDtk world test-start inventory also uses this helper so Start_Room_01 item-world testing can start with Rustborn as the only equipped item.

Boundaries:

- Reward drops and dungeon rewards stay in `ItemRewardFactory`.
- Fixed authored world item-id lookup stays in `WorldFixedItemSpawnRuntime`.
- Do not reintroduce scene-local `SWORD_DEFS.find(...)` for starter inventory setup.
