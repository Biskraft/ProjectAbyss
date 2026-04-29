/**
 * itemWorldDistricts.ts — A안: District presentation layer over RoomGraph.
 *
 * RoomGraph(DEC-037 ant colony) 의 토폴로지는 그대로 두고, 노드를 "방"이 아닌
 * "마을의 구역(District)"으로 읽히게 하는 표현 매퍼.
 *
 *   role=hub    → Plaza (광장)        — 무기 기억의 종소리 우물
 *   role=spoke  → Lane (거리/골목)    — branchIndex × dominant temperament 로 5색 기질 매핑
 *   role=boss   → Inner Sanctum       — 마을 끝의 봉인 사당
 *   role=shrine → Old Well / Memorial — 광장 인접 옛 우물
 *
 * 5색 기질(DEC-036): forge / iron / rust / spark / shadow.
 * 무기의 dominant temperament 가 알려진 경우 branchIndex=0 가 dominant 가 되고
 * 나머지 가지는 사이클로 회전한다. dominant 가 없으면 forge 부터 차례로.
 *
 * 본 모듈은 순수 데이터/함수만 노출. 부수효과 없음. SSoT 는 본 파일.
 */

import type { RoomNode } from '@level/RoomGraph';
import type { Temperament } from './memoryShards';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface District {
  /** Full display name (e.g. "Forge Quarter"). */
  name: string;
  /** Short tag for tight HUD chips (e.g. "Forge"). */
  short: string;
  /** UI hex color — 5-color temperament palette for spokes, role color otherwise. */
  color: number;
  /** One-line flavor for tooltips / lore overlays. */
  flavor: string;
}

// ---------------------------------------------------------------------------
// Static district definitions (role-based)
// ---------------------------------------------------------------------------

const PLAZA: District = {
  name: 'Plaza',
  short: 'Plaza',
  color: 0xff8000,
  flavor: 'The bell-well at the heart of this memory.',
};

const SANCTUM: District = {
  name: 'Inner Sanctum',
  short: 'Sanctum',
  color: 0xff4444,
  flavor: 'Where the keeper of this memory still stands watch.',
};

const MEMORIAL: District = {
  name: 'Old Well',
  short: 'Memorial',
  color: 0x88ff88,
  flavor: 'A quiet alcove off the plaza.',
};

// ---------------------------------------------------------------------------
// Branch theme by 5-color temperament (DEC-036)
// ---------------------------------------------------------------------------

const BRANCH_BY_TEMPERAMENT: Record<Temperament, District> = {
  forge:  { name: 'Forge Quarter', short: 'Forge',  color: 0xff8a3c, flavor: 'Anvils ring through the ash.' },
  iron:   { name: 'Iron Lane',     short: 'Iron',   color: 0x4cd6c1, flavor: 'Stone footings held against time.' },
  rust:   { name: 'Rust Alley',    short: 'Rust',   color: 0x8a8a8a, flavor: 'A street the rain forgot.' },
  spark:  { name: 'Spark Court',   short: 'Spark',  color: 0xfff5b0, flavor: 'Embers loose in the air.' },
  shadow: { name: 'Shadow Den',    short: 'Shadow', color: 0x6b3a8a, flavor: 'Lanterns pulled low.' },
};

/** Cycle order for resolving any branchIndex deterministically. */
const TEMPERAMENT_CYCLE: Temperament[] = ['forge', 'iron', 'rust', 'spark', 'shadow'];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolve which temperament colors a given branch.
 * If `dominant` is provided, branchIndex 0 = dominant; subsequent branches
 * cycle through the 5-color wheel starting from dominant+1.
 * If `dominant` is undefined, branches start at 'forge' and cycle.
 */
export function temperamentForBranch(branchIndex: number, dominant?: Temperament): Temperament {
  const len = TEMPERAMENT_CYCLE.length;
  const start = dominant ? TEMPERAMENT_CYCLE.indexOf(dominant) : 0;
  if (branchIndex < 0) return TEMPERAMENT_CYCLE[start === -1 ? 0 : start];
  const base = start === -1 ? 0 : start;
  const idx = ((base + branchIndex) % len + len) % len;
  return TEMPERAMENT_CYCLE[idx];
}

/**
 * Map a RoomGraph node to its District. Pure function — caller supplies the
 * weapon's dominant temperament when known (else the cycle starts at forge).
 */
export function districtForNode(node: RoomNode, dominant?: Temperament): District {
  switch (node.role) {
    case 'hub':    return PLAZA;
    case 'boss':   return SANCTUM;
    case 'shrine': return MEMORIAL;
    case 'spoke':  return BRANCH_BY_TEMPERAMENT[temperamentForBranch(node.branchIndex, dominant)];
  }
}

/**
 * Compact label for HUD/debug rendering. Spokes append depth so adjacent rooms
 * in the same lane stay distinguishable ("Forge 1", "Forge 2", ...).
 */
export function districtLabel(node: RoomNode, dominant?: Temperament): string {
  const d = districtForNode(node, dominant);
  if (node.role === 'spoke') return `${d.short} ${node.depth}`;
  return d.short;
}

/** All five branch theme entries — for legends and palette previews. */
export function allBranchThemes(): ReadonlyArray<{ temperament: Temperament; district: District }> {
  return TEMPERAMENT_CYCLE.map(t => ({ temperament: t, district: BRANCH_BY_TEMPERAMENT[t] }));
}
