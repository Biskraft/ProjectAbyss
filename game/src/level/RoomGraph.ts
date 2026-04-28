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
import type { StratumDef, BossPlacement } from '@data/StrataConfig';

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
  /** 'tree' = hub→spoke 사슬 / 'multi_hub' = Ancient hub-hub 한정 (IWF-R16) */
  kind: 'tree' | 'multi_hub';
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
 * 방사형 RoomGraph 생성.
 * @param def      StratumDef (CSV → StrataConfig.ts 로 로드)
 * @param itemUid  결정적 시드용 아이템 식별자
 * @param stratumIndex 0-based
 */
export function generateRoomGraph(
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

  // 가지별 spoke 길이 분배 (앞 가지부터 +1)
  const spokeLenByBranch: number[] = new Array(def.branchCount).fill(0);
  if (def.branchCount > 0) {
    const base = Math.floor(spokeBudget / def.branchCount);
    let leftover = spokeBudget - base * def.branchCount;
    for (let b = 0; b < def.branchCount; b++) {
      spokeLenByBranch[b] = base + (leftover > 0 ? 1 : 0);
      if (leftover > 0) leftover--;
    }
  }

  // -------------------------------------------------------------------------
  // 3) 보스 가지 결정
  //    hub_adjacent: 가지[0]을 보스 가지로 강제 (가지 깊이 1 spoke + boss)
  //    branch_end:   가장 긴 가지를 보스 가지로 (동률은 시드로)
  //    multi_hub:    가장 긴 가지를 보스 가지로 (Ancient)
  // -------------------------------------------------------------------------
  let bossBranchIndex = pickBossBranch(def.bossPlacement, spokeLenByBranch, rng);

  // hub_adjacent 정합: 보스 가지 spoke 길이 = 1 강제 (Mantis Village 신전 비유)
  if (def.bossPlacement === 'hub_adjacent') {
    const shortage = 1 - spokeLenByBranch[bossBranchIndex];
    spokeLenByBranch[bossBranchIndex] = 1;
    if (shortage > 0) {
      // spoke 부족분을 다른 가지에서 차감
      let need = shortage;
      for (let b = 0; b < def.branchCount && need > 0; b++) {
        if (b === bossBranchIndex) continue;
        if (spokeLenByBranch[b] > 1) {
          spokeLenByBranch[b]--;
          need--;
        }
      }
    } else if (shortage < 0) {
      // 보스 가지가 너무 길었던 경우 잉여를 가장 짧은 가지에 부여
      let surplus = -shortage;
      while (surplus > 0) {
        let minIdx = 0;
        for (let b = 1; b < def.branchCount; b++) {
          if (b !== bossBranchIndex && spokeLenByBranch[b] < spokeLenByBranch[minIdx]) minIdx = b;
        }
        spokeLenByBranch[minIdx]++;
        surplus--;
      }
    }
  }

  // -------------------------------------------------------------------------
  // 4) 가지 노드 생성 (spoke 사슬) — single-hub 기준 hub[0]에서만 가지
  //    multi_hub 의 경우에도 본 PR 에서는 hub[0]에서만 가지를 뻗는 모델로
  //    단순화한다 (Phase 2 에서 hub[1]가지 분배 도입).
  // -------------------------------------------------------------------------
  const sourceHubId = hubIds[0];
  for (let b = 0; b < def.branchCount; b++) {
    const angle = (b / def.branchCount) * 2 * Math.PI + jitter(rng, def.branchCount);
    const len = spokeLenByBranch[b];
    let prevId = sourceHubId;
    for (let d = 1; d <= len; d++) {
      const id = `b${b}.${d}`;
      const node = makeNode({
        id, role: 'spoke', hubIndex: 0, branchIndex: b, depth: d,
        stratumIndex, angleRad: angle, ring: d * RING_UNIT,
        tags: ['spoke_corridor'],
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
  const bossPrevId = lastNodeIdOfBranch(nodes, bossBranchIndex) ?? sourceHubId;
  const bossDepth = (nodes.get(bossPrevId)?.depth ?? 0) + 1;
  const bossAngle = (bossBranchIndex / def.branchCount) * 2 * Math.PI;
  const bossId = `boss${bossBranchIndex}`;
  nodes.set(bossId, makeNode({
    id: bossId, role: 'boss', hubIndex: 0, branchIndex: bossBranchIndex, depth: bossDepth,
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
  const shrineAngle = (bossBranchIndex / def.branchCount) * 2 * Math.PI + Math.PI / 12;
  nodes.set(shrineId, makeNode({
    id: shrineId, role: 'shrine', hubIndex: 0, branchIndex: -1, depth: 1,
    stratumIndex, angleRad: shrineAngle, ring: 0.5,
    tags: ['shrine_alcove', 'safe'],
  }));
  const shrineSides = sidesByAngle(shrineAngle);
  edges.push(makeEdge(sourceHubId, shrineId, 'tree', shrineSides.outFromHub, shrineSides.inToSpoke));

  // -------------------------------------------------------------------------
  // 7) Critical Path 집합 (IWF-R30 후속)
  // -------------------------------------------------------------------------
  const criticalPathIds = new Set<string>();
  criticalPathIds.add(sourceHubId);
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

function pickBossBranch(placement: BossPlacement, lens: number[], rng: PRNG): number {
  if (placement === 'hub_adjacent') return 0;
  // 가장 긴 가지를 선택. 동률은 시드로 결정
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
