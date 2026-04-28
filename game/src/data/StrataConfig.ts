/**
 * StrataConfig.ts — Item World stratum multipliers loaded from CSV at build time.
 *
 * SSoT: Sheets/Content_StrataConfig.csv
 * CSV columns:
 *   Rarity, Stratum,
 *   HpMul, AtkMul, EnemyCountBonus, BossHpMul, BossAtkMul, ExpMultiplier,
 *   NodeCount, BranchCount, HubCount, BossPlacement
 *
 * DEC-037: 4×4 Grid 토폴로지에서 방사형 Room Graph 토폴로지로 전환.
 * - 그리드 크기 SSoT 는 UnifiedGridData.strataOffsets[].width/height 단일.
 *   StratumDef 에는 더 이상 gridWidth/gridHeight 가 없다.
 * - hubCount=2 는 Ancient 다중 허브, 그 외 1.
 * - bossPlacement: hub_adjacent (Normal) | branch_end (Magic~Legendary) | multi_hub (Ancient)
 */

import csvText from '../../../Sheets/Content_StrataConfig.csv?raw';
import type { Rarity } from '@data/weapons';
import type { TilemapTheme } from '@level/TilemapRenderer';

export type BossPlacement = 'hub_adjacent' | 'branch_end' | 'multi_hub';

export interface StratumDef {
  // --- DEC-037 graph topology ---
  nodeCount: number;
  branchCount: number;
  hubCount: number;
  bossPlacement: BossPlacement;

  // --- Difficulty scaling ---
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

function parseBossPlacement(s: string): BossPlacement {
  const v = s.trim().toLowerCase();
  if (v === 'hub_adjacent' || v === 'branch_end' || v === 'multi_hub') return v;
  throw new Error(`Content_StrataConfig.csv: unknown BossPlacement "${s}"`);
}

const _build: Record<string, StratumDef[]> = {};
const lines = csvText.trim().split(/\r?\n/);
for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split(',');
  if (cols.length < 12) continue;
  const rarity = cols[0].trim().toLowerCase() as Rarity;
  if (!_build[rarity]) _build[rarity] = [];
  _build[rarity].push({
    hpMul: parseFloat(cols[2]),
    atkMul: parseFloat(cols[3]),
    enemyCountBonus: parseInt(cols[4]),
    bossHpMul: parseFloat(cols[5]),
    bossAtkMul: parseFloat(cols[6]),
    expMultiplier: parseFloat(cols[7]),
    nodeCount: parseInt(cols[8]),
    branchCount: parseInt(cols[9]),
    hubCount: parseInt(cols[10]),
    bossPlacement: parseBossPlacement(cols[11]),
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
