/**
 * itemGrowth.ts — Item level growth rates loaded from CSV.
 *
 * SSoT: Sheets/Content_Item_Growth.csv
 * CSV columns: Rarity,AtkPerLevel,ExpPerLevel,MaxLevel
 */

import csvText from '../../../Sheets/Content_Item_Growth.csv?raw';
import type { Rarity } from './weapons';

interface GrowthEntry {
  atkPerLevel: number;
  expPerLevel: number;
  maxLevel: number;
}

const GROWTH = new Map<string, GrowthEntry>();

const lines = csvText.trim().split('\n');
for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split(',');
  if (cols.length < 4) continue;
  GROWTH.set(cols[0].trim().toLowerCase(), {
    atkPerLevel: parseInt(cols[1]),
    expPerLevel: parseInt(cols[2]),
    maxLevel: parseInt(cols[3]),
  });
}

const FALLBACK: GrowthEntry = { atkPerLevel: 4, expPerLevel: 300, maxLevel: 99 };

export function getItemGrowth(rarity: Rarity): GrowthEntry {
  return GROWTH.get(rarity) ?? FALLBACK;
}

/** Convenience: EXP_PER_LEVEL (same for all rarities currently). */
export const EXP_PER_LEVEL = (GROWTH.get('normal') ?? FALLBACK).expPerLevel;

/** Convenience: MAX_ITEM_LEVEL (same for all rarities currently). */
export const MAX_ITEM_LEVEL = (GROWTH.get('normal') ?? FALLBACK).maxLevel;
