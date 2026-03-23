export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary' | 'mythic';

export const RARITY_MULTIPLIER: Record<Rarity, number> = {
  common: 1.0,
  uncommon: 1.3,
  rare: 1.7,
  legendary: 2.2,
  mythic: 3.0,
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
  { id: 'sword_common', name: '시작의 검', rarity: 'common', baseAtk: 15, atkSpeed: 1.0, range: 64, hitboxW: 45, hitboxH: 19 },
  { id: 'sword_uncommon', name: '강철 장검', rarity: 'uncommon', baseAtk: 20, atkSpeed: 1.0, range: 64, hitboxW: 45, hitboxH: 19 },
  { id: 'sword_rare', name: '룬 블레이드', rarity: 'rare', baseAtk: 26, atkSpeed: 1.0, range: 68, hitboxW: 47, hitboxH: 20 },
  { id: 'sword_legendary', name: '심연의 검', rarity: 'legendary', baseAtk: 33, atkSpeed: 1.05, range: 72, hitboxW: 49, hitboxH: 21 },
  { id: 'sword_mythic', name: '아비스 팬텀', rarity: 'mythic', baseAtk: 45, atkSpeed: 1.1, range: 76, hitboxW: 51, hitboxH: 22 },
];
