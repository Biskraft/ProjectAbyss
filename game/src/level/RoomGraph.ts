/**
 * RoomGraph.ts — DEC-039 Vertical Dive Graph (수직 딥 다이브 그래프).
 *
 * DEC-037 hub-and-spoke 방사형은 폐기. 각 stratum 그래프는 단일 수직 다이브:
 *
 *   [Plaza (hub)] ← top, 출구 LRD only (U 천장 파괴 시각)
 *      ├─ L → [Lane spoke] → [Lane spoke] → ...               (좌측 분기)
 *      ├─ R → [Lane spoke] → [Lane spoke] → [Archive(shrine)] (우측 분기, 끝에 shrine)
 *      └─ D → [CP spoke] → [CP spoke] → ... → [Boss]          (critical path)
 *                                                ↓ (처치 후 Trapdoor 포탈 활성)
 *                                                ▼ 공격 키 인터랙트 → 다음 Plaza
 *
 * 룰:
 *   - hub 노드 = 지층 top, role='hub'. 출구 = LR + D (U 없음).
 *   - boss 노드 = 지층 bottom, role='boss'. 출구 = LRU (D 는 처치 후 Trapdoor entity 가 담당).
 *   - shrine 노드 = R 분기 가지 끝, role='shrine'. 옵션 안전지대. 적 spawn 0.
 *   - critical path = hub + D 방향 spoke 사슬 + boss.
 *   - 분기 = LR (hub 직속).
 *   - chain-length 교번 (홀수 depth = corridor, 짝수 = room) 보존.
 *   - StratumDef.topology / branchCount / hubCount 는 무시 (vertical dive 는 단일 형상).
 *     CSV 의 nodeCount 는 분배 예산으로만 사용.
 *
 * 보존 invariants:
 *   - 자료구조 (RoomNode/RoomEdge/RoomGraphData) DEC-037 와 동일 — RoomGraphAdapter
 *     와 ItemWorldScene 이 그대로 사용한다.
 *   - validateRoomGraph 의 nodeCount 일치 / hub BFS 도달 / boss·shrine 별도 노드.
 *
 * 폐기 (재도입 금지):
 *   - hub_spoke / multi_hub / linear_right / y_fork / t_junction / layer_cake
 *     / ring / spine_pockets / two_arc_pocketed 빌더.
 *   - applyStratumVariant (mirror X/Y/180°) — vertical dive 의 hub-top / boss-bottom
 *     불변을 mirror Y 가 깨뜨리므로 폐기. 시각 다양화는 LDtk 템플릿 셀렉션과
 *     테마 슬러그가 담당.
 *   - hub-hub multi_hub 엣지 (Ancient 다중 hub 도 단일 수직 dive 로 통일).
 */

import { PRNG } from '@utils/PRNG';
import type { StratumDef, TopologyKind } from '@data/StrataConfig';
import { ARCHETYPE_WEIGHTS, type Archetype } from '@level/RoomGraphArchetypes';

// ---------------------------------------------------------------------------
// Types — 외부 import 호환성을 위해 시그니처 보존.
// ---------------------------------------------------------------------------

export type NodeRole = 'hub' | 'spoke' | 'boss' | 'shrine';
export type ExitSide = 'left' | 'right' | 'up' | 'down';

export interface RoomNode {
  id: string;
  role: NodeRole;
  /** vertical dive 는 항상 0 (단일 hub). */
  hubIndex: number;
  /** -1 = hub/shrine, 0 = critical path (D 방향), 1 = L 분기, 2 = R 분기. */
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
  /** vertical dive 는 'tree' 만 사용. multi_hub / ring_closure 는 폐기되었으나 호환 유지. */
  kind: 'tree' | 'multi_hub' | 'ring_closure';
  sideA: ExitSide;
  sideB: ExitSide;
}

export interface RoomGraphData {
  stratumIndex: number;
  hubIds: string[];
  /** vertical dive 는 항상 0 (CP = D 분기). 호환 유지 필드. */
  bossBranchIndex: number;
  bossId: string;
  shrineId: string | null;
  criticalPathIds: Set<string>;
  nodes: Map<string, RoomNode>;
  edges: RoomEdge[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RING_UNIT = 1;

/** Branch index conventions. */
const BR_CP = 0;
const BR_LEFT = 1;
const BR_RIGHT = 2;
const BR_DEAD = 3; // dead-end pocket branches off CP

/** Cardinal angles (PixiJS y+ down). */
const ANGLE_DOWN = Math.PI / 2;
const ANGLE_UP = -Math.PI / 2;
const ANGLE_LEFT = Math.PI;
const ANGLE_RIGHT = 0;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * RoomGraph 진입점. DEC-039 vertical dive 단일 빌더.
 *
 * topologyOverride / def.topology 는 무시. CSV 의 nodeCount 만 분배 예산으로 사용.
 * archetype 은 무기의 (주색, 부색) 으로 호출 측이 결정 — RoomGraphAdapter 가
 * archetypeFor() 로 매핑 후 전달. 미지정 시 'zigzag' fallback.
 *
 * @param def              StratumDef (CSV → StrataConfig.ts)
 * @param itemUid          결정적 시드용 아이템 식별자
 * @param stratumIndex     0-based
 * @param topologyOverride 무시 (vertical dive 단일 형상)
 * @param archetype        DEC-039 7 archetype 중 하나 — 미지정 시 'zigzag'
 */
export function generateRoomGraph(
  def: StratumDef,
  itemUid: number,
  stratumIndex: number,
  topologyOverride?: TopologyKind,
  archetype: Archetype = 'zigzag',
): RoomGraphData {
  void topologyOverride;
  return buildVerticalDive(def, itemUid, stratumIndex, archetype);
}

// ---------------------------------------------------------------------------
// Vertical Dive builder
// ---------------------------------------------------------------------------

/**
 * Vertical Dive 빌더.
 *
 * 노드 분배 (총 nodeCount):
 *   hub(1) + boss(1) + shrine(1) + cpLen(D) + lLen(L) + rLen(R) = nodeCount
 *
 * 분배 룰:
 *   spokeBudget = max(0, nodeCount - 3)
 *   cpLen       = max(2, ceil(spokeBudget / 2))    -- 대부분 예산은 CP 에
 *   sideBudget  = spokeBudget - cpLen
 *   lLen        = max(1, floor(sideBudget / 2))    -- 좌측 분기
 *   rLen        = max(1, sideBudget - lLen)        -- 우측 분기 (shrine 부착)
 *
 * 부족한 경우 (nodeCount < 6) 는 cpLen 우선, 분기 길이 0 으로 자연 degenerate.
 * Shrine 은 R 분기 가지 끝에 부착. 분기 길이 0 일 경우 hub 의 W (좌) alcove 로 fallback.
 */
function buildVerticalDive(
  def: StratumDef,
  itemUid: number,
  stratumIndex: number,
  archetype: Archetype,
): RoomGraphData {
  const rng = new PRNG(itemUid * 1000 + stratumIndex * 7919);

  const nodes = new Map<string, RoomNode>();
  const edges: RoomEdge[] = [];

  // 1) 노드 분배 — DEC-039 archetype 시스템 (사용자 결정 2026-05-03):
  //    archetype 가중치 (D/L/R 비율, branchBudgetPct, branchMaxDepth) 가
  //    무기의 (주색, 부색) 기질 조합으로 결정됨. 같은 archetype 무기들도
  //    itemUid 시드로 placement 다양화.
  //
  //    archetype.branchBudgetPct 가 spokeBudget 중 branch 비율.
  //    archetype.branchMaxDepth 가 branch 최대 깊이.
  //    spiral archetype 은 itemUid 의 LSB 로 L/R 우세 결정 (별도 처리).
  //
  //    L/R hub 가지는 폐기 — hub 슬롯 (LR) 은 CP 첫 step + shrine 가 점유.
  const archWeights = ARCHETYPE_WEIGHTS[archetype];
  // spiral 의 L/R 비율 swap (R 우세 케이스)
  let cpD = archWeights.cpD;
  let cpL = archWeights.cpL;
  let cpR = archWeights.cpR;
  if (archetype === 'spiral' && (itemUid & 1) === 1) {
    [cpL, cpR] = [cpR, cpL];
  }
  const spokeBudget = Math.max(2, def.nodeCount - 3);
  const branchBudget = Math.max(1, Math.floor(spokeBudget * archWeights.branchBudgetPct));
  const cpLen = Math.max(2, spokeBudget - branchBudget);
  const branchMaxDepth = archWeights.branchMaxDepth;
  const lLen = 0;
  const rLen = 0;

  // 2) Hub (Plaza) — 지층 top. placement (col, row) = (0, 0).
  //    Plaza 출구 = LRU (사용자 결정 2026-05-03). D 폐기 — 모든 spoke 가 hub 의
  //    L/R 출구를 통해 시작. 'no_down' 으로 D 잠금, 'force_up' 으로 U 강제 →
  //    LDtk LRU 변종 (예: ItemStratum_Level_37) 매칭. 천장 자연 open 이라 위에서
  //    Trapdoor 로 떨어져 들어오는 다이브 메타포 자연 봉합.
  const hubId = 'h0';
  const hubNode = makeNode({
    id: hubId, role: 'hub', hubIndex: 0, branchIndex: -1, depth: 0,
    stratumIndex, angleRad: 0, ring: 0,
    tags: ['hub_plaza', 'safe', 'large', 'no_down', 'force_up'],
  });
  hubNode.layout.x = 0; hubNode.layout.y = 0;
  nodes.set(hubId, hubNode);

  // 3) Critical path — Plaza 가 LR 출구만 가지므로 CP 첫 step 은 L 또는 R 강제.
  //    이후 step 은 D/L/R 자유 zigzag (다이브 메타포 — D 가중치 높음).
  //    제약:
  //      - 첫 step (d=1): L 또는 R (D 금지). L/R 분기와 충돌 시 더 멀리 점프.
  //      - 중간/마지막 step: D/L/R 자유, 같은 LR 연속 회피, occupied 회피.
  //      - col 은 [-3, +3] 안 (Plaza LR 시작 + L/R 분기 너머까지 여유).
  //
  //    L/R 분기는 hub 의 (-d, 0) / (+d, 0) 직선이라 CP 첫 step 이 그것들과
  //    충돌하지 않도록 occupied 에 사전 등록.
  // CP 첫 step 미리 결정 — archetype 의 L/R 비율 반영. spiral 처럼 한쪽 우세
  // archetype 은 첫 step 도 그 우세 방향 70% 정도. 그 외는 L/R 50/50.
  // shrine 위치 (반대편 hub 출구) 가 첫 step 에 종속되므로 미리 결정.
  const lrSum = cpL + cpR;
  const lProb = lrSum > 0 ? cpL / lrSum : 0.5;
  const cpFirstStepDecision: 'L' | 'R' = rng.next() < lProb ? 'L' : 'R';
  const shrineColPre = cpFirstStepDecision === 'L' ? 1 : -1;

  const cpSteps: Array<'D' | 'L' | 'R'> = [];
  const occupied = new Set<string>(['0,0']); // hub
  occupied.add(`${shrineColPre},0`); // shrine — CP zigzag 가 침범 못하게 사전 등록
  for (let d = 1; d <= lLen; d++) occupied.add(`${-d},0`);
  for (let d = 1; d <= rLen; d++) occupied.add(`${d},0`);
  let curCol = 0, curRow = 0;
  for (let d = 1; d <= cpLen; d++) {
    const isFirst = d === 1;
    let chosen: 'D' | 'L' | 'R' = 'D';
    let placed = false;

    if (isFirst) {
      // 첫 step — Plaza LR 출구 활용. cpFirstStepDecision (위에서 미리 결정됨)
      // 사용 — shrine 위치와 일관성 보장.
      chosen = cpFirstStepDecision;
      placed = true;
    } else {
      // 중간/마지막 step — archetype 가중치 사용 (DEC-039 사용자 결정 2026-05-03).
      // RNG 누적 분포로 D/L/R 후보 순서 결정. 가중치 합은 1.0 정규화.
      // 매 step 후 |curCol| <= max(1, stepsLeftAfter) 강제 (보스 col=0 수렴).
      const r = rng.next();
      let order: Array<'D' | 'L' | 'R'>;
      if (r < cpD) {
        order = ['D', 'L', 'R'];
      } else if (r < cpD + cpL) {
        order = ['L', 'D', 'R'];
      } else {
        order = ['R', 'D', 'L'];
      }
      const prevStep = cpSteps[cpSteps.length - 1];
      const stepsLeftAfter = cpLen - d;
      const maxColAfter = Math.max(1, stepsLeftAfter);
      for (const cand of order) {
        if ((cand === 'L' && prevStep === 'L') || (cand === 'R' && prevStep === 'R')) continue;
        let nc = curCol, nr = curRow;
        if (cand === 'D') nr++;
        else if (cand === 'L') nc--;
        else nc++;
        if (Math.abs(nc) > maxColAfter) continue; // col=0 수렴 불가능 → skip
        if (occupied.has(`${nc},${nr}`)) continue;
        chosen = cand;
        placed = true;
        break;
      }
      if (!placed) {
        // Fallback: 모든 자유 후보 막힘 → col 보정 step (curCol 부호 반대) 또는 D.
        if (curCol > 0 && !occupied.has(`${curCol - 1},${curRow}`)) chosen = 'L';
        else if (curCol < 0 && !occupied.has(`${curCol + 1},${curRow}`)) chosen = 'R';
        else chosen = 'D';
      }
    }

    const prevCol = curCol, prevRow = curRow;
    if (chosen === 'D') curRow++;
    else if (chosen === 'L') curCol--;
    else curCol++;
    occupied.add(`${curCol},${curRow}`);
    cpSteps.push(chosen);

    const id = `cp.${d}`;
    const kind: 'corridor' | 'room' = (d % 2 === 1) ? 'corridor' : 'room';
    const angleRad =
      chosen === 'D' ? ANGLE_DOWN :
      chosen === 'L' ? ANGLE_LEFT :
                       ANGLE_RIGHT;
    const node = makeNode({
      id, role: 'spoke', hubIndex: 0, branchIndex: BR_CP, depth: d,
      stratumIndex, angleRad, ring: d * RING_UNIT,
      tags: [kind],
    });
    node.layout.x = curCol; node.layout.y = curRow;
    nodes.set(id, node);

    const prevId = (d === 1) ? hubId : `cp.${d - 1}`;
    const sides = sidesByDelta(curCol - prevCol, curRow - prevRow);
    edges.push(makeEdge(prevId, id, 'tree', sides.from, sides.to));
  }

  // 4) Boss — 사용자 결정 (2026-05-03): 보스 col 은 *반드시* plaza col 과 동일
  //    (= 0). Trapdoor 가 보스 D 영역에 hole 을 뚫으면 그 hole 이 다음 stratum
  //    의 plaza 위로 정확히 떨어져 player 가 plaza 안에 안착한다.
  //
  //    boss step 결정:
  //      - cp.last col == 0 → step D (자동 col=0)
  //      - cp.last col == 1 → step L (보정 col=0)
  //      - cp.last col == -1 → step R (보정 col=0)
  //    cp zigzag 가 |cp.last col| <= 1 보장하므로 1-step 으로 col=0 도달.
  //
  //    'no_down' = D 잠금 (Trapdoor 담당).
  //    'force_lru' = 보스 prefab LRU 변종 강제 (입구 변에 무관하게 통일).
  const bossDepth = cpLen + 1;
  const bossId = 'boss0';
  const bossPrevCol = curCol, bossPrevRow = curRow;
  let bossChosen: 'D' | 'L' | 'R';
  if (curCol === 0) bossChosen = 'D';
  else if (curCol > 0) bossChosen = 'L';
  else bossChosen = 'R';
  if (bossChosen === 'D') curRow++;
  else if (bossChosen === 'L') curCol--;
  else curCol++;
  occupied.add(`${curCol},${curRow}`);
  const bossAngleRad =
    bossChosen === 'D' ? ANGLE_DOWN :
    bossChosen === 'L' ? ANGLE_LEFT :
                         ANGLE_RIGHT;
  const bossNode = makeNode({
    id: bossId, role: 'boss', hubIndex: 0, branchIndex: BR_CP, depth: bossDepth,
    stratumIndex, angleRad: bossAngleRad, ring: bossDepth * RING_UNIT,
    tags: ['boss_chamber', 'no_down', 'force_lru'],
  });
  bossNode.layout.x = curCol; bossNode.layout.y = curRow;
  nodes.set(bossId, bossNode);
  const lastCpId = cpLen >= 1 ? `cp.${cpLen}` : hubId;
  const bossSides = sidesByDelta(curCol - bossPrevCol, curRow - bossPrevRow);
  edges.push(makeEdge(lastCpId, bossId, 'tree', bossSides.from, bossSides.to));

  // 5) Left branch — hub 의 W 방향 spoke 사슬. placement (-d, 0).
  let prevLeft = hubId;
  for (let d = 1; d <= lLen; d++) {
    const id = `l.${d}`;
    const kind: 'corridor' | 'room' = (d % 2 === 1) ? 'corridor' : 'room';
    const node = makeNode({
      id, role: 'spoke', hubIndex: 0, branchIndex: BR_LEFT, depth: d,
      stratumIndex, angleRad: ANGLE_LEFT, ring: d * RING_UNIT,
      tags: [kind],
    });
    node.layout.x = -d; node.layout.y = 0;
    nodes.set(id, node);
    edges.push(makeEdge(prevLeft, id, 'tree', 'left', 'right'));
    prevLeft = id;
  }

  // 6) Right branch — hub 의 E 방향 spoke 사슬. placement (+d, 0). shrine 은 끝에 부착.
  let prevRight = hubId;
  for (let d = 1; d <= rLen; d++) {
    const id = `r.${d}`;
    const kind: 'corridor' | 'room' = (d % 2 === 1) ? 'corridor' : 'room';
    const node = makeNode({
      id, role: 'spoke', hubIndex: 0, branchIndex: BR_RIGHT, depth: d,
      stratumIndex, angleRad: ANGLE_RIGHT, ring: d * RING_UNIT,
      tags: [kind],
    });
    node.layout.x = d; node.layout.y = 0;
    nodes.set(id, node);
    edges.push(makeEdge(prevRight, id, 'tree', 'right', 'left'));
    prevRight = id;
  }

  // 7) Shrine (Archive) — hub 의 CP 첫 step 반대편 출구 (사용자 결정 2026-05-02).
  //    shrineColPre 는 §3 의 occupied 사전 등록과 일관.
  const shrineId = 'shrine';
  const shrineCol = shrineColPre;
  const shrineRow = 0;
  const shrineAngle = cpFirstStepDecision === 'L' ? ANGLE_RIGHT : ANGLE_LEFT;
  const shrineSideOut: ExitSide = cpFirstStepDecision === 'L' ? 'right' : 'left';
  const shrineSideIn: ExitSide = cpFirstStepDecision === 'L' ? 'left' : 'right';
  const shrineParent = hubId;
  const shrineDepth = (nodes.get(shrineParent)?.depth ?? 0) + 1;
  const shrineNode = makeNode({
    id: shrineId, role: 'shrine', hubIndex: 0, branchIndex: -1, depth: shrineDepth,
    stratumIndex, angleRad: shrineAngle, ring: shrineDepth * RING_UNIT,
    tags: ['shrine_alcove', 'safe'],
  });
  shrineNode.layout.x = shrineCol; shrineNode.layout.y = shrineRow;
  nodes.set(shrineId, shrineNode);
  edges.push(makeEdge(shrineParent, shrineId, 'tree', shrineSideOut, shrineSideIn));
  occupied.add(`${shrineCol},${shrineRow}`); // shrine 위치도 branch 회피 대상

  // 7.5) Dead-end branch (DEC-039 사용자 결정 2026-05-03) — CP 노드 일부에서
  //      직선 dead-end 가지가 1..branchMaxDepth 깊이로 뻗어나옴. rarity 가 높을
  //      수록 깊은 가지. RNG 로 CP 순서 셔플 후 각 노드의 free cardinal (L/R
  //      우선, U/D 후순위) 첫 방향으로 부착, 같은 방향 직선 연장.
  //      remaining (branchBudget) 가 소진될 때까지 반복.
  let branchN = 0;
  if (branchBudget > 0 && cpLen > 0 && branchMaxDepth > 0) {
    const cpOrder: number[] = [];
    for (let d = 1; d <= cpLen; d++) cpOrder.push(d);
    for (let i = cpOrder.length - 1; i > 0; i--) {
      const j = rng.nextInt(0, i);
      [cpOrder[i], cpOrder[j]] = [cpOrder[j], cpOrder[i]];
    }
    interface DirCard { dx: number; dy: number; out: ExitSide; in: ExitSide; }
    // L/R 우선 (수평 다양성), U/D 후순위.
    const dirs: DirCard[] = [
      { dx: -1, dy: 0, out: 'left', in: 'right' },
      { dx: 1, dy: 0, out: 'right', in: 'left' },
      { dx: 0, dy: -1, out: 'up', in: 'down' },
      { dx: 0, dy: 1, out: 'down', in: 'up' },
    ];
    let remaining = branchBudget;
    for (const cpDepth of cpOrder) {
      if (remaining <= 0) break;
      const cpId = `cp.${cpDepth}`;
      const cpNode = nodes.get(cpId);
      if (!cpNode) continue;
      const cpCol = cpNode.layout.x;
      const cpRow = cpNode.layout.y;
      // 첫 방향 결정 — L/R 셔플 후 첫 free 셀 방향 채택.
      const dirOrder: DirCard[] = [...dirs];
      if (rng.next() < 0.5) {
        [dirOrder[0], dirOrder[1]] = [dirOrder[1], dirOrder[0]];
      }
      let chosenDir: DirCard | null = null;
      for (const dir of dirOrder) {
        const nc = cpCol + dir.dx;
        const nr = cpRow + dir.dy;
        if (Math.abs(nc) > 3) continue;
        if (nr < 0) continue;
        if (occupied.has(`${nc},${nr}`)) continue;
        chosenDir = dir;
        break;
      }
      if (!chosenDir) continue;

      // 가지 깊이 결정 — 1..min(branchMaxDepth, remaining) RNG.
      const depthCap = Math.min(branchMaxDepth, remaining);
      const targetDepth = 1 + rng.nextInt(0, depthCap - 1);

      // 직선 연장 — 같은 방향으로 targetDepth 까지. 충돌 시 조기 중단.
      let curC = cpCol;
      let curR = cpRow;
      let parentId = cpId;
      const angleRad =
        chosenDir.dx === -1 ? ANGLE_LEFT :
        chosenDir.dx === 1 ? ANGLE_RIGHT :
        chosenDir.dy === -1 ? ANGLE_UP : ANGLE_DOWN;
      for (let bd = 1; bd <= targetDepth; bd++) {
        const nc = curC + chosenDir.dx;
        const nr = curR + chosenDir.dy;
        if (Math.abs(nc) > 3 || nr < 0) break;
        if (occupied.has(`${nc},${nr}`)) break;
        branchN++;
        const id = `b.${branchN}`;
        const kind: 'corridor' | 'room' = (bd % 2 === 1) ? 'corridor' : 'room';
        const bnode = makeNode({
          id, role: 'spoke', hubIndex: 0, branchIndex: BR_DEAD, depth: cpDepth + bd,
          stratumIndex, angleRad, ring: bd,
          tags: [kind, 'dead_end'],
        });
        bnode.layout.x = nc; bnode.layout.y = nr;
        nodes.set(id, bnode);
        edges.push(makeEdge(parentId, id, 'tree', chosenDir.out, chosenDir.in));
        occupied.add(`${nc},${nr}`);
        remaining--;
        if (remaining <= 0) break;
        curC = nc; curR = nr;
        parentId = id;
      }
    }
  }
  // budget 미달 (모든 CP 후보 충돌) — 빠진 만큼 boss/shrine 외 노드 수가 적어
  // validateRoomGraph IWF-R10 가 nodeCount mismatch 로 throw → 그래도 게임은 진행.


  // 8) Critical Path 집합 — hub + CP spoke + boss
  const criticalPathIds = new Set<string>();
  criticalPathIds.add(hubId);
  for (const node of nodes.values()) {
    if (node.role === 'spoke' && node.branchIndex === BR_CP) criticalPathIds.add(node.id);
  }
  criticalPathIds.add(bossId);

  // 9) Polar layout 산출은 폐기 — buildVerticalDive 가 layout.x/y 에 직접 grid
  //    placement 를 저장하므로 overwrite 하지 않는다. Adapter 가 그대로 사용.

  return {
    stratumIndex,
    hubIds: [hubId],
    bossBranchIndex: BR_CP,
    bossId,
    shrineId,
    criticalPathIds,
    nodes,
    edges,
  };
}

// ---------------------------------------------------------------------------
// Validation — DEC-039 invariants 에 맞게 단순화.
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

  // IWF-R17: boss 별도 노드
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

  // DEC-039-V1: hub 는 정확히 1개 ('h0')
  if (g.hubIds.length !== 1 || g.hubIds[0] !== 'h0') {
    throw new Error(`DEC-039-V1: vertical dive requires single hub 'h0', got [${g.hubIds.join(',')}]`);
  }

  // DEC-039-V2: hub 노드는 'force_up' 태그를 가져야 한다 (Plaza LRUD 강제용).
  const hub = g.nodes.get(g.hubIds[0])!;
  if (!hub.tags.includes('force_up')) {
    throw new Error(`DEC-039-V2: hub must carry 'force_up' tag`);
  }

  // DEC-039-V3: boss 노드는 'no_down' 태그를 가져야 한다 (Trapdoor entity 가 담당).
  if (!bossNode.tags.includes('no_down')) {
    throw new Error(`DEC-039-V3: boss must carry 'no_down' tag`);
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

/** placement delta (dx, dy) → 출구 면 (from = parent's side, to = child's side). */
function sidesByDelta(dx: number, dy: number): { from: ExitSide; to: ExitSide } {
  if (dx === 1 && dy === 0) return { from: 'right', to: 'left' };
  if (dx === -1 && dy === 0) return { from: 'left', to: 'right' };
  if (dx === 0 && dy === 1) return { from: 'down', to: 'up' };
  if (dx === 0 && dy === -1) return { from: 'up', to: 'down' };
  // Non-cardinal-adjacent — 발생하면 안 되지만 안전하게 down 으로 fallback.
  return { from: 'down', to: 'up' };
}

function bfsReach(g: RoomGraphData, startId: string): Set<string> {
  const visited = new Set<string>();
  const adj = new Map<string, string[]>();
  for (const e of g.edges) {
    if (!adj.has(e.a)) adj.set(e.a, []);
    if (!adj.has(e.b)) adj.set(e.b, []);
    adj.get(e.a)!.push(e.b);
    adj.get(e.b)!.push(e.a);
  }
  const queue = [startId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const next = adj.get(id) ?? [];
    for (const n of next) if (!visited.has(n)) queue.push(n);
  }
  return visited;
}

// Re-export utility values for any downstream code that may depend on them.
// (Currently unused outside this module but kept for symmetry with HEAD.)
export const _ANGLES = { DOWN: ANGLE_DOWN, UP: ANGLE_UP, LEFT: ANGLE_LEFT, RIGHT: ANGLE_RIGHT } as const;
