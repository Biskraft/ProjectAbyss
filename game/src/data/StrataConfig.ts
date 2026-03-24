import type { Rarity } from '@data/weapons';
import type { TilemapTheme } from '@level/TilemapRenderer';

export interface StratumDef {
  gridWidth: number;
  gridHeight: number;
  enemyHpScale: number;
  enemyAtkScale: number;
  enemyCountBonus: number;
  bossHpScale: number;
  bossAtkScale: number;
  expMultiplier: number;
  theme: TilemapTheme;
}

export interface StrataConfig {
  strata: StratumDef[];
}

export const STRATA_BY_RARITY: Record<Rarity, StrataConfig> = {
  normal: { strata: [
    { gridWidth: 3, gridHeight: 3, enemyHpScale: 1.0, enemyAtkScale: 1.0, enemyCountBonus: 0, bossHpScale: 4, bossAtkScale: 2, expMultiplier: 1.0, theme: 'itemworld' },
    { gridWidth: 4, gridHeight: 4, enemyHpScale: 1.5, enemyAtkScale: 1.3, enemyCountBonus: 1, bossHpScale: 6, bossAtkScale: 2.5, expMultiplier: 1.5, theme: 'itemworld' },
  ]},
  magic: { strata: [
    { gridWidth: 3, gridHeight: 3, enemyHpScale: 1.0, enemyAtkScale: 1.0, enemyCountBonus: 0, bossHpScale: 4, bossAtkScale: 2, expMultiplier: 1.0, theme: 'itemworld' },
    { gridWidth: 4, gridHeight: 4, enemyHpScale: 1.6, enemyAtkScale: 1.4, enemyCountBonus: 1, bossHpScale: 6, bossAtkScale: 2.5, expMultiplier: 1.5, theme: 'itemworld' },
    { gridWidth: 4, gridHeight: 4, enemyHpScale: 2.2, enemyAtkScale: 1.8, enemyCountBonus: 1, bossHpScale: 8, bossAtkScale: 3, expMultiplier: 2.0, theme: 'itemworld' },
  ]},
  rare: { strata: [
    { gridWidth: 3, gridHeight: 3, enemyHpScale: 1.0, enemyAtkScale: 1.0, enemyCountBonus: 0, bossHpScale: 4, bossAtkScale: 2, expMultiplier: 1.0, theme: 'itemworld' },
    { gridWidth: 4, gridHeight: 4, enemyHpScale: 1.6, enemyAtkScale: 1.4, enemyCountBonus: 1, bossHpScale: 6, bossAtkScale: 2.5, expMultiplier: 1.5, theme: 'itemworld' },
    { gridWidth: 5, gridHeight: 5, enemyHpScale: 2.5, enemyAtkScale: 2.0, enemyCountBonus: 2, bossHpScale: 10, bossAtkScale: 3.5, expMultiplier: 2.5, theme: 'itemworld' },
  ]},
  legendary: { strata: [
    { gridWidth: 3, gridHeight: 3, enemyHpScale: 1.0, enemyAtkScale: 1.0, enemyCountBonus: 0, bossHpScale: 4, bossAtkScale: 2, expMultiplier: 1.0, theme: 'itemworld' },
    { gridWidth: 4, gridHeight: 4, enemyHpScale: 1.6, enemyAtkScale: 1.4, enemyCountBonus: 1, bossHpScale: 6, bossAtkScale: 2.5, expMultiplier: 1.5, theme: 'itemworld' },
    { gridWidth: 5, gridHeight: 5, enemyHpScale: 2.5, enemyAtkScale: 2.0, enemyCountBonus: 2, bossHpScale: 10, bossAtkScale: 3.5, expMultiplier: 2.5, theme: 'itemworld' },
    { gridWidth: 5, gridHeight: 5, enemyHpScale: 3.5, enemyAtkScale: 2.8, enemyCountBonus: 3, bossHpScale: 14, bossAtkScale: 4.5, expMultiplier: 3.5, theme: 'itemworld' },
  ]},
  ancient: { strata: [
    { gridWidth: 3, gridHeight: 3, enemyHpScale: 1.0, enemyAtkScale: 1.0, enemyCountBonus: 0, bossHpScale: 4, bossAtkScale: 2, expMultiplier: 1.0, theme: 'itemworld' },
    { gridWidth: 4, gridHeight: 4, enemyHpScale: 1.6, enemyAtkScale: 1.4, enemyCountBonus: 1, bossHpScale: 6, bossAtkScale: 2.5, expMultiplier: 1.5, theme: 'itemworld' },
    { gridWidth: 5, gridHeight: 5, enemyHpScale: 2.5, enemyAtkScale: 2.0, enemyCountBonus: 2, bossHpScale: 10, bossAtkScale: 3.5, expMultiplier: 2.5, theme: 'itemworld' },
    { gridWidth: 5, gridHeight: 5, enemyHpScale: 3.5, enemyAtkScale: 2.8, enemyCountBonus: 3, bossHpScale: 14, bossAtkScale: 4.5, expMultiplier: 3.5, theme: 'itemworld' },
    // Phase 2: Abyss stratum (infinite, requires Anchor)
  ]},
};
