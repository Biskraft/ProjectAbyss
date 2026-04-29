/**
 * RoomGraph.ts — DEC-037 방사형 개미굴 (Hub-and-Spoke) 절차 생성.
 *
 * 4×4 그리드 (RoomGrid) 와 병행 존재. 토폴로지 분기 플래그가 도입되기 전까지
 * 본 모듈은 import 되지 않으며, 단독으로 컴파일/검증 가능하도록 self-contained.
 *
 * 규칙 (Documents/System/System_ItemWorld_FloorGen.md §3.2):
 *   IWF-R10  노드/가지 수는 StratumDef.nodeCount/branchCount 로 결정
 *   IWF-R11  hub → 모든 노드 도달 보장 (트리 직접 생성으로 본질적으로 MST)
 *   IWF-R14  hub 가 시작 노드
 *   IWF-R15  가지 끝 = 보스/보물/막다른 길
 *   IWF-R16  hub-hub 직결 금지 (Ancient multi_hub 제외)
 *   IWF-R17  보스는 spoke 승격이 아닌 별도 노드(role='boss')
 *   IWF-R18  Shrine = 별도 노드(role='shrine'), 결정적 1개 배치
 *   IWF-R19  Ancient hubCount=2 고정, 두 hub 는 angular π 정반대
 *
 * Critical Path (IWF-R30 후속) = hub + 보스 가지의 spoke 사슬.
 */

import { PRNG } from '@utils/PRNG';
import type { StratumDef, BossPlacement, TopologyKind } from '@data/StrataConfig';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NodeRole = 'hub' | 'spoke' | 'boss' | 'shrine';
export type ExitSide = 'left' | 'right' | 'up' | 'down';

export interface RoomNode {
  id: string;
  role: NodeRole;
  /** hub: 0..hubCount-1, spoke/boss/shrine: 소속 hub 인덱스 */
  hubIndex: number;
  /** hub: -1, 가지 소속이 아닌 shrine(hub-인접): -1, 그 외 0..branchCount-1 */
  branchIndex: number;
  /** hub: 0, spoke 사슬 진행도 1.. */
  depth: number;
  stratumIndex: number;
  layout: { angleRad: number; ring: number; x: number; y: number };
  tags: string[];
  visited: boolean;
  cleared: boolean;
  bossPortalX?: number;
  bossPortalY?: number;
}

export interface RoomEdge {
  a: string;
  b: string;
  /**
   * 'tree'         — hub→spoke 사슬 (DAG)
   * 'multi_hub'    — Ancient hub-hub 한정 (IWF-R16)
   * 'ring_closure' — Ring 토폴로지 폐곡선 닫는 엣지. 그리드 임베더 BFS 에는
   *                  참여하지 않고 (포지션 결정 X), exit 도출에만 참여한다.
   */
  kind: 'tree' | 'multi_hub' | 'ring_closure';
  sideA: ExitSide;
  sideB: ExitSide;
}

export interface RoomGraphData {
  stratumIndex: number;
  hubIds: string[];
  /** 보스 가지의 branchIndex (single hub 기준). multi_hub 는 가장 긴 가지. */
  bossBranchIndex: number;
  bossId: string;
  shrineId: string | null;
  /** Critical path 노드 id 집합 — IWF-R30 적격 (hub + 보스 가지 spoke). */
  criticalPathIds: Set<string>;
  nodes: Map<string, RoomNode>;
  edges: RoomEdge[];
}

// ---------------------------------------------------------------------------
// Layout constants (one ring = 한 노드 폭, 픽셀 단위는 렌더 단계에서 곱)
// ---------------------------------------------------------------------------

const RING_UNIT = 1; // 추후 IW_ROOM_W_PX + GUTTER 로 곱해 픽셀 좌표화

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * RoomGraph 진입점 — topology dispatch.
 *
 * Phase 1: hub_spoke / multi_hub 만 구현. 나머지(Tier 1/2)는 Phase 2/3 빌더
 * 추가 시 case 를 채운다.
 *
 * @param def      StratumDef (CSV → StrataConfig.ts 로 로드)
 * @param itemUid  결정적 시드용 아이템 식별자
 * @param stratumIndex 0-based
 * @param topologyOverride 무기별 강제 토폴로지 (지정 시 def.topology 무시)
 */
export function generateRoomGraph(
  def: StratumDef,
  itemUid: number,
  stratumIndex: number,
  topologyOverride?: TopologyKind,
): RoomGraphData {
  const topology = topologyOverride ?? def.topology;
  switch (topology) {
    case 'hub_spoke':
    case 'multi_hub':
      return buildHubSpoke(def, itemUid, stratumIndex);
    case 'linear_right':
      return buildLinear(def, itemUid, stratumIndex, 0);
    case 'y_fork':
      return buildYFork(def, itemUid, stratumIndex);
    case 't_junction':
      return buildTJunction(def, itemUid, stratumIndex);
    case 'layer_cake':
      return buildLayerCake(def, itemUid, stratumIndex);
    case 'ring':
      return buildRing(def, itemUid, stratumIndex);
    case 'spine_pockets':
      return buildSpinePockets(def, itemUid, stratumIndex);
    case 'two_arc_pocketed':
      return buildTwoArcPocketed(def, itemUid, stratumIndex);
    default: {
      // exhaustiveness guard
      const _exhaustive: never = topology;
      throw new Error(`RoomGraph: unknown topology "${_exhaustive}"`);
    }
  }
}

/**
 * Hub-and-spoke 빌더 (Tier 0). 단일 hub + 방사형 spoke 가지 또는
 * Ancient 의 multi_hub (2 허브 + multi_hub 엣지) 구현.
 */
function buildHubSpoke(
  def: StratumDef,
  itemUid: number,
  stratumIndex: number,
): RoomGraphData {
  const rng = new PRNG(itemUid * 1000 + stratumIndex * 7919);

  const nodes = new Map<string, RoomNode>();
  const edges: RoomEdge[] = [];

  // -------------------------------------------------------------------------
  // 1) Hub 노드 생성
  // -------------------------------------------------------------------------
  const hubIds: string[] = [];
  for (let h = 0; h < def.hubCount; h++) {
    const id = `h${h}`;
    hubIds.push(id);
    const angle = def.hubCount === 1 ? 0 : h * Math.PI; // hubCount=2 → π 정반대 (IWF-R19)
    nodes.set(id, makeNode({
      id, role: 'hub', hubIndex: h, branchIndex: -1, depth: 0,
      stratumIndex, angleRad: angle, ring: 0,
      tags: ['hub_plaza', 'safe', 'large'],
    }));
  }

  // hub-hub 엣지 (Ancient multi_hub 한정, IWF-R16 예외)
  if (def.hubCount === 2) {
    edges.push(makeEdge(hubIds[0], hubIds[1], 'multi_hub', 'right', 'left'));
  }

  // -------------------------------------------------------------------------
  // 2) 보스/Shrine 예약 노드 수를 제외하고 spoke 분배
  //    총 노드: hub(hubCount) + spoke(?) + boss(1) + shrine(1)
  // -------------------------------------------------------------------------
  const reservedSpecial = 1 /* boss */ + 1 /* shrine */;
  const spokeBudget = Math.max(0, def.nodeCount - def.hubCount - reservedSpecial);

  // 가지별 spoke 길이 분배 — 지층마다 어떤 가지가 길어질지 셔플 (다양화 A).
  const spokeLenByBranch: number[] = new Array(def.branchCount).fill(0);
  if (def.branchCount > 0) {
    const base = Math.floor(spokeBudget / def.branchCount);
    const leftover = spokeBudget - base * def.branchCount;
    for (let b = 0; b < def.branchCount; b++) spokeLenByBranch[b] = base;
    const order: number[] = [];
    for (let b = 0; b < def.branchCount; b++) order.push(b);
    for (let i = order.length - 1; i > 0; i--) {
      const j = rng.nextInt(0, i);
      [order[i], order[j]] = [order[j], order[i]];
    }
    for (let i = 0; i < leftover; i++) spokeLenByBranch[order[i]] += 1;
  }

  // -------------------------------------------------------------------------
  // 3) 보스 가지 결정
  //    branch_end:   가장 긴 가지를 보스 가지로 (동률은 시드로)
  //    multi_hub:    가장 긴 가지를 보스 가지로 (Ancient)
  // -------------------------------------------------------------------------
  let bossBranchIndex = pickBossBranch(def.bossPlacement, spokeLenByBranch, rng);

  // 보스 가지 최소 length = 2 강제 — chain-length 교번에서 'corridor → boss'
  // 직결(len=1) 패턴을 막아 항상 'corridor → room → boss' 이상의 진입 동선을
  // 보장한다. 부족분은 가장 긴 다른 가지에서 차감.
  if (def.branchCount > 0 && spokeLenByBranch[bossBranchIndex] < 2) {
    let need = 2 - spokeLenByBranch[bossBranchIndex];
    spokeLenByBranch[bossBranchIndex] = 2;
    while (need > 0) {
      let donorIdx = -1;
      for (let b = 0; b < def.branchCount; b++) {
        if (b === bossBranchIndex) continue;
        if (spokeLenByBranch[b] > 1
          && (donorIdx < 0 || spokeLenByBranch[b] > spokeLenByBranch[donorIdx])) {
          donorIdx = b;
        }
      }
      if (donorIdx < 0) break; // 차감할 가지 없음 — 보스 가지는 2 유지(노드 수 증가 허용)
      spokeLenByBranch[donorIdx]--;
      need--;
    }
  }

  // -------------------------------------------------------------------------
  // 4) 가지 노드 생성 (spoke 사슬) — multi-hub aware 분배
  //
  //    다양화 B: 각 hub 의 4개 cardinal 슬롯(E/S/W/N) 중 multi_hub 인접 방향은
  //    제외하고 셔플. 가지를 round-robin 으로 hub 에 분배한다.
  //    - hubCount=1: 가지 0..3 main, 4+ sub-branch (host = b mod 4 의 첫 spoke)
  //    - hubCount=2: hub[0] 은 E 제외(3 슬롯), hub[1] 은 W 제외(3 슬롯). 각 hub
  //      의 가지가 슬롯 초과 시 sub-branch 로 강등.
  // -------------------------------------------------------------------------
  const sourceHubId = hubIds[0];

  // Per-hub cardinal pool (multi_hub 방향 제외 후 셔플)
  const cardinalPoolByHub: number[][] = [];
  for (let h = 0; h < def.hubCount; h++) {
    const pool = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
    if (def.hubCount === 2) {
      const reservedAngle = h === 0 ? 0 : Math.PI; // hub[0]→E, hub[1]→W
      const idx = pool.indexOf(reservedAngle);
      if (idx >= 0) pool.splice(idx, 1);
    }
    for (let i = pool.length - 1; i > 0; i--) {
      const j = rng.nextInt(0, i);
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    cardinalPoolByHub.push(pool);
  }

  // 가지 → hub round-robin
  const branchHub: number[] = new Array(def.branchCount);
  for (let b = 0; b < def.branchCount; b++) {
    branchHub[b] = b % def.hubCount;
  }
  // 같은 hub 내 가지 순서 (main 슬롯 매핑용)
  const branchOrderInHub: number[] = new Array(def.branchCount);
  const seenOnHub: number[] = new Array(def.hubCount).fill(0);
  for (let b = 0; b < def.branchCount; b++) {
    branchOrderInHub[b] = seenOnHub[branchHub[b]]++;
  }

  // 각 가지의 angle 결정 — main 은 풀에서 순서대로, sub 는 hub 첫 main 의 perpendicular
  const branchAngles: number[] = new Array(def.branchCount);
  for (let b = 0; b < def.branchCount; b++) {
    const h = branchHub[b];
    const order = branchOrderInHub[b];
    const pool = cardinalPoolByHub[h];
    if (order < pool.length) {
      branchAngles[b] = pool[order];
    } else {
      // Sub-branch: host = 같은 hub 의 첫 main (order=0)
      let hostB = -1;
      for (let bb = 0; bb < def.branchCount; bb++) {
        if (branchHub[bb] === h && branchOrderInHub[bb] === 0) { hostB = bb; break; }
      }
      const baseAngle = hostB >= 0 ? branchAngles[hostB] : 0;
      const perpSign = rng.next() < 0.5 ? 1 : -1;
      let perp = baseAngle + perpSign * (Math.PI / 2);
      while (perp > Math.PI) perp -= 2 * Math.PI;
      while (perp < -Math.PI) perp += 2 * Math.PI;
      branchAngles[b] = perp;
    }
  }

  // Shrine 후보 슬롯: hub[0] 의 남은 cardinal
  const usedOnHub0 = Math.min(seenOnHub[0], cardinalPoolByHub[0].length);
  const remainingCardinals = cardinalPoolByHub[0].slice(usedOnHub0);

  for (let b = 0; b < def.branchCount; b++) {
    const angle = branchAngles[b];
    const len = spokeLenByBranch[b];
    const h = branchHub[b];
    const order = branchOrderInHub[b];
    const isSub = order >= cardinalPoolByHub[h].length;
    let prevId: string;
    if (!isSub) {
      prevId = hubIds[h];
    } else {
      let host = -1;
      for (let bb = 0; bb < def.branchCount; bb++) {
        if (branchHub[bb] === h && branchOrderInHub[bb] === 0) { host = bb; break; }
      }
      prevId = host >= 0 && nodes.has(`b${host}.1`) ? `b${host}.1` : hubIds[h];
    }
    for (let d = 1; d <= len; d++) {
      const id = `b${b}.${d}`;
      // Chain-length variable pattern: 광장(hub) → 통로 → 방 → 통로 → ...
      //   - 홀수 depth = corridor, 짝수 depth = room (단순 교번)
      //   - 보스 가지 마지막 spoke 강제 규칙은 제거됨 — 짝수 길이일 때
      //     corridor 가 2회 연속되는 버그를 유발했음.
      const kind: 'corridor' | 'room' = (d % 2 === 1) ? 'corridor' : 'room';
      const tags: string[] = [kind];
      if (isSub && d === 1) tags.push('sub_root');
      const node = makeNode({
        id, role: 'spoke', hubIndex: h, branchIndex: b, depth: d,
        stratumIndex, angleRad: angle, ring: d * RING_UNIT,
        tags,
      });
      nodes.set(id, node);
      const sides = sidesByAngle(angle);
      edges.push(makeEdge(prevId, id, 'tree', sides.outFromHub, sides.inToSpoke));
      prevId = id;
    }
  }

  // -------------------------------------------------------------------------
  // 5) 보스 노드 (별도 노드, IWF-R17). 보스 가지 끝에 부착.
  // -------------------------------------------------------------------------
  const bossHub = branchHub[bossBranchIndex] ?? 0;
  const bossPrevId = lastNodeIdOfBranch(nodes, bossBranchIndex) ?? hubIds[bossHub];
  const bossDepth = (nodes.get(bossPrevId)?.depth ?? 0) + 1;
  const bossAngle = branchAngles[bossBranchIndex] ?? (bossBranchIndex / def.branchCount) * 2 * Math.PI;
  const bossId = `boss${bossBranchIndex}`;
  nodes.set(bossId, makeNode({
    id: bossId, role: 'boss', hubIndex: bossHub, branchIndex: bossBranchIndex, depth: bossDepth,
    stratumIndex, angleRad: bossAngle, ring: bossDepth * RING_UNIT,
    tags: ['boss_chamber'],
  }));
  const bossSides = sidesByAngle(bossAngle);
  edges.push(makeEdge(bossPrevId, bossId, 'tree', bossSides.outFromHub, bossSides.inToSpoke));

  // -------------------------------------------------------------------------
  // 6) Shrine 노드 (별도 노드, IWF-R18). hub-인접 사이드 포켓.
  //    hub 와 보스 가지 첫 spoke 사이 동선에서 살짝 비켜서 부착한다.
  // -------------------------------------------------------------------------
  const shrineId = makeShrineId();
  // Shrine 부착 우선순위:
  //   1) hub[0] 의 남은 cardinal (single-hub 일반 케이스)
  //   2) hubCount=2 이고 hub[0] 풀이 가득이면 hub[1] 의 남은 cardinal
  //   3) 양쪽 hub 모두 가득이면 보스 가지 첫 spoke 의 perpendicular alcove
  //   4) 위 모두 실패 시 보스 옆 fallback (그리드 임베딩에서 누락 가능)
  let shrineParentId = sourceHubId;
  let shrineHubIndex = 0;
  let shrineAngle: number;
  if (remainingCardinals.length > 0) {
    shrineAngle = remainingCardinals[rng.nextInt(0, remainingCardinals.length - 1)];
  } else if (def.hubCount === 2) {
    const usedOnHub1 = Math.min(seenOnHub[1], cardinalPoolByHub[1].length);
    const remainingHub1 = cardinalPoolByHub[1].slice(usedOnHub1);
    if (remainingHub1.length > 0) {
      shrineHubIndex = 1;
      shrineParentId = hubIds[1];
      shrineAngle = remainingHub1[rng.nextInt(0, remainingHub1.length - 1)];
    } else if (nodes.has(`b${bossBranchIndex}.1`)) {
      shrineParentId = `b${bossBranchIndex}.1`;
      shrineHubIndex = bossHub;
      const perpSign = rng.next() < 0.5 ? 1 : -1;
      let perp = bossAngle + perpSign * (Math.PI / 2);
      while (perp > Math.PI) perp -= 2 * Math.PI;
      while (perp < -Math.PI) perp += 2 * Math.PI;
      shrineAngle = perp;
    } else {
      shrineAngle = bossAngle + Math.PI / 12;
    }
  } else {
    shrineAngle = bossAngle + Math.PI / 12;
  }
  nodes.set(shrineId, makeNode({
    id: shrineId, role: 'shrine', hubIndex: shrineHubIndex, branchIndex: -1, depth: 1,
    stratumIndex, angleRad: shrineAngle, ring: 0.5,
    tags: ['shrine_alcove', 'safe'],
  }));
  const shrineSides = sidesByAngle(shrineAngle);
  edges.push(makeEdge(shrineParentId, shrineId, 'tree', shrineSides.outFromHub, shrineSides.inToSpoke));

  // -------------------------------------------------------------------------
  // 7) Critical Path 집합 (IWF-R30 후속)
  // -------------------------------------------------------------------------
  const criticalPathIds = new Set<string>();
  criticalPathIds.add(sourceHubId);
  // multi_hub: 보스가 hub[1] 측 가지면 hub[1] 도 CP 포함 (entry → hub[1] → 보스 가지)
  if (bossHub !== 0 && hubIds[bossHub]) criticalPathIds.add(hubIds[bossHub]);
  for (const node of nodes.values()) {
    if (node.role === 'spoke' && node.branchIndex === bossBranchIndex) {
      criticalPathIds.add(node.id);
    }
  }

  // -------------------------------------------------------------------------
  // 8) 픽셀 좌표 산출
  // -------------------------------------------------------------------------
  for (const node of nodes.values()) {
    node.layout.x = Math.cos(node.layout.angleRad) * node.layout.ring;
    node.layout.y = Math.sin(node.layout.angleRad) * node.layout.ring;
  }

  return {
    stratumIndex,
    hubIds,
    bossBranchIndex,
    bossId,
    shrineId,
    criticalPathIds,
    nodes,
    edges,
  };
}

// ---------------------------------------------------------------------------
// Tier 1 — Linear topology builder
// ---------------------------------------------------------------------------

/**
 * Linear 토폴로지 빌더 (Tier 1, Phase 2).
 *
 * 단일 hub → 일자 사슬 → boss. shrine 은 hub 의 perpendicular 슬롯.
 * branchCount/hubCount CSV 값은 무시되고 항상 1/1 로 강제된다 (linear 의 정의).
 *
 *   linear_right  chainAngle =  0          (hub 좌단, boss 우단)
 *   (수직형 linear_down/up 은 횡스크롤 경험 저하로 폐기)
 *
 * 노드 수: hub(1) + chain(nodeCount - 3) + boss(1) + shrine(1) = nodeCount.
 * chain 길이 ≥ 2 보장(보스 가지 min length=2 와 동일 동기). CSV nodeCount ≥ 6
 * 이므로 항상 충족.
 *
 * Critical Path = hub + 모든 chain spoke (boss 가지 = 0).
 */
function buildLinear(
  def: StratumDef,
  itemUid: number,
  stratumIndex: number,
  chainAngle: number,
): RoomGraphData {
  const _rng = new PRNG(itemUid * 1000 + stratumIndex * 7919);
  void _rng; // 시드는 향후 chain 내 변주(통로 vs 방 비율 등)에 사용 예정

  const nodes = new Map<string, RoomNode>();
  const edges: RoomEdge[] = [];

  // Hub
  const hubId = 'h0';
  nodes.set(hubId, makeNode({
    id: hubId, role: 'hub', hubIndex: 0, branchIndex: -1, depth: 0,
    stratumIndex, angleRad: 0, ring: 0,
    tags: ['hub_plaza', 'safe', 'large'],
  }));

  // Chain length (= spoke 수). 최소 2 — corridor → room → boss 진입 동선 보장.
  const chainLen = Math.max(2, def.nodeCount - 3);

  let prevId = hubId;
  for (let d = 1; d <= chainLen; d++) {
    const id = `b0.${d}`;
    // chain-length 교번: 홀수 depth = corridor, 짝수 depth = room.
    const kind: 'corridor' | 'room' = (d % 2 === 1) ? 'corridor' : 'room';
    const tags: string[] = [kind];
    nodes.set(id, makeNode({
      id, role: 'spoke', hubIndex: 0, branchIndex: 0, depth: d,
      stratumIndex, angleRad: chainAngle, ring: d * RING_UNIT,
      tags,
    }));
    const sides = sidesByAngle(chainAngle);
    edges.push(makeEdge(prevId, id, 'tree', sides.outFromHub, sides.inToSpoke));
    prevId = id;
  }

  // Boss at chain end
  const bossDepth = chainLen + 1;
  const bossId = 'boss0';
  nodes.set(bossId, makeNode({
    id: bossId, role: 'boss', hubIndex: 0, branchIndex: 0, depth: bossDepth,
    stratumIndex, angleRad: chainAngle, ring: bossDepth * RING_UNIT,
    tags: ['boss_chamber'],
  }));
  const bossSides = sidesByAngle(chainAngle);
  edges.push(makeEdge(prevId, bossId, 'tree', bossSides.outFromHub, bossSides.inToSpoke));

  // Shrine: hub 의 perpendicular alcove (자리 1슬롯만 사용 — chain 방해 없음)
  let shrineAngle = chainAngle + Math.PI / 2;
  while (shrineAngle > Math.PI) shrineAngle -= 2 * Math.PI;
  while (shrineAngle < -Math.PI) shrineAngle += 2 * Math.PI;
  const shrineId = makeShrineId();
  nodes.set(shrineId, makeNode({
    id: shrineId, role: 'shrine', hubIndex: 0, branchIndex: -1, depth: 1,
    stratumIndex, angleRad: shrineAngle, ring: 0.5,
    tags: ['shrine_alcove', 'safe'],
  }));
  const shrineSides = sidesByAngle(shrineAngle);
  edges.push(makeEdge(hubId, shrineId, 'tree', shrineSides.outFromHub, shrineSides.inToSpoke));

  // Critical path = hub + 모든 chain spoke
  const criticalPathIds = new Set<string>();
  criticalPathIds.add(hubId);
  for (const node of nodes.values()) {
    if (node.role === 'spoke' && node.branchIndex === 0) criticalPathIds.add(node.id);
  }

  // Pixel coords
  for (const node of nodes.values()) {
    node.layout.x = Math.cos(node.layout.angleRad) * node.layout.ring;
    node.layout.y = Math.sin(node.layout.angleRad) * node.layout.ring;
  }

  return {
    stratumIndex,
    hubIds: [hubId],
    bossBranchIndex: 0,
    bossId,
    shrineId,
    criticalPathIds,
    nodes,
    edges,
  };
}

// ---------------------------------------------------------------------------
// Tier 2 — Branching/ring/spine builders (Phase 3)
//
// 공통 패턴:
//   1) hub 생성 → 토폴로지 별 spoke 사슬 → boss → shrine 순서로 추가
//   2) 각 spoke 의 layout.angleRad = "이 노드를 부모로부터 어느 cardinal 에
//      배치할지" 의 힌트. tryGridEmbedRadial 의 BFS 가 이 값을 사용.
//   3) corridor/room 교번: 홀수 depth = corridor, 짝수 = room (chain-length pattern)
//   4) Critical Path = hub + 보스로 이어지는 spoke 사슬
//
// nodeCount 정확성: branching 토폴로지는 분할 산식이 nodeCount-3 의 인수 분해에
// 의존한다. CSV 의 nodeCount 가 작은 경우(Normal 1=6) 산식이 degenerate 해
// shrine/pocket 이 0 이 될 수 있다. 노드 수 불일치는 validateRoomGraph 가
// console.warn 으로 알리며, 게임플레이는 진행 가능.
// ---------------------------------------------------------------------------

/**
 * Y-fork 토폴로지.
 *
 *   hub → stem(1) → fork → boss arm (M spokes) → boss
 *                       ↘ side arm (N spokes) → shrine
 *
 * 자원 분배: M = ceil((nodeCount-4) * 0.6), N = (nodeCount-4) - M.
 * stem 은 항상 1. boss arm M ≥ 1 (boss 도달 전 spoke 1개 이상).
 */
function buildYFork(def: StratumDef, itemUid: number, stratumIndex: number): RoomGraphData {
  const _rng = new PRNG(itemUid * 1000 + stratumIndex * 7919);
  void _rng;
  const nodes = new Map<string, RoomNode>();
  const edges: RoomEdge[] = [];

  const stemAngle = Math.PI / 2;
  const bossArmAngle = 0;
  const sideArmAngle = Math.PI;

  const hubId = 'h0';
  nodes.set(hubId, makeNode({
    id: hubId, role: 'hub', hubIndex: 0, branchIndex: -1, depth: 0,
    stratumIndex, angleRad: 0, ring: 0,
    tags: ['hub_plaza', 'safe', 'large'],
  }));

  const remaining = Math.max(2, def.nodeCount - 4);
  const M = Math.max(1, Math.ceil(remaining * 0.6));
  const N = Math.max(0, remaining - M);

  // Stem (branch 0): single spoke (the fork point)
  const stemId = 'b0.1';
  nodes.set(stemId, makeNode({
    id: stemId, role: 'spoke', hubIndex: 0, branchIndex: 0, depth: 1,
    stratumIndex, angleRad: stemAngle, ring: RING_UNIT,
    tags: ['corridor'],
  }));
  const stemSides = sidesByAngle(stemAngle);
  edges.push(makeEdge(hubId, stemId, 'tree', stemSides.outFromHub, stemSides.inToSpoke));

  // Boss arm (branch 1, boss-bearing)
  let prevId = stemId;
  for (let d = 1; d <= M; d++) {
    const id = `b1.${d}`;
    const kind: 'corridor' | 'room' = (d % 2 === 1) ? 'corridor' : 'room';
    nodes.set(id, makeNode({
      id, role: 'spoke', hubIndex: 0, branchIndex: 1, depth: d + 1,
      stratumIndex, angleRad: bossArmAngle, ring: (d + 1) * RING_UNIT,
      tags: [kind],
    }));
    const sides = sidesByAngle(bossArmAngle);
    edges.push(makeEdge(prevId, id, 'tree', sides.outFromHub, sides.inToSpoke));
    prevId = id;
  }
  const bossId = 'boss1';
  nodes.set(bossId, makeNode({
    id: bossId, role: 'boss', hubIndex: 0, branchIndex: 1, depth: M + 2,
    stratumIndex, angleRad: bossArmAngle, ring: (M + 2) * RING_UNIT,
    tags: ['boss_chamber'],
  }));
  const bossSides = sidesByAngle(bossArmAngle);
  edges.push(makeEdge(prevId, bossId, 'tree', bossSides.outFromHub, bossSides.inToSpoke));

  // Side arm (branch 2)
  prevId = stemId;
  for (let d = 1; d <= N; d++) {
    const id = `b2.${d}`;
    const kind: 'corridor' | 'room' = (d % 2 === 1) ? 'corridor' : 'room';
    nodes.set(id, makeNode({
      id, role: 'spoke', hubIndex: 0, branchIndex: 2, depth: d + 1,
      stratumIndex, angleRad: sideArmAngle, ring: (d + 1) * RING_UNIT,
      tags: [kind],
    }));
    const sides = sidesByAngle(sideArmAngle);
    edges.push(makeEdge(prevId, id, 'tree', sides.outFromHub, sides.inToSpoke));
    prevId = id;
  }

  // Shrine: side arm 끝 (또는 N=0 이면 stem 의 perpendicular alcove)
  const shrineId = makeShrineId();
  let shrineParent: string;
  let shrineAngle: number;
  if (N > 0) {
    shrineParent = `b2.${N}`;
    shrineAngle = sideArmAngle;
  } else {
    shrineParent = stemId;
    shrineAngle = sideArmAngle; // stem 의 서쪽 = (-1, 1) 방향
  }
  nodes.set(shrineId, makeNode({
    id: shrineId, role: 'shrine', hubIndex: 0, branchIndex: -1, depth: N + 2,
    stratumIndex, angleRad: shrineAngle, ring: (N + 2) * RING_UNIT,
    tags: ['shrine_alcove', 'safe'],
  }));
  const shrineSides = sidesByAngle(shrineAngle);
  edges.push(makeEdge(shrineParent, shrineId, 'tree', shrineSides.outFromHub, shrineSides.inToSpoke));

  // Critical path = hub + stem + boss arm
  const criticalPathIds = new Set<string>();
  criticalPathIds.add(hubId);
  criticalPathIds.add(stemId);
  for (const node of nodes.values()) {
    if (node.role === 'spoke' && node.branchIndex === 1) criticalPathIds.add(node.id);
  }

  for (const node of nodes.values()) {
    node.layout.x = Math.cos(node.layout.angleRad) * node.layout.ring;
    node.layout.y = Math.sin(node.layout.angleRad) * node.layout.ring;
  }

  return {
    stratumIndex,
    hubIds: [hubId],
    bossBranchIndex: 1,
    bossId,
    shrineId,
    criticalPathIds,
    nodes,
    edges,
  };
}

/**
 * T-junction 토폴로지.
 *
 *   hub → b0.1 → ... → b0.mid → ... → b0.H → boss
 *                         ↓
 *                       b1.1 → ... → b1.P → shrine
 *
 * H + P = nodeCount - 3. mid = ceil(H/2).
 */
function buildTJunction(def: StratumDef, itemUid: number, stratumIndex: number): RoomGraphData {
  const _rng = new PRNG(itemUid * 1000 + stratumIndex * 7919);
  void _rng;
  const nodes = new Map<string, RoomNode>();
  const edges: RoomEdge[] = [];

  const horizAngle = 0;     // east
  const perpAngle = Math.PI / 2; // south

  const hubId = 'h0';
  nodes.set(hubId, makeNode({
    id: hubId, role: 'hub', hubIndex: 0, branchIndex: -1, depth: 0,
    stratumIndex, angleRad: 0, ring: 0,
    tags: ['hub_plaza', 'safe', 'large'],
  }));

  const total = Math.max(2, def.nodeCount - 3);
  const H = Math.max(2, Math.ceil(total * 2 / 3));
  const P = Math.max(0, total - H);
  const mid = Math.max(1, Math.ceil(H / 2));

  // Horizontal branch 0
  let prevId = hubId;
  for (let d = 1; d <= H; d++) {
    const id = `b0.${d}`;
    const kind: 'corridor' | 'room' = (d % 2 === 1) ? 'corridor' : 'room';
    nodes.set(id, makeNode({
      id, role: 'spoke', hubIndex: 0, branchIndex: 0, depth: d,
      stratumIndex, angleRad: horizAngle, ring: d * RING_UNIT,
      tags: [kind],
    }));
    const sides = sidesByAngle(horizAngle);
    edges.push(makeEdge(prevId, id, 'tree', sides.outFromHub, sides.inToSpoke));
    prevId = id;
  }
  const bossId = 'boss0';
  nodes.set(bossId, makeNode({
    id: bossId, role: 'boss', hubIndex: 0, branchIndex: 0, depth: H + 1,
    stratumIndex, angleRad: horizAngle, ring: (H + 1) * RING_UNIT,
    tags: ['boss_chamber'],
  }));
  const bossSides = sidesByAngle(horizAngle);
  edges.push(makeEdge(prevId, bossId, 'tree', bossSides.outFromHub, bossSides.inToSpoke));

  // Perpendicular branch 1 from b0.mid
  prevId = `b0.${mid}`;
  for (let d = 1; d <= P; d++) {
    const id = `b1.${d}`;
    const kind: 'corridor' | 'room' = (d % 2 === 1) ? 'corridor' : 'room';
    nodes.set(id, makeNode({
      id, role: 'spoke', hubIndex: 0, branchIndex: 1, depth: mid + d,
      stratumIndex, angleRad: perpAngle, ring: (mid + d) * RING_UNIT,
      tags: [kind],
    }));
    const sides = sidesByAngle(perpAngle);
    edges.push(makeEdge(prevId, id, 'tree', sides.outFromHub, sides.inToSpoke));
    prevId = id;
  }

  // Shrine: 끝부분 (P>0 → b1.P 의 남쪽, P=0 → b0.mid 의 남쪽)
  const shrineId = makeShrineId();
  const shrineParent = P > 0 ? `b1.${P}` : `b0.${mid}`;
  nodes.set(shrineId, makeNode({
    id: shrineId, role: 'shrine', hubIndex: 0, branchIndex: -1, depth: mid + P + 1,
    stratumIndex, angleRad: perpAngle, ring: (mid + P + 1) * RING_UNIT,
    tags: ['shrine_alcove', 'safe'],
  }));
  const shrineSides = sidesByAngle(perpAngle);
  edges.push(makeEdge(shrineParent, shrineId, 'tree', shrineSides.outFromHub, shrineSides.inToSpoke));

  // Critical path = hub + 가로 가지(boss arm)
  const criticalPathIds = new Set<string>();
  criticalPathIds.add(hubId);
  for (const node of nodes.values()) {
    if (node.role === 'spoke' && node.branchIndex === 0) criticalPathIds.add(node.id);
  }

  for (const node of nodes.values()) {
    node.layout.x = Math.cos(node.layout.angleRad) * node.layout.ring;
    node.layout.y = Math.sin(node.layout.angleRad) * node.layout.ring;
  }

  return {
    stratumIndex,
    hubIds: [hubId],
    bossBranchIndex: 0,
    bossId,
    shrineId,
    criticalPathIds,
    nodes,
    edges,
  };
}

/**
 * Layer-cake 토폴로지 — 사문(蛇紋) snake.
 *
 *   hub → 동(東) W개 → 남(南) 1개 → 서(西) W개 → 남 1개 → 동 W개 → ... → boss
 *
 * 모든 spoke 가 단일 branch (branchIndex=0). chain 자체가 길어 "긴 던전" 느낌.
 * shrine 은 hub 의 perpendicular(북쪽) alcove.
 *
 * S = nodeCount - 3 spokes. nodeCount 가 작으면(=linear_right 와 동치) 자연 degenerate.
 */
function buildLayerCake(def: StratumDef, itemUid: number, stratumIndex: number): RoomGraphData {
  const _rng = new PRNG(itemUid * 1000 + stratumIndex * 7919);
  void _rng;
  const nodes = new Map<string, RoomNode>();
  const edges: RoomEdge[] = [];

  const LAYER_WIDTH = 3;
  const dirAngle = { E: 0, W: Math.PI, S: Math.PI / 2 } as const;

  const hubId = 'h0';
  nodes.set(hubId, makeNode({
    id: hubId, role: 'hub', hubIndex: 0, branchIndex: -1, depth: 0,
    stratumIndex, angleRad: 0, ring: 0,
    tags: ['hub_plaza', 'safe', 'large'],
  }));

  const S = Math.max(2, def.nodeCount - 3);

  // 사문 패턴: lateralDir 은 E 또는 W. countInLayer 가 LAYER_WIDTH 도달하면
  // 다음 spoke 는 S(남) 로 내려가고 lateralDir 을 반전한다.
  let lateralDir: 'E' | 'W' = 'E';
  let countInLayer = 0;
  let prevId = hubId;
  let prevDepth = 0;

  const spokeAngles: number[] = [];
  for (let i = 0; i < S; i++) {
    let angle: number;
    if (countInLayer < LAYER_WIDTH) {
      angle = dirAngle[lateralDir];
      countInLayer++;
    } else {
      angle = dirAngle.S;
      lateralDir = lateralDir === 'E' ? 'W' : 'E';
      countInLayer = 0;
    }
    spokeAngles.push(angle);
  }

  for (let i = 0; i < S; i++) {
    const d = i + 1;
    const id = `b0.${d}`;
    const angle = spokeAngles[i];
    const kind: 'corridor' | 'room' = (d % 2 === 1) ? 'corridor' : 'room';
    nodes.set(id, makeNode({
      id, role: 'spoke', hubIndex: 0, branchIndex: 0, depth: d,
      stratumIndex, angleRad: angle, ring: d * RING_UNIT,
      tags: [kind],
    }));
    const sides = sidesByAngle(angle);
    edges.push(makeEdge(prevId, id, 'tree', sides.outFromHub, sides.inToSpoke));
    prevId = id;
    prevDepth = d;
  }

  // Boss: 마지막 spoke 의 lateral 방향 그대로 한 칸 더
  const bossAngle = dirAngle[lateralDir];
  const bossId = 'boss0';
  nodes.set(bossId, makeNode({
    id: bossId, role: 'boss', hubIndex: 0, branchIndex: 0, depth: prevDepth + 1,
    stratumIndex, angleRad: bossAngle, ring: (prevDepth + 1) * RING_UNIT,
    tags: ['boss_chamber'],
  }));
  const bossSides = sidesByAngle(bossAngle);
  edges.push(makeEdge(prevId, bossId, 'tree', bossSides.outFromHub, bossSides.inToSpoke));

  // Shrine: hub 의 북쪽 alcove
  const shrineAngle = -Math.PI / 2;
  const shrineId = makeShrineId();
  nodes.set(shrineId, makeNode({
    id: shrineId, role: 'shrine', hubIndex: 0, branchIndex: -1, depth: 1,
    stratumIndex, angleRad: shrineAngle, ring: 0.5,
    tags: ['shrine_alcove', 'safe'],
  }));
  const shrineSides = sidesByAngle(shrineAngle);
  edges.push(makeEdge(hubId, shrineId, 'tree', shrineSides.outFromHub, shrineSides.inToSpoke));

  const criticalPathIds = new Set<string>();
  criticalPathIds.add(hubId);
  for (const node of nodes.values()) {
    if (node.role === 'spoke' && node.branchIndex === 0) criticalPathIds.add(node.id);
  }

  for (const node of nodes.values()) {
    node.layout.x = Math.cos(node.layout.angleRad) * node.layout.ring;
    node.layout.y = Math.sin(node.layout.angleRad) * node.layout.ring;
  }

  return {
    stratumIndex,
    hubIds: [hubId],
    bossBranchIndex: 0,
    bossId,
    shrineId,
    criticalPathIds,
    nodes,
    edges,
  };
}

/**
 * Ring 토폴로지 — 사각 perimeter 폐곡선.
 *
 *   (0,0)hub ─→─ ─→─ ─→─ ─→─
 *      ↑                     ↓
 *      ↑                     ↓
 *      ←─ ─←─ ─←─ ─←─ ─←─ boss
 *
 * 시계방향 perimeter 를 따라 spoke 사슬을 깔고, 마지막 spoke 가 hub 와 cardinal
 * 인접한 위치에 도달하면 'ring_closure' 엣지로 hub 와 잇는다 (BFS 임베딩에서
 * 제외됨, exit 도출에만 참여). boss 는 hub 와 대각 코너에 배치.
 *
 * 직사각형 W,H 는 perimeter ≈ nodeCount-1 이 되도록 산정. 짝수 nodeCount 의
 * 경우 1개 노드만큼 over-allocate 될 수 있고 validate 에서 warn 만 한다.
 */
function buildRing(def: StratumDef, itemUid: number, stratumIndex: number): RoomGraphData {
  const _rng = new PRNG(itemUid * 1000 + stratumIndex * 7919);
  void _rng;
  const nodes = new Map<string, RoomNode>();
  const edges: RoomEdge[] = [];

  const dirAngle = { E: 0, W: Math.PI, S: Math.PI / 2, N: -Math.PI / 2 } as const;

  // perimeter target = nodeCount - 1 (shrine 제외)
  const targetPerim = Math.max(6, def.nodeCount - 1);
  const wPlusH = Math.max(4, Math.round((targetPerim + 4) / 2));
  const W = Math.max(2, Math.floor(wPlusH / 2) + 1); // 가로 약간 길게
  const H = Math.max(2, wPlusH - W);

  // 시계방향 perimeter 좌표 sequence (hub 제외, hub 다음 위치부터)
  type Step = { col: number; row: number; dir: 'E' | 'S' | 'W' | 'N' };
  const steps: Step[] = [];
  for (let c = 1; c <= W - 1; c++) steps.push({ col: c, row: 0, dir: 'E' });
  for (let r = 1; r <= H - 1; r++) steps.push({ col: W - 1, row: r, dir: 'S' });
  for (let c = W - 2; c >= 0; c--) steps.push({ col: c, row: H - 1, dir: 'W' });
  for (let r = H - 2; r >= 1; r--) steps.push({ col: 0, row: r, dir: 'N' });
  // steps.length = perimeter - 1

  const hubId = 'h0';
  nodes.set(hubId, makeNode({
    id: hubId, role: 'hub', hubIndex: 0, branchIndex: -1, depth: 0,
    stratumIndex, angleRad: 0, ring: 0,
    tags: ['hub_plaza', 'safe', 'large'],
  }));

  // boss 위치 = hub 와 대각인 (W-1, H-1). 해당 step 인덱스 찾기.
  const bossStepIdx = steps.findIndex(s => s.col === W - 1 && s.row === H - 1);

  let prevId = hubId;
  const bossId = 'boss0';
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    const angle = dirAngle[s.dir];
    if (i === bossStepIdx) {
      nodes.set(bossId, makeNode({
        id: bossId, role: 'boss', hubIndex: 0, branchIndex: 0, depth: i + 1,
        stratumIndex, angleRad: angle, ring: (i + 1) * RING_UNIT,
        tags: ['boss_chamber'],
      }));
      const sides = sidesByAngle(angle);
      edges.push(makeEdge(prevId, bossId, 'tree', sides.outFromHub, sides.inToSpoke));
      prevId = bossId;
    } else {
      const id = `b0.${i + 1}`;
      const kind: 'corridor' | 'room' = ((i + 1) % 2 === 1) ? 'corridor' : 'room';
      nodes.set(id, makeNode({
        id, role: 'spoke', hubIndex: 0, branchIndex: 0, depth: i + 1,
        stratumIndex, angleRad: angle, ring: (i + 1) * RING_UNIT,
        tags: [kind],
      }));
      const sides = sidesByAngle(angle);
      edges.push(makeEdge(prevId, id, 'tree', sides.outFromHub, sides.inToSpoke));
      prevId = id;
    }
  }

  // Closure edge: 마지막 spoke (= (0,1) 좌표) 가 hub (0,0) 의 남쪽으로 cardinal
  // 인접. ring_closure 로 표시 → BFS 무시, exit 만 도출.
  edges.push(makeEdge(prevId, hubId, 'ring_closure', 'up', 'down'));

  // Shrine: 외부에 부착 (hub 의 서쪽 alcove)
  const shrineAngle = dirAngle.W;
  const shrineId = makeShrineId();
  nodes.set(shrineId, makeNode({
    id: shrineId, role: 'shrine', hubIndex: 0, branchIndex: -1, depth: 1,
    stratumIndex, angleRad: shrineAngle, ring: 0.5,
    tags: ['shrine_alcove', 'safe'],
  }));
  const shrineSides = sidesByAngle(shrineAngle);
  edges.push(makeEdge(hubId, shrineId, 'tree', shrineSides.outFromHub, shrineSides.inToSpoke));

  // Critical path = hub + 시계방향 절반 (boss 까지의 perimeter)
  const criticalPathIds = new Set<string>();
  criticalPathIds.add(hubId);
  for (let i = 0; i <= bossStepIdx; i++) {
    const id = (i === bossStepIdx) ? bossId : `b0.${i + 1}`;
    if (nodes.has(id)) criticalPathIds.add(id);
  }

  for (const node of nodes.values()) {
    node.layout.x = Math.cos(node.layout.angleRad) * node.layout.ring;
    node.layout.y = Math.sin(node.layout.angleRad) * node.layout.ring;
  }

  return {
    stratumIndex,
    hubIds: [hubId],
    bossBranchIndex: 0,
    bossId,
    shrineId,
    criticalPathIds,
    nodes,
    edges,
  };
}

/**
 * Spine-pockets 토폴로지.
 *
 *   hub → b0.1 → b0.2 → ... → b0.S → boss
 *           ↑               ↓
 *         shrine         pocket(s)
 *
 * 가로 spine + 측면 단일-방 포켓. shrine 은 spine[0] 의 북쪽,
 * pockets 는 spine 사이로 spread (남/북 교번).
 *
 * S + P = nodeCount - 3. P = floor((nodeCount-3)/4).
 */
function buildSpinePockets(def: StratumDef, itemUid: number, stratumIndex: number): RoomGraphData {
  const _rng = new PRNG(itemUid * 1000 + stratumIndex * 7919);
  void _rng;
  const nodes = new Map<string, RoomNode>();
  const edges: RoomEdge[] = [];

  const spineAngle = 0;

  const hubId = 'h0';
  nodes.set(hubId, makeNode({
    id: hubId, role: 'hub', hubIndex: 0, branchIndex: -1, depth: 0,
    stratumIndex, angleRad: 0, ring: 0,
    tags: ['hub_plaza', 'safe', 'large'],
  }));

  let P = Math.max(0, Math.floor((def.nodeCount - 3) / 4));
  let S = Math.max(2, def.nodeCount - 3 - P);
  // shrine 은 spine[0] 북쪽을 차지 → 포켓 위치는 idx ≥ 2 부터 spread
  if (S < 3) { P = 0; S = Math.max(2, def.nodeCount - 3); }

  // Spine
  let prevId = hubId;
  for (let d = 1; d <= S; d++) {
    const id = `b0.${d}`;
    const kind: 'corridor' | 'room' = (d % 2 === 1) ? 'corridor' : 'room';
    nodes.set(id, makeNode({
      id, role: 'spoke', hubIndex: 0, branchIndex: 0, depth: d,
      stratumIndex, angleRad: spineAngle, ring: d * RING_UNIT,
      tags: [kind],
    }));
    const sides = sidesByAngle(spineAngle);
    edges.push(makeEdge(prevId, id, 'tree', sides.outFromHub, sides.inToSpoke));
    prevId = id;
  }
  const bossId = 'boss0';
  nodes.set(bossId, makeNode({
    id: bossId, role: 'boss', hubIndex: 0, branchIndex: 0, depth: S + 1,
    stratumIndex, angleRad: spineAngle, ring: (S + 1) * RING_UNIT,
    tags: ['boss_chamber'],
  }));
  const bossSides = sidesByAngle(spineAngle);
  edges.push(makeEdge(prevId, bossId, 'tree', bossSides.outFromHub, bossSides.inToSpoke));

  // Pockets: 가용 spine 인덱스 [2..S] 에 P 개를 spread
  const pocketSpineIndices: number[] = [];
  if (P > 0 && S >= 3) {
    const usable = S - 1; // index 2..S inclusive count
    for (let k = 0; k < P; k++) {
      const idx = Math.min(S, 2 + Math.floor((k * usable) / Math.max(1, P)));
      if (!pocketSpineIndices.includes(idx)) pocketSpineIndices.push(idx);
    }
  }
  for (let k = 0; k < pocketSpineIndices.length; k++) {
    const spineIdx = pocketSpineIndices[k];
    const parentId = `b0.${spineIdx}`;
    const id = `b${k + 1}.1`;
    const pocketAngle = (k % 2 === 0) ? Math.PI / 2 : -Math.PI / 2; // 남/북 교번
    nodes.set(id, makeNode({
      id, role: 'spoke', hubIndex: 0, branchIndex: k + 1, depth: spineIdx + 1,
      stratumIndex, angleRad: pocketAngle, ring: (spineIdx + 1) * RING_UNIT,
      tags: ['room'],
    }));
    const sides = sidesByAngle(pocketAngle);
    edges.push(makeEdge(parentId, id, 'tree', sides.outFromHub, sides.inToSpoke));
  }

  // Shrine: spine[0] 북쪽
  const shrineAngle = -Math.PI / 2;
  const shrineId = makeShrineId();
  const shrineParent = S >= 1 ? 'b0.1' : hubId;
  nodes.set(shrineId, makeNode({
    id: shrineId, role: 'shrine', hubIndex: 0, branchIndex: -1, depth: 2,
    stratumIndex, angleRad: shrineAngle, ring: RING_UNIT,
    tags: ['shrine_alcove', 'safe'],
  }));
  const shrineSides = sidesByAngle(shrineAngle);
  edges.push(makeEdge(shrineParent, shrineId, 'tree', shrineSides.outFromHub, shrineSides.inToSpoke));

  // Critical path = hub + 모든 spine spoke (boss arm)
  const criticalPathIds = new Set<string>();
  criticalPathIds.add(hubId);
  for (const node of nodes.values()) {
    if (node.role === 'spoke' && node.branchIndex === 0) criticalPathIds.add(node.id);
  }

  for (const node of nodes.values()) {
    node.layout.x = Math.cos(node.layout.angleRad) * node.layout.ring;
    node.layout.y = Math.sin(node.layout.angleRad) * node.layout.ring;
  }

  return {
    stratumIndex,
    hubIds: [hubId],
    bossBranchIndex: 0,
    bossId,
    shrineId,
    criticalPathIds,
    nodes,
    edges,
  };
}

/**
 * Two-Arc Pocketed 토폴로지 (Tier C cycle, Phase A).
 *
 * hub→boss 사이 평행한 두 arc(upper/lower)로 폐곡선을 만들고, 각 arc 노드별
 * 측면 알코브 pocket 을 부착하여 "전체에 분기" 시각을 달성한다. pocket 은
 * 단실(1 노드) 알코브 — upper arc 는 N, lower arc 는 S 방향.
 *
 * Edges:
 *   hub → u0 (N) → u1..u(W-1) (E) → boss (S)               -- tree, canonical critical path
 *   hub → l0 (S) → l1..l(W-1) (E)                          -- tree
 *   l(W-1) → boss (ring_closure, N)                        -- 폐곡선 닫는 엣지
 *   hub → shrine (W)                                        -- alcove
 *   pocket: arc 노드 → pkt (N or S)                         -- 1 노드 알코브 (round-robin)
 *
 * BFS 임베딩 시 ring_closure 는 무시되어 hub→upper→boss 가 canonical path.
 * 그러나 deriveExitsFromEdges 가 closure 의 cardinal 인접 (last_lower N ↔ boss)을
 * exit 으로 인식하여 실제 게임 내에서도 양 arc 가 양방향 통로가 된다.
 *
 *   row -1 :  pkt_N (선택적)                 ← upper pockets
 *   row  0 :  u0 - u1 - ... - u(W-1)         ← upper arc
 *   row  1 :  hub  ─ ─ ─ ─ ─ ─ ─  boss      ← mid pole
 *   row  2 :  l0 - l1 - ... - l(W-1)         ← lower arc
 *   row  3 :  pkt_S (선택적)                 ← lower pockets
 *
 * 노드 회계:
 *   arcBudget = nodeCount - 3
 *   W = max(2, ceil(arcBudget/4))     -- 1:1 arc:pocket 비율
 *   pocketBudget = arcBudget - 2W      -- 항상 ≤ 2W (sparse 허용)
 *   pocket 분배 = round-robin (u0,l0,u1,l1,...) 으로 pocketBudget 개
 */
function buildTwoArcPocketed(def: StratumDef, itemUid: number, stratumIndex: number): RoomGraphData {
  const _rng = new PRNG(itemUid * 1000 + stratumIndex * 7919);
  void _rng;
  const nodes = new Map<string, RoomNode>();
  const edges: RoomEdge[] = [];

  const dirAngle = { E: 0, W: Math.PI, S: Math.PI / 2, N: -Math.PI / 2 } as const;

  if (def.nodeCount < 7) {
    throw new Error(`two_arc_pocketed: requires nodeCount >= 7 (got ${def.nodeCount}).`);
  }

  const arcBudget = def.nodeCount - 3;
  const W = Math.max(2, Math.ceil(arcBudget / 4));
  const pocketBudget = arcBudget - 2 * W;
  if (pocketBudget < 0) {
    throw new Error(`two_arc_pocketed: invariant broken — pocketBudget=${pocketBudget} (arcBudget=${arcBudget}, W=${W})`);
  }

  const hubId = 'h0';
  nodes.set(hubId, makeNode({
    id: hubId, role: 'hub', hubIndex: 0, branchIndex: -1, depth: 0,
    stratumIndex, angleRad: 0, ring: 0,
    tags: ['hub_plaza', 'safe', 'large'],
  }));

  const bossId = 'boss0';

  // Upper arc: hub --N--> u0 --E--> ... --E--> u(W-1) --S--> boss
  let prevId = hubId;
  for (let c = 0; c < W; c++) {
    const id = `u${c}`;
    const isCorridor = (c % 2 === 0);
    const angle = c === 0 ? dirAngle.N : dirAngle.E;
    nodes.set(id, makeNode({
      id, role: 'spoke', hubIndex: 0, branchIndex: 0, depth: c + 1,
      stratumIndex, angleRad: angle, ring: (c + 1) * RING_UNIT,
      tags: [isCorridor ? 'corridor' : 'room'],
    }));
    const sides = sidesByAngle(angle);
    edges.push(makeEdge(prevId, id, 'tree', sides.outFromHub, sides.inToSpoke));
    prevId = id;
  }
  nodes.set(bossId, makeNode({
    id: bossId, role: 'boss', hubIndex: 0, branchIndex: 0, depth: W + 1,
    stratumIndex, angleRad: dirAngle.S, ring: (W + 1) * RING_UNIT,
    tags: ['boss_chamber'],
  }));
  {
    const sides = sidesByAngle(dirAngle.S);
    edges.push(makeEdge(prevId, bossId, 'tree', sides.outFromHub, sides.inToSpoke));
  }

  // Lower arc: hub --S--> l0 --E--> ... --E--> l(W-1)
  prevId = hubId;
  for (let c = 0; c < W; c++) {
    const id = `l${c}`;
    const isCorridor = (c % 2 === 0);
    const angle = c === 0 ? dirAngle.S : dirAngle.E;
    nodes.set(id, makeNode({
      id, role: 'spoke', hubIndex: 0, branchIndex: 1, depth: c + 1,
      stratumIndex, angleRad: angle, ring: (c + 1) * RING_UNIT,
      tags: [isCorridor ? 'corridor' : 'room'],
    }));
    const sides = sidesByAngle(angle);
    edges.push(makeEdge(prevId, id, 'tree', sides.outFromHub, sides.inToSpoke));
    prevId = id;
  }
  // closure: last lower → boss (cardinal-N)
  edges.push(makeEdge(prevId, bossId, 'ring_closure', 'up', 'down'));

  // Pockets: round-robin distribution (u0, l0, u1, l1, ...) for pocketBudget items
  for (let i = 0; i < pocketBudget; i++) {
    const arcCol = Math.floor(i / 2);
    const isUpper = (i % 2 === 0);
    const parentId = isUpper ? `u${arcCol}` : `l${arcCol}`;
    const angle = isUpper ? dirAngle.N : dirAngle.S;
    const pocketId = isUpper ? `pu${arcCol}` : `pl${arcCol}`;
    nodes.set(pocketId, makeNode({
      id: pocketId,
      role: 'spoke',
      hubIndex: 0,
      branchIndex: isUpper ? 2 : 3,
      depth: arcCol + 2,
      stratumIndex,
      angleRad: angle,
      ring: (arcCol + 2) * RING_UNIT,
      tags: ['room', 'pocket'],
    }));
    const sides = sidesByAngle(angle);
    edges.push(makeEdge(parentId, pocketId, 'tree', sides.outFromHub, sides.inToSpoke));
  }

  // Shrine: hub W alcove
  const shrineAngle = dirAngle.W;
  const shrineId = makeShrineId();
  nodes.set(shrineId, makeNode({
    id: shrineId, role: 'shrine', hubIndex: 0, branchIndex: -1, depth: 1,
    stratumIndex, angleRad: shrineAngle, ring: 0.5,
    tags: ['shrine_alcove', 'safe'],
  }));
  const shrineSides = sidesByAngle(shrineAngle);
  edges.push(makeEdge(hubId, shrineId, 'tree', shrineSides.outFromHub, shrineSides.inToSpoke));

  // Critical path = hub + upper arc + boss
  const criticalPathIds = new Set<string>();
  criticalPathIds.add(hubId);
  for (let c = 0; c < W; c++) criticalPathIds.add(`u${c}`);
  criticalPathIds.add(bossId);

  for (const node of nodes.values()) {
    node.layout.x = Math.cos(node.layout.angleRad) * node.layout.ring;
    node.layout.y = Math.sin(node.layout.angleRad) * node.layout.ring;
  }

  return {
    stratumIndex,
    hubIds: [hubId],
    bossBranchIndex: 0,
    bossId,
    shrineId,
    criticalPathIds,
    nodes,
    edges,
  };
}

// ---------------------------------------------------------------------------
// Validation — dev 빌드에서 generateRoomGraph 결과를 self-test 한다.
// 위반 시 throw. 빌드 안정성을 위해 production 호출은 권장하지 않는다.
// ---------------------------------------------------------------------------

export function validateRoomGraph(g: RoomGraphData, def: StratumDef): void {
  // IWF-R10: 노드 수 일치 (hub + spoke + boss + shrine)
  if (g.nodes.size !== def.nodeCount) {
    throw new Error(`IWF-R10: nodeCount mismatch — got ${g.nodes.size}, expected ${def.nodeCount}`);
  }

  // IWF-R11: hub[0] 에서 BFS 도달 가능 노드 수 = 전체
  const reached = bfsReach(g, g.hubIds[0]);
  if (reached.size !== g.nodes.size) {
    throw new Error(`IWF-R11: graph not fully reachable from hub — ${reached.size}/${g.nodes.size}`);
  }

  // IWF-R16: hub-hub 직결은 multi_hub 만, 그 외는 tree 만
  for (const e of g.edges) {
    if (e.kind === 'multi_hub' && def.hubCount < 2) {
      throw new Error(`IWF-R16: multi_hub edge present but hubCount=${def.hubCount}`);
    }
  }

  // IWF-R17: boss 는 별도 노드
  const bossNode = g.nodes.get(g.bossId);
  if (!bossNode || bossNode.role !== 'boss') {
    throw new Error(`IWF-R17: boss node missing or wrong role`);
  }

  // IWF-R18: shrine 별도 노드
  if (!g.shrineId) {
    throw new Error(`IWF-R18: shrine node missing`);
  }
  const shrineNode = g.nodes.get(g.shrineId);
  if (!shrineNode || shrineNode.role !== 'shrine') {
    throw new Error(`IWF-R18: shrine node wrong role`);
  }

  // IWF-R19: hubCount=2 → 두 hub 의 angular 차 = π
  if (def.hubCount === 2) {
    const a0 = g.nodes.get(g.hubIds[0])!.layout.angleRad;
    const a1 = g.nodes.get(g.hubIds[1])!.layout.angleRad;
    const diff = Math.abs(a1 - a0);
    if (Math.abs(diff - Math.PI) > 1e-6) {
      throw new Error(`IWF-R19: ancient hubs not π apart — diff=${diff}`);
    }
  }

  // 결정성 sanity: hub[0] 은 항상 'h0'
  if (g.hubIds[0] !== 'h0') {
    throw new Error(`hub[0] id should be 'h0', got '${g.hubIds[0]}'`);
  }
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

interface MakeNodeArgs {
  id: string;
  role: NodeRole;
  hubIndex: number;
  branchIndex: number;
  depth: number;
  stratumIndex: number;
  angleRad: number;
  ring: number;
  tags: string[];
}

function makeNode(a: MakeNodeArgs): RoomNode {
  return {
    id: a.id,
    role: a.role,
    hubIndex: a.hubIndex,
    branchIndex: a.branchIndex,
    depth: a.depth,
    stratumIndex: a.stratumIndex,
    layout: { angleRad: a.angleRad, ring: a.ring, x: 0, y: 0 },
    tags: a.tags,
    visited: false,
    cleared: false,
  };
}

function makeEdge(a: string, b: string, kind: RoomEdge['kind'], sideA: ExitSide, sideB: ExitSide): RoomEdge {
  return { a, b, kind, sideA, sideB };
}

function makeShrineId(): string {
  return 'shrine';
}

function jitter(rng: PRNG, branches: number): number {
  // 가지 사이 angular 폭의 ±25% 범위에서 흔든다
  const span = (2 * Math.PI) / branches;
  return rng.nextFloat(-span * 0.25, span * 0.25);
}

function pickBossBranch(_placement: BossPlacement, lens: number[], rng: PRNG): number {
  // 가장 긴 가지를 선택. 동률은 시드로 결정
  // (placement 는 향후 분기 추가 여지를 위해 유지하지만 현재는 분기 없음)
  let maxLen = -1;
  const candidates: number[] = [];
  for (let b = 0; b < lens.length; b++) {
    if (lens[b] > maxLen) { maxLen = lens[b]; candidates.length = 0; candidates.push(b); }
    else if (lens[b] === maxLen) candidates.push(b);
  }
  return candidates[rng.nextInt(0, candidates.length - 1)];
}

function lastNodeIdOfBranch(nodes: Map<string, RoomNode>, branchIndex: number): string | null {
  let last: RoomNode | null = null;
  for (const n of nodes.values()) {
    if (n.role !== 'spoke') continue;
    if (n.branchIndex !== branchIndex) continue;
    if (!last || n.depth > last.depth) last = n;
  }
  return last ? last.id : null;
}

/** 두 노드가 angular 위치상 어느 면을 통해 연결되는지 결정 (룸 prefab 4면 도어 매칭). */
function sidesByAngle(angleRad: number): { outFromHub: ExitSide; inToSpoke: ExitSide } {
  // angle 0 = +x (right), π/2 = +y (down), π = -x (left), -π/2 = +y (up)
  // PixiJS 좌표계: y+ 가 아래
  const a = normalizeAngle(angleRad);
  let out: ExitSide;
  let inn: ExitSide;
  if (a >= -Math.PI / 4 && a < Math.PI / 4) { out = 'right'; inn = 'left'; }
  else if (a >= Math.PI / 4 && a < (3 * Math.PI) / 4) { out = 'down'; inn = 'up'; }
  else if (a >= -(3 * Math.PI) / 4 && a < -Math.PI / 4) { out = 'up'; inn = 'down'; }
  else { out = 'left'; inn = 'right'; }
  return { outFromHub: out, inToSpoke: inn };
}

function normalizeAngle(a: number): number {
  let x = a;
  while (x > Math.PI) x -= 2 * Math.PI;
  while (x < -Math.PI) x += 2 * Math.PI;
  return x;
}

function bfsReach(g: RoomGraphData, startId: string): Set<string> {
  const visited = new Set<string>();
  const queue = [startId];
  // 인접 리스트 구축
  const adj = new Map<string, string[]>();
  for (const e of g.edges) {
    if (!adj.has(e.a)) adj.set(e.a, []);
    if (!adj.has(e.b)) adj.set(e.b, []);
    adj.get(e.a)!.push(e.b);
    adj.get(e.b)!.push(e.a);
  }
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const next = adj.get(id) ?? [];
    for (const n of next) if (!visited.has(n)) queue.push(n);
  }
  return visited;
}
