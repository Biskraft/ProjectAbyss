import type { Rarity } from '@data/weapons';
import type { TilemapTheme } from '@level/TilemapRenderer';

export interface StratumDef {
  gridWidth: number;
  gridHeight: number;
  /** Multiplier applied to enemy HP from CSV (Sheets/Content_Stats_Enemy.csv) */
  hpMul: number;
  /** Multiplier applied to enemy ATK from CSV */
  atkMul: number;
  enemyCountBonus: number;
  /** Multiplier applied to boss HP from CSV */
  bossHpMul: number;
  /** Multiplier applied to boss ATK from CSV */
  bossAtkMul: number;
  expMultiplier: number;
  theme: TilemapTheme;
}

export interface StrataConfig {
  strata: StratumDef[];
}

/**
 * Item World grid size & enemy stats by rarity.
 *
 * Final HP = CSV.hp × hpMul × distScale
 * Final ATK = CSV.atk × atkMul × distScale
 * (cycle scaling is applied automatically via CSV level bump in createEnemyFromType)
 *
 * Every stratum — including normal s1 — has a multiplier above 1.0 so the
 * difficulty curve is always moving. The values are roughly geometric:
 * each stratum steps up ~1.2-1.3× HP / ~1.15-1.25× ATK from the previous.
 * Tune this file to change difficulty globally; tune CSV for per-enemy-type variance.
 */
export const STRATA_BY_RARITY: Record<Rarity, StrataConfig> = {
  normal: { strata: [
    { gridWidth: 4, gridHeight: 4, hpMul: 1.1, atkMul: 1.05, enemyCountBonus: 0, bossHpMul: 1.0, bossAtkMul: 0.9, expMultiplier: 1.0, theme: 'itemworld' },
    { gridWidth: 4, gridHeight: 4, hpMul: 1.4, atkMul: 1.25, enemyCountBonus: 1, bossHpMul: 1.25, bossAtkMul: 1.0, expMultiplier: 1.5, theme: 'itemworld' },
  ]},
  magic: { strata: [
    { gridWidth: 4, gridHeight: 4, hpMul: 1.7, atkMul: 1.4, enemyCountBonus: 0, bossHpMul: 1.4, bossAtkMul: 1.1, expMultiplier: 1.0, theme: 'itemworld' },
    { gridWidth: 4, gridHeight: 4, hpMul: 2.1, atkMul: 1.6, enemyCountBonus: 1, bossHpMul: 1.6, bossAtkMul: 1.2, expMultiplier: 1.5, theme: 'itemworld' },
    { gridWidth: 4, gridHeight: 4, hpMul: 2.6, atkMul: 1.9, enemyCountBonus: 1, bossHpMul: 1.9, bossAtkMul: 1.3, expMultiplier: 2.0, theme: 'itemworld' },
  ]},
  rare: { strata: [
    { gridWidth: 4, gridHeight: 4, hpMul: 2.4, atkMul: 1.8, enemyCountBonus: 0, bossHpMul: 1.75, bossAtkMul: 1.25, expMultiplier: 1.0, theme: 'itemworld' },
    { gridWidth: 4, gridHeight: 4, hpMul: 3.0, atkMul: 2.1, enemyCountBonus: 1, bossHpMul: 2.0, bossAtkMul: 1.4, expMultiplier: 1.5, theme: 'itemworld' },
    { gridWidth: 4, gridHeight: 4, hpMul: 3.7, atkMul: 2.5, enemyCountBonus: 2, bossHpMul: 2.25, bossAtkMul: 1.55, expMultiplier: 2.5, theme: 'itemworld' },
  ]},
  legendary: { strata: [
    { gridWidth: 4, gridHeight: 4, hpMul: 3.5, atkMul: 2.4, enemyCountBonus: 0, bossHpMul: 2.25, bossAtkMul: 1.5, expMultiplier: 1.0, theme: 'itemworld' },
    { gridWidth: 4, gridHeight: 4, hpMul: 4.3, atkMul: 2.8, enemyCountBonus: 1, bossHpMul: 2.6, bossAtkMul: 1.65, expMultiplier: 1.5, theme: 'itemworld' },
    { gridWidth: 4, gridHeight: 4, hpMul: 5.2, atkMul: 3.2, enemyCountBonus: 2, bossHpMul: 3.0, bossAtkMul: 1.8, expMultiplier: 2.5, theme: 'itemworld' },
    { gridWidth: 4, gridHeight: 4, hpMul: 6.3, atkMul: 3.7, enemyCountBonus: 3, bossHpMul: 3.4, bossAtkMul: 2.0, expMultiplier: 3.5, theme: 'itemworld' },
  ]},
  ancient: { strata: [
    { gridWidth: 4, gridHeight: 4, hpMul: 4.9, atkMul: 3.3, enemyCountBonus: 0, bossHpMul: 3.0, bossAtkMul: 1.9, expMultiplier: 1.0, theme: 'itemworld' },
    { gridWidth: 4, gridHeight: 4, hpMul: 5.9, atkMul: 3.8, enemyCountBonus: 1, bossHpMul: 3.4, bossAtkMul: 2.1, expMultiplier: 1.5, theme: 'itemworld' },
    { gridWidth: 4, gridHeight: 4, hpMul: 7.2, atkMul: 4.4, enemyCountBonus: 2, bossHpMul: 3.75, bossAtkMul: 2.3, expMultiplier: 2.5, theme: 'itemworld' },
    { gridWidth: 4, gridHeight: 4, hpMul: 8.7, atkMul: 5.1, enemyCountBonus: 3, bossHpMul: 4.25, bossAtkMul: 2.5, expMultiplier: 3.5, theme: 'itemworld' },
    // Phase 2: Abyss stratum (infinite, requires Anchor)
  ]},
};
