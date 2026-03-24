import { SWORD_DEFS, type Rarity } from '@data/weapons';
import { createItem, recalcItemAtk, type ItemInstance } from '@items/ItemInstance';
import { Inventory } from '@items/Inventory';

const SAVE_KEY = 'projectabyss_save';

interface SaveData {
  version: 1;
  player: {
    hp: number;
    maxHp: number;
    atk: number;
    def: number;
    roomCol: number;
    roomRow: number;
  };
  inventory: {
    items: SerializedItem[];
    equippedUid: number | null;
  };
  worldSeed: number;
  playtime: number; // ms
}

interface SerializedItem {
  defId: string;
  rarity: Rarity;
  level: number;
  exp: number;
  uid: number;
}

function serializeItem(item: ItemInstance): SerializedItem {
  return {
    defId: item.def.id,
    rarity: item.rarity,
    level: item.level,
    exp: item.exp,
    uid: item.uid,
  };
}

function deserializeItem(data: SerializedItem): ItemInstance | null {
  const def = SWORD_DEFS.find(d => d.id === data.defId);
  if (!def) return null;
  const item = createItem(def, data.rarity);
  item.level = data.level;
  item.exp = data.exp;
  recalcItemAtk(item);
  return item;
}

export class SaveManager {
  static save(
    playerState: { hp: number; maxHp: number; atk: number; def: number },
    roomCol: number,
    roomRow: number,
    inventory: Inventory,
    worldSeed: number,
    playtime: number,
  ): void {
    const data: SaveData = {
      version: 1,
      player: {
        ...playerState,
        roomCol,
        roomRow,
      },
      inventory: {
        items: inventory.items.map(serializeItem),
        equippedUid: inventory.equipped?.uid ?? null,
      },
      worldSeed,
      playtime,
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch {
      // Storage full or unavailable — silently fail
    }
  }

  static load(): SaveData | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw) as SaveData;
      if (data.version !== 1) return null;
      return data;
    } catch {
      return null;
    }
  }

  static loadInventory(data: SaveData): Inventory {
    const inv = new Inventory();
    for (const si of data.inventory.items) {
      const item = deserializeItem(si);
      if (item) inv.add(item);
    }
    if (data.inventory.equippedUid != null) {
      inv.equip(data.inventory.equippedUid);
    }
    return inv;
  }

  static hasSave(): boolean {
    return localStorage.getItem(SAVE_KEY) !== null;
  }

  static deleteSave(): void {
    localStorage.removeItem(SAVE_KEY);
  }
}
