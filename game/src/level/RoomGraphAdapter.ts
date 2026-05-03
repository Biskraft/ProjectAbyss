/**
 * RoomGraphAdapter.ts — DEC-039 Vertical Dive embedding.
 *
 * RoomGraphData → UnifiedGridData. 각 stratum 의 vertical dive 그래프를 직접
 * (col, row) 그리드에 매핑한 뒤, stratum 들을 세로로 stack 한다.
 *
 * 매핑 룰 (vertical dive 단일 형상):
 *   hub (Plaza)         → (0, 0)
 *   CP spoke d=1..cpLen → (0, d)
 *   boss                → (0, cpLen + 1)
 *   L branch d=1..lLen  → (-d, 0)
 *   R branch d=1..rLen  → (+d, 0)
 *   shrine (Archive)    → 부착 방향으로 한 칸 더 (R 끝 / L 끝 / hub 옆)
 *
 * Cell.exits 는 (a) 그리드 인접한 RoomEdge 에서 자동 도출 + (b) 노드 태그
 * ('no_up' / 'no_down') 로 강제 잠금. Plaza 는 'no_up' 으로 U 영구 잠금
 * (천장 파괴 시각이 LDtk 측 책임), Boss 는 'no_down' 으로 D 영구 잠금
 * (처치 후 Trapdoor entity 가 다음 Plaza 로의 전이 담당).
 *
 * DEC-039 폐기:
 *   - tryGridEmbedRadial (radial 임베딩) — vertical dive 는 단일 형상이라 불필요
 *   - linearEmbed (선형 fallback) — vertical dive 는 항상 임베딩 가능
 *   - stitchInterStrataCorridors (지층 간 물리 통로) — Trapdoor 포탈이 전이 담당
 */

import type { RoomCell, RoomType, UnifiedGridData, UnifiedRoomCell, StratumBound } from '@level/RoomGrid';
import type { StratumDef, TopologyKind } from '@data/StrataConfig';
import type { ExitSide, NodeRole, RoomEdge, RoomGraphData, RoomNode } from '@level/RoomGraph';
import { generateRoomGraph, validateRoomGraph } from '@level/RoomGraph';
import type { Archetype } from '@level/RoomGraphArchetypes';

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
  hubLocal: Placement;
  bossLocal: Placement;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function generateUnifiedGridFromGraph(
  strataDefs: StratumDef[],
  itemUid: number,
  topologyOverride?: TopologyKind,
  archetype: Archetype = 'zigzag',
): { unifiedGrid: UnifiedGridData; graphs: RoomGraphData[] } {
  const layouts: StratumLayout[] = strataDefs.map((def, si) => {
    const graph = generateRoomGraph(def, itemUid, si, topologyOverride, archetype);
    try { validateRoomGraph(graph, def); }
    catch (err) { console.warn(`[RoomGraphAdapter] stratum ${si} validation failed`, err); }

    const layout = embedVertical(graph);

    // Debug overlay (F2) reads node.layout.x/y — overwrite with grid coords.
    for (const [nodeId, p] of layout.placements) {
      const node = graph.nodes.get(nodeId);
      if (node) {
        node.layout.x = p.col;
        node.layout.y = p.row;
      }
    }
    return layout;
  });
  const graphs = layouts.map(l => l.graph);

  // DEC-039 (사용자 결정 2026-05-03): 모든 stratum 의 plaza absolute col 을
  // 동일하게 align. RoomGraph 가 보스 col == plaza col (= 0 local) 을 보장하므로
  // plaza align 만 하면 보스 col 도 자동 정렬 → trapdoor hole 이 다음 stratum
  // plaza 위에 정확히 떨어진다.
  //
  // colOffset[si] = targetPlazaCol - hubLocal.col[si]
  // targetPlazaCol = max(hubLocal.col) — 모든 stratum 에 충분한 좌측 여유
  const targetPlazaCol = Math.max(0, ...layouts.map(l => l.hubLocal.col));
  const colOffsets = layouts.map(l => targetPlazaCol - l.hubLocal.col);

  // totalWidth = max(width + colOffset across all stratums)
  const totalWidth = Math.max(1, ...layouts.map((l, i) => l.width + colOffsets[i]));
  const totalHeight = layouts.reduce((sum, l) => sum + l.height, 0);

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
    const colOffset = colOffsets[si];
    strataOffsets.push({ rowOffset, width: layout.width + colOffset, height: layout.height });

    const edgeMap = buildEdgeMap(layout.graph.edges);

    for (const [nodeId, p] of layout.placements) {
      const node = layout.graph.nodes.get(nodeId);
      if (!node) continue;
      const absRow = rowOffset + p.row;
      const absCol = p.col + colOffset;
      if (absRow < 0 || absRow >= totalHeight) continue;
      if (absCol < 0 || absCol >= totalWidth) continue;

      const exits = deriveExitsFromEdges(nodeId, edgeMap, layout.placements);
      // DEC-039: 노드 태그로 출구 강제 토글.
      //   Plaza ('force_up')   → U 영구 개방. LDtk LRUD 변종 강제 매칭.
      //   Boss  ('no_down')    → D 영구 잠금 (Trapdoor entity 가 전이 담당).
      //   Boss  ('force_lru')  → L+R+U 강제 개방. 마지막 CP step 이 D/L/R 무엇이든
      //                          보스 prefab 은 항상 LRU 변종으로 통일 매칭.
      if (node.tags.includes('force_up')) exits.up = true;
      if (node.tags.includes('no_down')) exits.down = false;
      if (node.tags.includes('force_lru')) { exits.left = true; exits.right = true; exits.up = true; }

      const onCp = layout.graph.criticalPathIds.has(nodeId);
      let kind: 'corridor' | 'room' | undefined;
      if (node.tags.includes('corridor')) kind = 'corridor';
      else if (node.tags.includes('room')) kind = 'room';
      const base: RoomCell = {
        col: absCol,
        row: absRow,
        type: deriveRoomType(exits, node.role) as RoomType,
        onCriticalPath: onCp,
        exits,
        visited: false,
        cleared: false,
        kind,
        role: node.role,
      };
      cells[absRow][absCol] = {
        ...base,
        absoluteRow: absRow,
        stratumIndex: si,
      };
    }

    stratumStartRooms.push({
      col: layout.hubLocal.col + colOffset,
      absoluteRow: rowOffset + layout.hubLocal.row,
      stratumIndex: si,
    });
    stratumEndRooms.push({
      col: layout.bossLocal.col + colOffset,
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

  // DEC-039: 지층 간 corridor stitching 폐기. 각 지층은 독립된 섬으로 unified
  // grid 에 stack 만 되며, 보스 처치 후 Trapdoor entity 가 다음 Plaza 로 텔레포트
  // 시킨다 (ItemWorldScene 의 descent_fall 시퀀스).

  const unifiedGrid: UnifiedGridData = {
    totalWidth,
    totalHeight,
    cells,
    strataOffsets,
    stratumEndRooms,
    stratumStartRooms,
    startRoom,
    endRoom,
  };
  return { unifiedGrid, graphs };
}

// ---------------------------------------------------------------------------
// Vertical dive embedding — 직접 좌표 매핑.
// ---------------------------------------------------------------------------

/**
 * 노드를 (col, row) 격자에 매핑한다. DEC-039 zigzag CP 채택 후 RoomGraph 의
 * buildVerticalDive 가 각 노드의 layout.x/y 에 직접 grid placement 를 저장한다.
 * 본 함수는 그 값을 placements 에 복사할 뿐.
 *
 * Pre-translation 좌표는 RoomGraph 가 결정 (hub=(0,0), CP=zigzag, L/R=±d, boss=
 * 마지막 CP 의 D 방향, shrine=R/L/hub alcove). 본 함수는 bbox translation 만 수행.
 */
function embedVertical(graph: RoomGraphData): StratumLayout {
  const placements = new Map<string, Placement>();

  for (const node of graph.nodes.values()) {
    placements.set(node.id, {
      col: Math.round(node.layout.x),
      row: Math.round(node.layout.y),
    });
  }

  // 7) Bbox 계산 + 평행이동
  let minCol = Infinity, maxCol = -Infinity, minRow = Infinity, maxRow = -Infinity;
  for (const p of placements.values()) {
    if (p.col < minCol) minCol = p.col;
    if (p.col > maxCol) maxCol = p.col;
    if (p.row < minRow) minRow = p.row;
    if (p.row > maxRow) maxRow = p.row;
  }
  if (!isFinite(minCol)) { minCol = 0; maxCol = 0; minRow = 0; maxRow = 0; }
  const tx = -minCol;
  const ty = -minRow;
  for (const [id, p] of placements) {
    placements.set(id, { col: p.col + tx, row: p.row + ty });
  }
  const width = maxCol - minCol + 1;
  const height = maxRow - minRow + 1;

  const hubLocal = placements.get('h0') ?? { col: 0, row: 0 };
  const bossLocal = placements.get(graph.bossId) ?? hubLocal;

  return { graph, placements, width, height, hubLocal, bossLocal };
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
    if (dx === 1 && dy === 0) exits.right = true;
    else if (dx === -1 && dy === 0) exits.left = true;
    else if (dx === 0 && dy === 1) exits.down = true;
    else if (dx === 0 && dy === -1) exits.up = true;
    // Non-cardinal-adjacent edges 는 vertical dive 임베딩에서 발생하지 않는다.
  }
  return exits;
}

// ---------------------------------------------------------------------------
// Room type
// ---------------------------------------------------------------------------

/** Match RoomGrid.determineRoomType: 0=dead-end, 1=LR, 2=LRD(down), 3=LRU(up), 4=LRUD.
 *  R2: boss rooms → always LRUD arena (시각 연속). */
function deriveRoomType(
  exits: { left: boolean; right: boolean; up: boolean; down: boolean },
  role?: NodeRole,
): number {
  if (role === 'boss') return 4;
  if (exits.up && exits.down) return 4;
  if (exits.down) return 2;
  if (exits.up && !exits.down) return 3;
  if (exits.left || exits.right) return 1;
  return 0;
}
