import { getMasterItem } from '@data/itemMaster';
import { SWORD_DEFS, type WeaponDef } from '@data/weapons';
import { createItem } from '@items/ItemInstance';
import { ItemDropEntity } from '@items/ItemDrop';
import { resolveItemDropSpawn } from '@items/DropSpawn';
import { GoldPickup } from '@entities/GoldPickup';
import { t } from '@i18n';
import { setDropItemKey, setPersistedKey } from '@scenes/world/PickupMetadata';

interface WorldFixedItemSpawnRuntimeDeps {
  getCollisionGrid: () => number[][];
  addItemDrop: (drop: ItemDropEntity) => void;
  addGoldPickup: (pickup: GoldPickup) => void;
  showToast: (message: string, color: number) => void;
}

export class WorldFixedItemSpawnRuntime {
  constructor(private readonly deps: WorldFixedItemSpawnRuntimeDeps) {}

  spawn(x: number, y: number, itemId: string, itemKey?: string): void {
    const master = getMasterItem(itemId);
    if (!master) {
      this.spawnWeapon(x, y, itemId, itemKey);
      return;
    }

    switch (master.category) {
      case 'weapon':
        this.spawnWeapon(x, y, master.sourceKey, itemKey);
        break;
      case 'currency':
        this.spawnCurrency(x, y, itemId, itemKey);
        break;
      case 'consumable':
        this.deps.showToast(t('toast.consumable_acquired', { name: master.name }), 0x44ff88);
        break;
      default:
        break;
    }
  }

  private spawnWeapon(x: number, y: number, itemId: string, itemKey?: string): void {
    const def: WeaponDef = SWORD_DEFS.find((weapon) => weapon.id === itemId) ?? SWORD_DEFS[0];
    const item = createItem(def, def.rarity);
    const spawn = resolveItemDropSpawn(x, y, this.deps.getCollisionGrid());
    const drop = new ItemDropEntity(spawn.x, spawn.y, item);
    if (itemKey) setDropItemKey(drop, itemKey);
    this.deps.addItemDrop(drop);
  }

  private spawnCurrency(x: number, y: number, itemId: string, itemKey?: string): void {
    const idMatch = itemId.match(/_(\d+)$/);
    const amount = Math.max(1, Math.floor((idMatch ? parseInt(idMatch[1], 10) : 100) * 0.1));
    const pickup = new GoldPickup(x, y, amount);
    pickup.enableTerrainPhysics(this.deps.getCollisionGrid());
    if (itemKey) setPersistedKey(pickup, itemKey);
    this.deps.addGoldPickup(pickup);
  }
}
