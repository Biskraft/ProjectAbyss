# ItemRewardFactory

`game/src/items/ItemRewardFactory.ts` owns deterministic item instance creation for reward paths that need a weapon by rarity.

Current state:

- `createDungeonRewardItemByRarity(rarity)` chooses the first matching non-starter weapon for the requested rarity.
- If no same-rarity non-starter weapon exists, it falls back to the first non-starter weapon, then `SWORD_DEFS[0]`.
- `createGoldenRewardItemByRarity(rarity)` preserves golden-drop fallback behavior: matching non-starter rarity, then rare non-starter, then `SWORD_DEFS[2]`.
- `createRandomRareOrBetterRewardItem(random?)` preserves secret-wall random reward behavior: random non-normal weapon, then `SWORD_DEFS[0]` fallback.
- Legacy procedural `WorldScene`, LDtk `WorldPortalItemWorldFlowRuntime`, normal enemy `rollDrop(...)`, golden enemy `rollGoldenDrop(...)`, and random secret-wall rewards use this helper module for weapon reward item creation.

Prevention rules:

- Do not reintroduce scene-local `SWORD_DEFS.filter(...)` reward selection for portal rewards.
- Do not reintroduce runtime-local `SWORD_DEFS.filter(...)` reward selection for secret-wall random rewards.
- Keep starter-only weapon exclusion and fallback weapon selection in this factory for reward paths.
- Keep probabilistic drop rarity rolling in `ItemDrop.ts`; this factory only converts a chosen rarity into an item instance.
