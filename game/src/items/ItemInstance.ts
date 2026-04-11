import { type Rarity, type WeaponDef } from '@data/weapons';
import {
  type Innocent,
  type InnocentStatKey,
  INNOCENT_SLOTS_BY_RARITY,
  getInnocentEffectiveValue,
} from '@data/innocents';

export type { Innocent, InnocentStatKey };

let nextItemId = 1;

export interface ItemWorldProgress {
  /** Index of deepest stratum unlocked (boss beaten). 0 = only stratum 0 accessible. */
  deepestUnlocked: number;
  /** Visited rooms as "col,absoluteRow" strings (unified grid coordinates) */
  visitedRooms: string[];
  /** Cleared rooms as "col,absoluteRow" strings (unified grid coordinates) */
  clearedRooms: string[];
  /** Rooms whose enemies have been spawned at least once (kill persistence) */
  spawnedRooms: string[];
  /** Last stratum the player safely exited from */
  lastSafeStratum: number;
  /** All strata beaten at least once. Enables re-dive prompt. */
  cleared: boolean;
  /** Replay cycle counter. 0 = first playthrough, 1+ = re-dives. */
  cycle: number;
}

export interface ItemInstance {
  uid: number;           // unique runtime id
  def: WeaponDef;        // base definition
  level: number;         // item level (0~10)
  exp: number;           // accumulated exp toward next level
  rarity: Rarity;

  // Derived (recalculated on level change)
  finalAtk: number;

  /**
   * Innocents residing inside this item.
   * Capped at INNOCENT_SLOTS_BY_RARITY[rarity]. Wild = 50%, subdued = 100%.
   */
  innocents: Innocent[];

  /** Fixed LDtk level ID — loads this hand-crafted level instead of procedural item world. */
  fixedLevelId?: string;

  // Memory Strata exploration state (lazily initialized on first Item World entry)
  worldProgress?: ItemWorldProgress;
}

export function getOrCreateWorldProgress(item: ItemInstance): ItemWorldProgress {
  if (!item.worldProgress) {
    item.worldProgress = {
      deepestUnlocked: 0,
      visitedRooms: [],
      clearedRooms: [],
      spawnedRooms: [],
      lastSafeStratum: 0,
      cleared: false,
      cycle: 0,
    };
  } else {
    // Backfill new fields for existing saves.
    if (item.worldProgress.cleared === undefined) item.worldProgress.cleared = false;
    if (item.worldProgress.cycle === undefined) item.worldProgress.cycle = 0;
    if (item.worldProgress.spawnedRooms === undefined) item.worldProgress.spawnedRooms = [];
  }
  return item.worldProgress;
}

/** True when the player has beaten every stratum of this item at least once. */
export function isItemFullyCleared(item: ItemInstance): boolean {
  return item.worldProgress?.cleared === true;
}

/** Mark the item as fully cleared (call on deepest stratum boss defeat). */
export function markItemCleared(item: ItemInstance): void {
  const wp = getOrCreateWorldProgress(item);
  wp.cleared = true;
}

/**
 * Reset room/stratum progress for another playthrough. Increments the cycle
 * counter; item level, innocents, and equipment state are preserved.
 */
export function resetItemForNextCycle(item: ItemInstance): void {
  const wp = getOrCreateWorldProgress(item);
  wp.visitedRooms = [];
  wp.clearedRooms = [];
  wp.spawnedRooms = [];
  wp.lastSafeStratum = 0;
  wp.deepestUnlocked = 0;
  wp.cleared = false;
  wp.cycle += 1;
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
    innocents: [],
  };
  recalcItemAtk(item);
  return item;
}

/** ATK per level by rarity — linear growth, no exponential scaling */
const ATK_PER_LEVEL: Record<Rarity, number> = {
  normal: 4,
  magic: 6,
  rare: 8,
  legendary: 10,
  ancient: 14,
};

/** Linear growth: finalAtk = baseAtk + atkPerLevel × level */
export function recalcItemAtk(item: ItemInstance): void {
  item.finalAtk = item.def.baseAtk + ATK_PER_LEVEL[item.rarity] * item.level;
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

// ---------------------------------------------------------------------------
// Innocent helpers
// ---------------------------------------------------------------------------

/**
 * Returns the max number of innocents this item can hold based on rarity.
 */
export function getInnocentSlotCount(item: ItemInstance): number {
  return INNOCENT_SLOTS_BY_RARITY[item.rarity];
}

/**
 * Returns true if the item has room for at least one more innocent.
 */
export function canAddInnocent(item: ItemInstance): boolean {
  return item.innocents.length < getInnocentSlotCount(item);
}

/**
 * Adds an innocent to the item if a slot is available. Returns true on success.
 */
export function addInnocent(item: ItemInstance, innocent: Innocent): boolean {
  if (!canAddInnocent(item)) return false;
  item.innocents.push(innocent);
  return true;
}

/**
 * Subdue an innocent by index — upgrades effectiveness from 50% to 100%.
 */
export function subduedInnocent(item: ItemInstance, index: number): void {
  const innocent = item.innocents[index];
  if (innocent) innocent.isSubdued = true;
}

/**
 * Aggregates total effective bonus for a given stat key across all innocents.
 * Wild = 50% of value, subdued = 100%.
 *
 * Design ref: System_ItemWorld_Core.md — calcInnocentBonus
 */
export function calcInnocentBonus(item: ItemInstance, stat: InnocentStatKey): number {
  let total = 0;
  for (const innocent of item.innocents) {
    if (innocent.stat === stat) {
      total += getInnocentEffectiveValue(innocent);
    }
  }
  return total;
}

/** Diablo-style rarity colors */
export const RARITY_COLOR: Record<Rarity, number> = {
  normal: 0xffffff,   // White   — Diablo Normal
  magic: 0x6969ff,    // Blue    — Diablo Magic
  rare: 0xffff00,     // Yellow  — Diablo Rare
  legendary: 0xff8000, // Orange  — Diablo Legendary
  ancient: 0x00ff00,  // Green   — Diablo Ancient/Set
};
