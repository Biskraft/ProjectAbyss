/**
 * weapons.ts — Weapon definitions loaded from CSV at build time.
 *
 * SSoT: Sheets/Content_Stats_Weapon_List.csv
 * CSV columns: WeaponID,Name,Type,Rarity,BaseATK,AtkSpeed,Range,HitboxW,HitboxH
 */

import csvText from '../../../Sheets/Content_Stats_Weapon_List.csv?raw';

export type Rarity = 'normal' | 'magic' | 'rare' | 'legendary' | 'ancient';

// RARITY_MULTIPLIER is now derived from Content_Rarity.csv via rarityConfig.ts.
// Kept here as a computed record for backward compatibility with existing imports.
import { getRarityConfig } from './rarityConfig';

export const RARITY_MULTIPLIER: Record<Rarity, number> = {
  normal: getRarityConfig('normal').multiplier,
  magic: getRarityConfig('magic').multiplier,
  rare: getRarityConfig('rare').multiplier,
  legendary: getRarityConfig('legendary').multiplier,
  ancient: getRarityConfig('ancient').multiplier,
};

/** Diablo-style display names */
export const RARITY_DISPLAY_NAME: Record<Rarity, string> = {
  normal: 'Normal',
  magic: 'Magic',
  rare: 'Rare',
  legendary: 'Legendary',
  ancient: 'Ancient',
};

/** Rarity tier index (0=lowest, 4=highest) for numeric comparisons */
export const RARITY_TIER: Record<Rarity, number> = {
  normal: 0,
  magic: 1,
  rare: 2,
  legendary: 3,
  ancient: 4,
};

export interface WeaponDef {
  id: string;
  name: string;
  rarity: Rarity;
  baseAtk: number;
  atkSpeed: number;
  range: number;
  hitboxW: number;
  hitboxH: number;
}

/** Sword weapon definitions — parsed from Content_Stats_Weapon_List.csv */
export const SWORD_DEFS: WeaponDef[] = [];

const lines = csvText.trim().split('\n');
for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split(',');
  if (cols.length < 9) continue;
  SWORD_DEFS.push({
    id: cols[0].trim(),
    name: cols[1].trim(),
    rarity: cols[3].trim().toLowerCase() as Rarity,
    baseAtk: parseFloat(cols[4]),
    atkSpeed: parseFloat(cols[5]),
    range: parseInt(cols[6]),
    hitboxW: parseInt(cols[7]),
    hitboxH: parseInt(cols[8]),
  });
}
