/**
 * rarityConfig.ts — Rarity-level constants loaded from CSV.
 *
 * SSoT: Sheets/Content_Rarity.csv
 * Centralizes: multiplier, innocent slots, color, bare-hand ATK, spawn/drop chances.
 */

import csvText from '../../../Sheets/Content_Rarity.csv?raw';
import type { Rarity } from './weapons';

export interface RarityEntry {
  multiplier: number;
  innocentSlots: number;
  color: number;
  bareHandAtk: number;
  innocentSpawnChance: number;
  dropChance: number;
}

const RARITY_MAP = new Map<string, RarityEntry>();

const lines = csvText.trim().split('\n');
for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split(',');
  if (cols.length < 7) continue;
  const rarity = cols[0].trim().toLowerCase();
  RARITY_MAP.set(rarity, {
    multiplier: parseFloat(cols[1]),
    innocentSlots: parseInt(cols[2]),
    color: parseInt(cols[3].trim(), 16) || parseInt(cols[3].trim()),
    bareHandAtk: parseInt(cols[4]),
    innocentSpawnChance: parseFloat(cols[5]),
    dropChance: parseFloat(cols[6]),
  });
}

export function getRarityConfig(rarity: Rarity): RarityEntry {
  return RARITY_MAP.get(rarity) ?? { multiplier: 1, innocentSlots: 2, color: 0xffffff, bareHandAtk: 5, innocentSpawnChance: 0.15, dropChance: 0.30 };
}

/** Convenience: get bare-hand ATK (same across all rarities in current CSV). */
export const BARE_HAND_ATK = getRarityConfig('normal').bareHandAtk;

/** Convenience: get drop chance (same across all rarities in current CSV). */
export const DROP_CHANCE = getRarityConfig('normal').dropChance;
