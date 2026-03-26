import type { Rarity } from '@data/weapons';
import type { TilemapTheme } from '@level/TilemapRenderer';

export interface StratumDef {
  gridWidth: number;
  gridHeight: number;
  /** Base enemy HP for this stratum (replaces skeleton's default) */
  enemyHp: number;
  /** Base enemy ATK for this stratum */
  enemyAtk: number;
  enemyCountBonus: number;
  /** Boss HP */
  bossHp: number;
  /** Boss ATK */
  bossAtk: number;
  expMultiplier: number;
  theme: TilemapTheme;
}

export interface StrataConfig {
  strata: StratumDef[];
}

/**
 * Item World enemy stats by rarity.
 * Design rule: Normal Lv5 item ≈ Magic base enemies
 *   Normal base ATK 15, Lv5 = 25  → Magic enemies HP 60, ATK 12
 *   Magic  base ATK 20, Lv5 = 35  → Rare enemies HP 90, ATK 18
 *   Rare   base ATK 26, Lv5 = 46  → Legendary enemies HP 130, ATK 25
 *   Legendary base ATK 33, Lv5 = 58 → Ancient enemies HP 180, ATK 35
 */
export const STRATA_BY_RARITY: Record<Rarity, StrataConfig> = {
  normal: { strata: [
    { gridWidth: 4, gridHeight: 4, enemyHp: 40, enemyAtk: 8, enemyCountBonus: 0, bossHp: 160, bossAtk: 16, expMultiplier: 1.0, theme: 'itemworld' },
    { gridWidth: 4, gridHeight: 4, enemyHp: 50, enemyAtk: 10, enemyCountBonus: 1, bossHp: 200, bossAtk: 20, expMultiplier: 1.5, theme: 'itemworld' },
  ]},
  magic: { strata: [
    { gridWidth: 4, gridHeight: 4, enemyHp: 60, enemyAtk: 12, enemyCountBonus: 0, bossHp: 240, bossAtk: 24, expMultiplier: 1.0, theme: 'itemworld' },
    { gridWidth: 4, gridHeight: 4, enemyHp: 75, enemyAtk: 15, enemyCountBonus: 1, bossHp: 300, bossAtk: 30, expMultiplier: 1.5, theme: 'itemworld' },
    { gridWidth: 4, gridHeight: 4, enemyHp: 90, enemyAtk: 18, enemyCountBonus: 1, bossHp: 360, bossAtk: 36, expMultiplier: 2.0, theme: 'itemworld' },
  ]},
  rare: { strata: [
    { gridWidth: 4, gridHeight: 4, enemyHp: 90, enemyAtk: 18, enemyCountBonus: 0, bossHp: 360, bossAtk: 36, expMultiplier: 1.0, theme: 'itemworld' },
    { gridWidth: 4, gridHeight: 4, enemyHp: 110, enemyAtk: 22, enemyCountBonus: 1, bossHp: 440, bossAtk: 44, expMultiplier: 1.5, theme: 'itemworld' },
    { gridWidth: 4, gridHeight: 4, enemyHp: 130, enemyAtk: 25, enemyCountBonus: 2, bossHp: 520, bossAtk: 50, expMultiplier: 2.5, theme: 'itemworld' },
  ]},
  legendary: { strata: [
    { gridWidth: 4, gridHeight: 4, enemyHp: 130, enemyAtk: 25, enemyCountBonus: 0, bossHp: 520, bossAtk: 50, expMultiplier: 1.0, theme: 'itemworld' },
    { gridWidth: 4, gridHeight: 4, enemyHp: 155, enemyAtk: 30, enemyCountBonus: 1, bossHp: 620, bossAtk: 60, expMultiplier: 1.5, theme: 'itemworld' },
    { gridWidth: 4, gridHeight: 4, enemyHp: 180, enemyAtk: 35, enemyCountBonus: 2, bossHp: 720, bossAtk: 70, expMultiplier: 2.5, theme: 'itemworld' },
    { gridWidth: 4, gridHeight: 4, enemyHp: 220, enemyAtk: 42, enemyCountBonus: 3, bossHp: 880, bossAtk: 84, expMultiplier: 3.5, theme: 'itemworld' },
  ]},
  ancient: { strata: [
    { gridWidth: 4, gridHeight: 4, enemyHp: 180, enemyAtk: 35, enemyCountBonus: 0, bossHp: 720, bossAtk: 70, expMultiplier: 1.0, theme: 'itemworld' },
    { gridWidth: 4, gridHeight: 4, enemyHp: 220, enemyAtk: 42, enemyCountBonus: 1, bossHp: 880, bossAtk: 84, expMultiplier: 1.5, theme: 'itemworld' },
    { gridWidth: 4, gridHeight: 4, enemyHp: 270, enemyAtk: 50, enemyCountBonus: 2, bossHp: 1080, bossAtk: 100, expMultiplier: 2.5, theme: 'itemworld' },
    { gridWidth: 4, gridHeight: 4, enemyHp: 330, enemyAtk: 60, enemyCountBonus: 3, bossHp: 1320, bossAtk: 120, expMultiplier: 3.5, theme: 'itemworld' },
    // Phase 2: Abyss stratum
  ]},
};
