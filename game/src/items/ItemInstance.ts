import { type Rarity, RARITY_MULTIPLIER, type WeaponDef } from '@data/weapons';

let nextItemId = 1;

export interface ItemWorldProgress {
  /** Index of deepest stratum unlocked (boss beaten). 0 = only stratum 0 accessible. */
  deepestUnlocked: number;
  /** Per-stratum visited rooms. Key: stratumIndex, Value: "col,row" strings */
  visitedRooms: Record<number, string[]>;
  /** Per-stratum cleared rooms */
  clearedRooms: Record<number, string[]>;
  /** Last stratum the player safely exited from */
  lastSafeStratum: number;
}

export interface ItemInstance {
  uid: number;           // unique runtime id
  def: WeaponDef;        // base definition
  level: number;         // item level (0~10)
  exp: number;           // accumulated exp toward next level
  rarity: Rarity;

  // Derived (recalculated on level change)
  finalAtk: number;

  // Memory Strata exploration state (lazily initialized on first Item World entry)
  worldProgress?: ItemWorldProgress;
}

export function getOrCreateWorldProgress(item: ItemInstance): ItemWorldProgress {
  if (!item.worldProgress) {
    item.worldProgress = {
      deepestUnlocked: 0,
      visitedRooms: {},
      clearedRooms: {},
      lastSafeStratum: 0,
    };
  }
  return item.worldProgress;
}

export const EXP_PER_LEVEL = 300;
export const EXP_PER_FLOOR = 100;
export const MAX_ITEM_LEVEL = 99;

export function createItem(def: WeaponDef, rarity?: Rarity): ItemInstance {
  const r = rarity ?? def.rarity;
  const item: ItemInstance = {
    uid: nextItemId++,
    def,
    level: 0,
    exp: 0,
    rarity: r,
    finalAtk: 0,
  };
  recalcItemAtk(item);
  return item;
}

/**
 * Disgaea-style exponential growth.
 * Lv0=base, Lv10≈2.6x, Lv30≈17x, Lv50≈117x, Lv99≈19,000x+
 * Formula: baseAtk * rarityMult * (1 + level)^1.5 * (1 + 0.03*level)
 */
export function recalcItemAtk(item: ItemInstance): void {
  const base = item.def.baseAtk * RARITY_MULTIPLIER[item.rarity];
  const growth = Math.pow(1 + item.level, 1.5) * (1 + 0.03 * item.level);
  item.finalAtk = Math.floor(base * growth);
}

export function addItemExp(item: ItemInstance, exp: number): boolean {
  if (item.level >= MAX_ITEM_LEVEL) return false;
  item.exp += exp;
  let leveled = false;
  while (item.exp >= EXP_PER_LEVEL && item.level < MAX_ITEM_LEVEL) {
    item.exp -= EXP_PER_LEVEL;
    item.level++;
    leveled = true;
  }
  if (leveled) recalcItemAtk(item);
  return leveled;
}

export function itemLevelUp(item: ItemInstance): void {
  if (item.level >= MAX_ITEM_LEVEL) return;
  item.level++;
  recalcItemAtk(item);
}

/** Diablo-style rarity colors */
export const RARITY_COLOR: Record<Rarity, number> = {
  normal: 0xffffff,   // White   — Diablo Normal
  magic: 0x6969ff,    // Blue    — Diablo Magic
  rare: 0xffff00,     // Yellow  — Diablo Rare
  legendary: 0xff8000, // Orange  — Diablo Legendary
  ancient: 0x00ff00,  // Green   — Diablo Ancient/Set
};
