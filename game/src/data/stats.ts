export interface CharacterStats {
  level: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  str: number;
  int: number;
  dex: number;
  vit: number;
  spd: number;
  lck: number;
  atk: number;
  def: number;
}

/** Lv 1~10 base stats from Content_Stats_Character_Base.csv */
export const BASE_STATS: Omit<CharacterStats, 'atk' | 'def'>[] = [
  { level: 1, hp: 100, maxHp: 100, mp: 100, maxMp: 100, str: 10, int: 8, dex: 9, vit: 10, spd: 8, lck: 5 },
  { level: 2, hp: 115, maxHp: 115, mp: 108, maxMp: 108, str: 12, int: 10, dex: 11, vit: 12, spd: 9, lck: 6 },
  { level: 3, hp: 132, maxHp: 132, mp: 116, maxMp: 116, str: 14, int: 12, dex: 13, vit: 14, spd: 10, lck: 7 },
  { level: 4, hp: 150, maxHp: 150, mp: 124, maxMp: 124, str: 16, int: 14, dex: 15, vit: 16, spd: 11, lck: 8 },
  { level: 5, hp: 170, maxHp: 170, mp: 132, maxMp: 132, str: 18, int: 16, dex: 17, vit: 18, spd: 13, lck: 9 },
  { level: 6, hp: 192, maxHp: 192, mp: 140, maxMp: 140, str: 20, int: 18, dex: 19, vit: 20, spd: 14, lck: 10 },
  { level: 7, hp: 216, maxHp: 216, mp: 148, maxMp: 148, str: 22, int: 20, dex: 21, vit: 22, spd: 15, lck: 11 },
  { level: 8, hp: 242, maxHp: 242, mp: 156, maxMp: 156, str: 24, int: 22, dex: 23, vit: 24, spd: 17, lck: 12 },
  { level: 9, hp: 270, maxHp: 270, mp: 164, maxMp: 164, str: 27, int: 24, dex: 25, vit: 27, spd: 18, lck: 13 },
  { level: 10, hp: 300, maxHp: 300, mp: 172, maxMp: 172, str: 30, int: 27, dex: 28, vit: 30, spd: 20, lck: 14 },
];
