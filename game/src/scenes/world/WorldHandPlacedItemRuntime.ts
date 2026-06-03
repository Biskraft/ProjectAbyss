import type { LdtkLevel } from '@level/LdtkLoader';
import { getMasterItem } from '@data/itemMaster';
import { trackItemDrop } from '@utils/Analytics';

interface WorldHandPlacedItemRuntimeDeps {
  hasCollectedItem: (key: string) => boolean;
  addCollectedItem: (key: string) => void;
  spawnFixedItem: (x: number, y: number, itemId: string, itemKey?: string) => void;
}

export class WorldHandPlacedItemRuntime {
  constructor(private readonly deps: WorldHandPlacedItemRuntimeDeps) {}

  loadLevel(level: LdtkLevel): void {
    for (const entity of level.entities) {
      if (entity.type !== 'Item') continue;

      const itemKey = `${level.identifier}:${entity.px[0]},${entity.px[1]}`;
      if (this.deps.hasCollectedItem(itemKey)) continue;

      const rawItemId = (entity.fields['ItemId'] ?? entity.fields['itemId'] ?? entity.fields['itemID'] ?? '') as string;
      const itemId = rawItemId.toLowerCase();
      if (itemId === 'sword_broken') {
        this.deps.addCollectedItem(itemKey);
        continue;
      }

      this.deps.spawnFixedItem(entity.px[0], entity.px[1], itemId, itemKey);
      trackItemDrop({
        source: 'hand_placed',
        item_id: itemId,
        item_rarity: getMasterItem(itemId)?.rarity ?? 'normal',
        level_id: level.identifier,
      });
    }
  }
}
