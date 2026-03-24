export type Rarity = 'normal' | 'magic' | 'rare' | 'legendary' | 'ancient';

export const RARITY_MULTIPLIER: Record<Rarity, number> = {
  normal: 1.0,
  magic: 1.3,
  rare: 1.7,
  legendary: 2.2,
  ancient: 3.0,
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

/** Sword weapon definitions from Content_Stats_Weapon_List.csv */
export const SWORD_DEFS: WeaponDef[] = [
  { id: 'sword_normal', name: 'Starter Blade', rarity: 'normal', baseAtk: 15, atkSpeed: 1.0, range: 64, hitboxW: 45, hitboxH: 19 },
  { id: 'sword_magic', name: 'Steel Longsword', rarity: 'magic', baseAtk: 20, atkSpeed: 1.0, range: 64, hitboxW: 45, hitboxH: 19 },
  { id: 'sword_rare', name: 'Rune Blade', rarity: 'rare', baseAtk: 26, atkSpeed: 1.0, range: 68, hitboxW: 47, hitboxH: 20 },
  { id: 'sword_legendary', name: 'Abyssal Edge', rarity: 'legendary', baseAtk: 33, atkSpeed: 1.05, range: 72, hitboxW: 49, hitboxH: 21 },
  { id: 'sword_ancient', name: 'Abyss Phantom', rarity: 'ancient', baseAtk: 45, atkSpeed: 1.1, range: 76, hitboxW: 51, hitboxH: 22 },
];
