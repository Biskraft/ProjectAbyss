/**
 * StrataConfig.ts — Item World stratum multipliers loaded from CSV at build time.
 *
 * SSoT: Sheets/Content_StrataConfig.csv
 * CSV columns: Rarity,Stratum,HpMul,AtkMul,EnemyCountBonus,BossHpMul,BossAtkMul,ExpMultiplier
 *
 * Grid size (4×4) and theme ('itemworld') are fixed per-stratum. Only the
 * multiplier values are CSV-driven so designers can tune difficulty without
 * touching code.
 */

import csvText from '../../../Sheets/Content_StrataConfig.csv?raw';
import type { Rarity } from '@data/weapons';
import type { TilemapTheme } from '@level/TilemapRenderer';

export interface StratumDef {
  gridWidth: number;
  gridHeight: number;
  hpMul: number;
  atkMul: number;
  enemyCountBonus: number;
  bossHpMul: number;
  bossAtkMul: number;
  expMultiplier: number;
  theme: TilemapTheme;
}

export interface StrataConfig {
  strata: StratumDef[];
}

// Parse CSV into STRATA_BY_RARITY
const _build: Record<string, StratumDef[]> = {};

const lines = csvText.trim().split('\n');
for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split(',');
  if (cols.length < 8) continue;
  const rarity = cols[0].trim().toLowerCase();
  if (!_build[rarity]) _build[rarity] = [];
  _build[rarity].push({
    gridWidth: 4,
    gridHeight: 4,
    hpMul: parseFloat(cols[2]),
    atkMul: parseFloat(cols[3]),
    enemyCountBonus: parseInt(cols[4]),
    bossHpMul: parseFloat(cols[5]),
    bossAtkMul: parseFloat(cols[6]),
    expMultiplier: parseFloat(cols[7]),
    theme: 'itemworld',
  });
}

export const STRATA_BY_RARITY: Record<Rarity, StrataConfig> = {
  normal:    { strata: _build['normal'] ?? [] },
  magic:     { strata: _build['magic'] ?? [] },
  rare:      { strata: _build['rare'] ?? [] },
  legendary: { strata: _build['legendary'] ?? [] },
  ancient:   { strata: _build['ancient'] ?? [] },
};
