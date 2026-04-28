/**
 * RoomGraphAdapter.ts — DEC-037 PR-C2.
 *
 * RoomGraphData → UnifiedGridData. 가능한 경우 방사형 그리드 임베딩
 * (hub 중앙 + 가지를 동서남북으로), 불가하면 선형 fallback.
 *
 * 방사형 임베딩 적용 조건:
 *   - hubCount === 1 (multi_hub Ancient 는 fallback)
 *   - branchCount ≤ 4. shrine 은 빈 카디널 슬롯이 없으면 임베딩에서 제외.
 *
 * 적용 매트릭스:
 *   normal   (branch=2) → 방사형 ✓ (shrine 1 슬롯 사용)
 *   magic    (branch=3) → 방사형 ✓ (shrine 1 슬롯 사용)
 *   rare     (branch=4) → 방사형 ✓ (4 카디널 모두 분기, shrine 생략)
 *   legendary(branch=5) → 선형 fallback
 *   ancient  (branch=6, multi_hub) → 선형 fallback
 *
 * Cell.exits 는 RoomEdge 에서 파생. 그리드 인접 셀 간 edge 가 매핑되면
 * 해당 면이 열림 (left/right/up/down). 임베딩 알고리즘이 모든 edge 가
 * cardinal 1-step adjacency 를 만족하도록 보장.
 *
 * Diagonal/8-cardinal 확장 노트: 진짜 대각선 분기는 브리지 셀을 통한 L-bend
 * 가 필요하며, 현재 deriveRoomType 이 4-way (LRUD) 를 지원하지 않아 미구현.
 * Legendary/Ancient 는 차후 PR 에서 다룬다.
 */

import type { RoomCell, RoomType, UnifiedGridData, UnifiedRoomCell, StratumBound } from '@level/RoomGrid';
import type { StratumDef } from '@data/StrataConfig';
import type { ExitSide, RoomEdge, RoomGraphData, RoomNode } from '@level/RoomGraph';
import { generateRoomGraph, validateRoomGraph } from '@level/RoomGraph';

interface Placement {
  col: number;
  row: number; // local within stratum
}

interface StratumLayout {
  graph: RoomGraphData;
  /** Local-space placements (rows starting at 0 within this stratum). */
  placements: Map<string, Placement>;
  width: number;
  height: number;
  /** Local hub row/col for stratum start. */
  hubLocal: Placement;
  /** Local boss row/col for stratum end. */
  bossLocal: Placement;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function generateUnifiedGridFromGraph(
  strataDefs: StratumDef[],
  itemUid: number,
): UnifiedGridData {
  const layouts: StratumLayout[] = strataDefs.map((def, si) => {
    const graph = generateRoomGraph(def, itemUid, si);
    try { validateRoomGraph(graph, def); }
    catch (err) { console.warn(`[RoomGraphAdapter] stratum ${si} validation failed`, err); }

    const radial = tryGridEmbedRadial(graph);
    return radial ?? linearEmbed(graph);
  });

  // 2) Stack strata vertically; total width = max stratum width.
  const totalWidth = Math.max(1, ...layouts.map(l => l.width));
  const totalHeight = layouts.reduce((sum, l) => sum + l.height, 0);

  // 3) Allocate cells matrix
  const cells: (UnifiedRoomCell | null)[][] = [];
  for (let r = 0; r < totalHeight; r++) {
    const row: (UnifiedRoomCell | null)[] = [];
    for (let c = 0; c < totalWidth; c++) row.push(null);
    cells.push(row);
  }

  const strataOffsets: StratumBound[] = [];
  const stratumStartRooms: UnifiedGridData['stratumStartRooms'] = [];
  const stratumEndRooms: UnifiedGridData['stratumEndRooms'] = [];

  let rowOffset = 0;
  for (let si = 0; si < layouts.length; si++) {
    const layout = layouts[si];
    strataOffsets.push({ rowOffset, width: layout.width, height: layout.height });

    // Pre-build edge lookup: nodeId → [(connected nodeId, side from this node)]
    const edgeMap = buildEdgeMap(layout.graph.edges);

    // Place each node into the unified grid
    for (const [nodeId, p] of layout.placements) {
      const node = layout.graph.nodes.get(nodeId);
      if (!node) continue;
      const absRow = rowOffset + p.row;
      if (absRow < 0 || absRow >= totalHeight) continue;
      if (p.col < 0 || p.col >= totalWidth) continue;

      const exits = deriveExitsFromEdges(nodeId, edgeMap, layout.placements);
      const onCp = layout.graph.criticalPathIds.has(nodeId);
      const base: RoomCell = {
        col: p.col,
        row: absRow,
        type: deriveRoomType(exits) as RoomType,
        onCriticalPath: onCp,
        exits,
        visited: false,
        cleared: false,
      };
      cells[absRow][p.col] = {
        ...base,
        absoluteRow: absRow,
        stratumIndex: si,
      };
    }

    stratumStartRooms.push({
      col: layout.hubLocal.col,
      absoluteRow: rowOffset + layout.hubLocal.row,
      stratumIndex: si,
    });
    stratumEndRooms.push({
      col: layout.bossLocal.col,
      absoluteRow: rowOffset + layout.bossLocal.row,
      stratumIndex: si,
    });

    rowOffset += layout.height;
  }

  const startRoom = stratumStartRooms[0]
    ? { col: stratumStartRooms[0].col, absoluteRow: stratumStartRooms[0].absoluteRow }
    : { col: 0, absoluteRow: 0 };
  const endRoom = stratumEndRooms[stratumEndRooms.length - 1]
    ? {
        col: stratumEndRooms[stratumEndRooms.length - 1].col,
        absoluteRow: stratumEndRooms[stratumEndRooms.length - 1].absoluteRow,
      }
    : { col: 0, absoluteRow: 0 };

  return {
    totalWidth,
    totalHeight,
    cells,
    strataOffsets,
    stratumEndRooms,
    stratumStartRooms,
    startRoom,
    endRoom,
  };
}

// ---------------------------------------------------------------------------
// Radial grid embedding (single hub, branchCount ≤ 3)
// ---------------------------------------------------------------------------

interface Cardinal {
  dx: number;
  dy: number;
  key: 'E' | 'S' | 'W' | 'N';
  /** Target angle in radians (PixiJS y+ down convention). */
  targetAngle: number;
}

const ALL_CARDINALS: Cardinal[] = [
  { dx: 1, dy: 0, key: 'E', targetAngle: 0 },
  { dx: 0, dy: 1, key: 'S', targetAngle: Math.PI / 2 },
  { dx: -1, dy: 0, key: 'W', targetAngle: Math.PI },
  { dx: 0, dy: -1, key: 'N', targetAngle: 3 * Math.PI / 2 },
];

function tryGridEmbedRadial(graph: RoomGraphData): StratumLayout | null {
  if (graph.hubIds.length !== 1) return null;

  // Group spokes/boss by branch
  const branchNodes = new Map<number, RoomNode[]>();
  for (const node of graph.nodes.values()) {
    if (node.role === 'spoke' || node.role === 'boss') {
      if (node.branchIndex < 0) continue;
      if (!branchNodes.has(node.branchIndex)) branchNodes.set(node.branchIndex, []);
      branchNodes.get(node.branchIndex)!.push(node);
    }
  }
  for (const arr of branchNodes.values()) {
    arr.sort((a, b) => a.depth - b.depth);
  }

  const branchCount = branchNodes.size;
  // 4 cardinals available. branchCount=4 이면 shrine 자리 없음 → shrine 생략하고 진행.
  if (branchCount > 4) return null;

  // Determine max branch length to size the grid
  let maxLen = 0;
  for (const arr of branchNodes.values()) {
    if (arr.length > maxLen) maxLen = arr.length;
  }

  // Hub at center; grid size = (2*maxLen + 1) per axis (allows extension in both dirs)
  const gridRadius = maxLen;
  const cx = gridRadius;
  const cy = gridRadius;
  const width = 2 * gridRadius + 1;
  const height = 2 * gridRadius + 1;

  const placements = new Map<string, Placement>();
  placements.set(graph.hubIds[0], { col: cx, row: cy });

  // Assign each branch to a cardinal direction (closest by angle, no collision)
  const usedCardinals = new Set<string>();
  const sortedBranches = Array.from(branchNodes.keys()).sort((a, b) => a - b);
  for (const bi of sortedBranches) {
    const nodes = branchNodes.get(bi)!;
    if (nodes.length === 0) continue;
    const repAngle = nodes[0].layout.angleRad;
    const card = pickFreeCardinal(repAngle, usedCardinals);
    if (!card) return null; // shouldn't happen since branchCount ≤ 3
    usedCardinals.add(card.key);
    for (const node of nodes) {
      placements.set(node.id, {
        col: cx + card.dx * node.depth,
        row: cy + card.dy * node.depth,
      });
    }
  }

  // Shrine: 빈 카디널이 있으면 hub-adjacent 에 배치, 없으면 그리드에서 생략.
  // 그래프에서는 여전히 존재하지만 이 지층에서는 미방문 셀로 처리.
  if (graph.shrineId) {
    const shrineNode = graph.nodes.get(graph.shrineId);
    const angle = shrineNode?.layout.angleRad ?? 0;
    const card = pickFreeCardinal(angle, usedCardinals);
    if (card) {
      placements.set(graph.shrineId, { col: cx + card.dx, row: cy + card.dy });
    }
  }

  // Hub local + boss local
  const hubLocal = { col: cx, row: cy };
  const bossNode = graph.nodes.get(graph.bossId);
  const bossLocal = bossNode ? placements.get(bossNode.id) ?? hubLocal : hubLocal;

  return { graph, placements, width, height, hubLocal, bossLocal };
}

function pickFreeCardinal(angle: number, used: Set<string>): Cardinal | null {
  const a = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const ranked = ALL_CARDINALS
    .map(c => {
      const t = c.targetAngle;
      const d1 = Math.abs(a - t);
      const d2 = Math.abs(a - t - 2 * Math.PI);
      const d3 = Math.abs(a - t + 2 * Math.PI);
      return { card: c, dist: Math.min(d1, d2, d3) };
    })
    .sort((x, y) => x.dist - y.dist);
  for (const r of ranked) if (!used.has(r.card.key)) return r.card;
  return null;
}

// ---------------------------------------------------------------------------
// Linear fallback (used when radial embedding refuses)
// ---------------------------------------------------------------------------

function linearEmbed(graph: RoomGraphData): StratumLayout {
  const order = linearizeGraph(graph);
  const placements = new Map<string, Placement>();
  for (let i = 0; i < order.length; i++) {
    placements.set(order[i].id, { col: i, row: 0 });
  }
  const hubNode = graph.nodes.get(graph.hubIds[0]);
  const hubIndex = hubNode ? order.indexOf(hubNode) : 0;
  const bossNode = graph.nodes.get(graph.bossId);
  const bossIndex = bossNode ? order.indexOf(bossNode) : order.length - 1;

  return {
    graph,
    placements,
    width: order.length,
    height: 1,
    hubLocal: { col: Math.max(0, hubIndex), row: 0 },
    bossLocal: { col: Math.max(0, bossIndex), row: 0 },
  };
}

function linearizeGraph(g: RoomGraphData): RoomNode[] {
  const adj = buildUndirectedAdjacency(g);
  const skip = new Set<string>();
  if (g.bossId) skip.add(g.bossId);
  if (g.shrineId) skip.add(g.shrineId);

  const visited = new Set<string>();
  const result: RoomNode[] = [];

  const dfs = (startId: string) => {
    const stack: string[] = [startId];
    while (stack.length > 0) {
      const id = stack.pop()!;
      if (visited.has(id) || skip.has(id)) continue;
      const node = g.nodes.get(id);
      if (!node) continue;
      visited.add(id);
      result.push(node);
      const neighbors = (adj.get(id) ?? []).slice().sort();
      for (let i = neighbors.length - 1; i >= 0; i--) stack.push(neighbors[i]);
    }
  };

  for (const hubId of g.hubIds) {
    if (!visited.has(hubId)) dfs(hubId);
  }
  if (g.shrineId) {
    const sh = g.nodes.get(g.shrineId);
    if (sh) result.push(sh);
  }
  if (g.bossId) {
    const bs = g.nodes.get(g.bossId);
    if (bs) result.push(bs);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Edge → exits derivation
// ---------------------------------------------------------------------------

function buildEdgeMap(edges: RoomEdge[]): Map<string, { other: string; from: ExitSide }[]> {
  const map = new Map<string, { other: string; from: ExitSide }[]>();
  const push = (id: string, other: string, from: ExitSide) => {
    if (!map.has(id)) map.set(id, []);
    map.get(id)!.push({ other, from });
  };
  for (const e of edges) {
    push(e.a, e.b, e.sideA);
    push(e.b, e.a, e.sideB);
  }
  return map;
}

function deriveExitsFromEdges(
  nodeId: string,
  edgeMap: Map<string, { other: string; from: ExitSide }[]>,
  placements: Map<string, Placement>,
): { left: boolean; right: boolean; up: boolean; down: boolean } {
  const exits = { left: false, right: false, up: false, down: false };
  const me = placements.get(nodeId);
  if (!me) return exits;
  const incident = edgeMap.get(nodeId) ?? [];
  for (const inc of incident) {
    const other = placements.get(inc.other);
    if (!other) continue;
    const dx = other.col - me.col;
    const dy = other.row - me.row;
    // Trust placements over edge.sideA/sideB metadata for actual grid layout.
    if (dx === 1 && dy === 0) exits.right = true;
    else if (dx === -1 && dy === 0) exits.left = true;
    else if (dx === 0 && dy === 1) exits.down = true;
    else if (dx === 0 && dy === -1) exits.up = true;
    // Non-cardinal-adjacent edges are silently dropped (room transition will
    // not work for that pair). Should not occur for current embedding.
  }
  return exits;
}

function buildUndirectedAdjacency(g: RoomGraphData): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const id of g.nodes.keys()) map.set(id, []);
  for (const e of g.edges) {
    map.get(e.a)?.push(e.b);
    map.get(e.b)?.push(e.a);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Room type
// ---------------------------------------------------------------------------

/** Match RoomGrid.determineRoomType: 0=dead-end, 1=LR, 2=LRD(down), 3=LRU(up). */
function deriveRoomType(exits: { left: boolean; right: boolean; up: boolean; down: boolean }): number {
  if (exits.down) return 2;
  if (exits.up && !exits.down) return 3;
  if (exits.left || exits.right) return 1;
  return 0;
}
