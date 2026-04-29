/**
 * StrataConfig.ts — Item World stratum multipliers loaded from CSV at build time.
 *
 * SSoT: Sheets/Content_StrataConfig.csv
 * CSV columns:
 *   Rarity, Stratum,
 *   HpMul, AtkMul, EnemyCountBonus, BossHpMul, BossAtkMul, ExpMultiplier,
 *   NodeCount, BranchCount, HubCount, BossPlacement, Topology
 *
 * DEC-037: 4×4 Grid 토폴로지에서 방사형 Room Graph 토폴로지로 전환.
 * - 그리드 크기 SSoT 는 UnifiedGridData.strataOffsets[].width/height 단일.
 *   StratumDef 에는 더 이상 gridWidth/gridHeight 가 없다.
 * - hubCount=2 는 Ancient 다중 허브, 그 외 1.
 * - bossPlacement: branch_end (Normal~Legendary) | multi_hub (Ancient)
 *   ※ hub_adjacent 은 보스 가지 최소 length=2 강제 도입으로 의미를 잃어 폐기됨.
 *
 * Topology variety (Phase 1 foundation, 무기별 매핑은 Phase 4):
 * - 기본값: 단일 hub = hub_spoke, ancient = multi_hub (= 현재 구현 동작 유지).
 * - Tier 1/2 신규 토폴로지(linear_xxx, y_fork, ...)는 Phase 2/3 에서 빌더 추가.
 * - 무기별 override 는 WeaponDef.topologyOverride 가 우선.
 */

import csvText from '../../../Sheets/Content_StrataConfig.csv?raw';
import type { Rarity } from '@data/weapons';
import type { TilemapTheme } from '@level/TilemapRenderer';

export type BossPlacement = 'branch_end' | 'multi_hub';

/**
 * Room graph topology kinds.
 *
 * Tier 0 (구현 완료, Phase 1):
 *   hub_spoke  — 단일 허브 + 방사형 spoke 가지 (기본값)
 *   multi_hub  — 2 허브 + multi_hub 엣지 (Ancient)
 *
 * Tier 1 (Phase 2 예정):
 *   linear_right  — 좌→우 일자형 (수직형 linear_down/up 은 횡스크롤 경험 저하로 폐기)
 *
 * Tier 2 (Phase 3 예정):
 *   y_fork        — 분기 1회의 Y 형
 *   t_junction    — 직선 + 직각 분기
 *   layer_cake    — 층 단위로 좌우가 갈리는 케이크형
 *   ring          — 환형 (시작=끝 인접)
 *   spine_pockets — 척추 라인 + 측면 포켓
 *
 * Tier C cycle (Phase A, Joris Dormans Unexplored 모델):
 *   two_arc_pocketed — hub→boss 사이 평행한 두 arc + 각 arc 노드에 측면 알코브 pocket. 폐곡선 1개 + 분기 고밀도.
 */
export type TopologyKind =
  | 'hub_spoke'
  | 'multi_hub'
  | 'linear_right'
  | 'y_fork'
  | 't_junction'
  | 'layer_cake'
  | 'ring'
  | 'spine_pockets'
  | 'two_arc_pocketed';

export const TOPOLOGY_VALUES: ReadonlySet<TopologyKind> = new Set<TopologyKind>([
  'hub_spoke', 'multi_hub',
  'linear_right',
  'y_fork', 't_junction', 'layer_cake', 'ring', 'spine_pockets',
  'two_arc_pocketed',
]);

export interface StratumDef {
  // --- DEC-037 graph topology ---
  nodeCount: number;
  branchCount: number;
  hubCount: number;
  bossPlacement: BossPlacement;
  /** Phase 1: 토폴로지 종류. 기본 = hub_spoke (단일 hub) / multi_hub (Ancient). */
  topology: TopologyKind;

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
  if (v === 'branch_end' || v === 'multi_hub') return v;
  throw new Error(`Content_StrataConfig.csv: unknown BossPlacement "${s}"`);
}

function parseTopology(s: string): TopologyKind {
  const v = s.trim().toLowerCase() as TopologyKind;
  if (TOPOLOGY_VALUES.has(v)) return v;
  throw new Error(`Content_StrataConfig.csv: unknown Topology "${s}"`);
}

const _build: Record<string, StratumDef[]> = {};
const lines = csvText.trim().split(/\r?\n/);
for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split(',');
  if (cols.length < 13) continue;
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
    topology: parseTopology(cols[12]),
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
