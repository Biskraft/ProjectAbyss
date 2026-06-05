import type { Container } from 'pixi.js';
import type { Player } from '@entities/Player';
import type { ItemDropEntity } from '@items/ItemDrop';
import type { Inventory } from '@items/Inventory';
import { getDisplayName } from '@items/ItemInstance';
import { getRarityConfig } from '@data/rarityConfig';
import { t } from '@i18n';
import { getDropItemKey } from '@scenes/world/PickupMetadata';
import {
  addEntityToLayer,
  destroyAndClearEntities,
  removeEntityAt,
} from '@scenes/shared/EntityLifecycleHelpers';

interface WorldItemDropRuntimeDeps {
  getPlayer: () => Player;
  getEntityLayer: () => Container;
  getInventory: () => Inventory;
  recordItemCollectedStat: () => void;
  showToast: (message: string, color: number) => void;
  addCollectedItem: (key: string) => void;
  spawnItemPickupGlow: (x: number, y: number, tint: number) => void;
  startSacredPickup: (item: ItemDropEntity['item'], x: number, y: number) => void;
}

export class WorldItemDropRuntime {
  private readonly drops: ItemDropEntity[] = [];

  constructor(private readonly deps: WorldItemDropRuntimeDeps) {}

  get itemDrops(): readonly ItemDropEntity[] {
    return this.drops;
  }

  get count(): number {
    return this.drops.length;
  }

  add(drop: ItemDropEntity): void {
    addEntityToLayer(this.drops, drop, this.deps.getEntityLayer(), { onlyAttachIfUnparented: true });
  }

  latest(): ItemDropEntity | null {
    return this.drops[this.drops.length - 1] ?? null;
  }

  includes(drop: ItemDropEntity): boolean {
    return this.drops.includes(drop);
  }

  clear(): void {
    destroyAndClearEntities(this.drops);
  }

  update(dtMs: number): void {
    const player = this.deps.getPlayer();
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const drop = this.drops[i];
      drop.update(dtMs);
      if (!drop.overlapsPlayer(player.x, player.y, player.width, player.height)) continue;
      if (!this.collect(drop)) continue;
      removeEntityAt(this.drops, i);
    }
  }

  private collect(drop: ItemDropEntity): boolean {
    if (!this.deps.getInventory().add(drop.item)) return false;

    this.deps.recordItemCollectedStat();
    this.deps.showToast(
      t('toast.item_acquired', {
        name: getDisplayName(drop.item),
        rarity: drop.item.rarity.toUpperCase(),
      }),
      0xffcc44,
    );
    const key = getDropItemKey(drop);
    if (key) this.deps.addCollectedItem(key);

    const pickupX = drop.x;
    const pickupY = drop.y;
    this.deps.spawnItemPickupGlow(pickupX, pickupY, getRarityConfig(drop.item.rarity).fxTint);
    this.deps.startSacredPickup(drop.item, pickupX, pickupY);
    return true;
  }
}
