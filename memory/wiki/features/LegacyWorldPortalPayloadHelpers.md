# LegacyWorldPortalPayloadHelpers

`game/src/scenes/shared/LegacyWorldPortalPayloadHelpers.ts` owns legacy procedural `WorldScene` portal dungeon-entry payload preparation.

- `prepareLegacyWorldPortalDungeonEntry(...)` preserves the existing behavior:
  - altar portals use the portal source item as the target item;
  - monster portals create a dungeon reward through `ItemRewardFactory.createDungeonRewardItemByRarity(...)`;
  - previous item level and player ATK are captured before Item World entry.

Boundaries:

- `WorldScene` still owns pending portal data lifetime, transition cleanup, and invoking `WorldScenePortalItemWorldFlowRuntime`.
- `WorldScenePortalItemWorldFlowRuntime` still owns Item World scene creation, push transition, and return/completion side effects.
- Do not move toast, inventory grant, scene push/pop, or transition lifecycle into this helper.
