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
 * Item World grid size & enemy stats by rarity.
 *
 * Grid size scales with rarity (2026-04-10 rebalance):
 *   Normal    2×2 × 1지층 =  4방
 *   Magic     2×2 × 2지층 =  8방  (+4)
 *   Rare      2×3 × 2지층 = 12방  (+4)
 *   Legendary 3×3 × 2지층 = 18방  (+6)
 *   Ancient   3×3 × 3지층 = 27방  (+9)
 */
export const STRATA_BY_RARITY: Record<Rarity, StrataConfig> = {
  normal: { strata: [
    { gridWidth: 2, gridHeight: 2, enemyHp: 40, enemyAtk: 8, enemyCountBonus: 0, bossHp: 160, bossAtk: 16, expMultiplier: 1.0, theme: 'itemworld' },
  ]},
  magic: { strata: [
    { gridWidth: 2, gridHeight: 2, enemyHp: 60, enemyAtk: 12, enemyCountBonus: 0, bossHp: 240, bossAtk: 24, expMultiplier: 1.0, theme: 'itemworld' },
    { gridWidth: 2, gridHeight: 2, enemyHp: 75, enemyAtk: 15, enemyCountBonus: 1, bossHp: 300, bossAtk: 30, expMultiplier: 1.5, theme: 'itemworld' },
  ]},
  rare: { strata: [
    { gridWidth: 2, gridHeight: 3, enemyHp: 90, enemyAtk: 18, enemyCountBonus: 0, bossHp: 360, bossAtk: 36, expMultiplier: 1.0, theme: 'itemworld' },
    { gridWidth: 2, gridHeight: 3, enemyHp: 110, enemyAtk: 22, enemyCountBonus: 1, bossHp: 440, bossAtk: 44, expMultiplier: 1.5, theme: 'itemworld' },
  ]},
  legendary: { strata: [
    { gridWidth: 3, gridHeight: 3, enemyHp: 130, enemyAtk: 25, enemyCountBonus: 0, bossHp: 520, bossAtk: 50, expMultiplier: 1.0, theme: 'itemworld' },
    { gridWidth: 3, gridHeight: 3, enemyHp: 155, enemyAtk: 30, enemyCountBonus: 1, bossHp: 620, bossAtk: 60, expMultiplier: 1.5, theme: 'itemworld' },
  ]},
  ancient: { strata: [
    { gridWidth: 3, gridHeight: 3, enemyHp: 180, enemyAtk: 35, enemyCountBonus: 0, bossHp: 720, bossAtk: 70, expMultiplier: 1.0, theme: 'itemworld' },
    { gridWidth: 3, gridHeight: 3, enemyHp: 220, enemyAtk: 42, enemyCountBonus: 1, bossHp: 880, bossAtk: 84, expMultiplier: 1.5, theme: 'itemworld' },
    { gridWidth: 3, gridHeight: 3, enemyHp: 270, enemyAtk: 50, enemyCountBonus: 2, bossHp: 1080, bossAtk: 100, expMultiplier: 2.5, theme: 'itemworld' },
  ]},
};
