import type { GiantBuilder } from '@entities/GiantBuilder';
import type { LdtkEntity } from '@level/LdtkLoader';
import type { WorldBuilderAttachmentRuntime } from './WorldBuilderAttachmentRuntime';
import type { WorldFixedItemSpawnRuntime } from './WorldFixedItemSpawnRuntime';
import type { WorldItemDropRuntime } from './WorldItemDropRuntime';
import type { WorldPickupRuntime } from './WorldPickupRuntime';

interface WorldBuilderItemRuntimeDeps {
  attachments: WorldBuilderAttachmentRuntime;
  fixedItemSpawn: WorldFixedItemSpawnRuntime;
  itemDrops: WorldItemDropRuntime;
  pickups: WorldPickupRuntime;
  hasCollectedItem: (key: string) => boolean;
  addCollectedItem: (key: string) => void;
}

export class WorldBuilderItemRuntime {
  constructor(private readonly deps: WorldBuilderItemRuntimeDeps) {}

  spawnIfItem(builderLevelId: string, builder: GiantBuilder, entity: LdtkEntity): boolean {
    if (entity.type !== 'Item') return false;

    const localX = entity.px[0];
    const localY = entity.px[1];
    const itemKey = `${builderLevelId}:${localX},${localY}`;
    if (this.deps.hasCollectedItem(itemKey)) return true;

    const rawItemId = (entity.fields['ItemId'] ?? entity.fields['itemId'] ?? entity.fields['itemID'] ?? '') as string;
    const itemId = rawItemId.toLowerCase();
    if (!itemId) return true;

    if (itemId === 'sword_broken') {
      this.deps.addCollectedItem(itemKey);
      return true;
    }

    const beforeDrops = this.deps.itemDrops.count;
    const beforeGold = this.deps.pickups.goldCount;
    const beforeHeal = this.deps.pickups.healingCount;
    this.deps.fixedItemSpawn.spawn(
      builder.container.x + localX,
      builder.container.y + localY,
      itemId,
      itemKey,
    );

    if (this.deps.itemDrops.count > beforeDrops) {
      this.attachLatestItemDrop(builder, localX, localY);
    } else if (this.deps.pickups.goldCount > beforeGold) {
      this.attachLatestGold(builder);
    } else if (this.deps.pickups.healingCount > beforeHeal) {
      this.attachLatestHealing(builder);
    }

    return true;
  }

  private attachLatestItemDrop(builder: GiantBuilder, localX: number, localY: number): void {
    const drop = this.deps.itemDrops.latest();
    if (!drop) return;
    const liftedLocalY = localY - 8;
    this.deps.attachments.attach(
      builder,
      drop,
      localX,
      liftedLocalY,
      () => this.deps.itemDrops.includes(drop),
    );
    drop.baseY = liftedLocalY;
  }

  private attachLatestGold(builder: GiantBuilder): void {
    const pickup = this.deps.pickups.latestGoldPickup();
    if (!pickup) return;
    this.deps.attachments.attach(
      builder,
      pickup,
      pickup.x - builder.container.x,
      pickup.y - builder.container.y,
      () => this.deps.pickups.includesGoldPickup(pickup),
    );
  }

  private attachLatestHealing(builder: GiantBuilder): void {
    const pickup = this.deps.pickups.latestHealingPickup();
    if (!pickup) return;
    this.deps.attachments.attach(
      builder,
      pickup,
      pickup.x - builder.container.x,
      pickup.y - builder.container.y,
      () => this.deps.pickups.includesHealingPickup(pickup),
    );
  }
}
