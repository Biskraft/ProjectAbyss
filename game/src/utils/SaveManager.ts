import { SWORD_DEFS, type Rarity } from '@data/weapons';
import { createItem, recalcItemAtk, type ItemInstance, type ItemWorldProgress } from '@items/ItemInstance';
import { Inventory } from '@items/Inventory';

const SAVE_KEY = 'projectabyss_save';

export interface SaveData {
  version: 3;
  player: {
    hp: number;
    maxHp: number;
    atk: number;
    def: number;
  };
  /** Current level identifier for respawn. */
  levelId: string;
  inventory: {
    items: SerializedItem[];
    equippedUid: number | null;
  };
  abilities: {
    dash: boolean;
    diveAttack: boolean;
    surge: boolean;
    waterBreathing: boolean;
    wallJump: boolean;
    doubleJump: boolean;
    cheat?: boolean;
  };
  /** Unlocked doors/switches (by IID or event name). */
  unlockedEvents: string[];
  /** Collected relic keys. */
  collectedRelics: string[];
  /** Collected item keys. */
  collectedItems: string[];
  /** Visited level identifiers (fog of war reveal). */
  visitedLevels: string[];
  /** Cleared level identifiers. */
  clearedLevels: string[];
  /** Player gold. */
  gold: number;
  /** Total play time in ms. */
  playtime: number;
}

interface SerializedItem {
  defId: string;
  rarity: Rarity;
  level: number;
  exp: number;
  uid: number;
  worldProgress?: ItemWorldProgress;
}

function serializeItem(item: ItemInstance): SerializedItem {
  const si: SerializedItem = {
    defId: item.def.id,
    rarity: item.rarity,
    level: item.level,
    exp: item.exp,
    uid: item.uid,
  };
  if (item.worldProgress) {
    si.worldProgress = item.worldProgress;
  }
  return si;
}

function deserializeItem(data: SerializedItem): ItemInstance | null {
  const def = SWORD_DEFS.find(d => d.id === data.defId);
  if (!def) return null;
  const item = createItem(def, data.rarity);
  item.level = data.level;
  item.exp = data.exp;
  if (data.worldProgress) {
    item.worldProgress = data.worldProgress;
  }
  recalcItemAtk(item);
  return item;
}

export class SaveManager {
  static save(params: {
    player: { hp: number; maxHp: number; atk: number; def: number };
    levelId: string;
    inventory: Inventory;
    abilities: { dash: boolean; diveAttack: boolean; surge: boolean; waterBreathing: boolean; wallJump: boolean; doubleJump: boolean; cheat?: boolean };
    unlockedEvents: Set<string>;
    collectedRelics: Set<string>;
    collectedItems: Set<string>;
    visitedLevels: Set<string>;
    clearedLevels: Set<string>;
    gold: number;
    playtime: number;
  }): void {
    const data: SaveData = {
      version: 3,
      player: { ...params.player },
      levelId: params.levelId,
      inventory: {
        items: params.inventory.items.map(serializeItem),
        equippedUid: params.inventory.equipped?.uid ?? null,
      },
      abilities: { ...params.abilities },
      unlockedEvents: [...params.unlockedEvents],
      collectedRelics: [...params.collectedRelics],
      collectedItems: [...params.collectedItems],
      visitedLevels: [...params.visitedLevels],
      clearedLevels: [...params.clearedLevels],
      gold: params.gold,
      playtime: params.playtime,
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch {
      // Storage full or unavailable
    }
  }

  static load(): SaveData | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (data.version !== 3) return null;
      return data as SaveData;
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
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      return data.version === 3;
    } catch {
      return false;
    }
  }

  static deleteSave(): void {
    localStorage.removeItem(SAVE_KEY);
  }
}
