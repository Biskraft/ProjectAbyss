/**
 * PrologueDive.ts — Ch.0 프롤로그 아이템계의 *강제* 다이브 레이아웃.
 *
 * 절차적 ItemWorldScene 은 무기 기질로 그래프를 랜덤 생성하지만, 프롤로그
 * (scene='prologue') 는 손으로 authoring 된 4 룸 사슬을 강제한다:
 *
 *          col0    col1
 *   row0:   01      02      01 →(R)→ 02
 *   row1:   04      03      02 →(D)→ 03 →(L)→ 04
 *
 * 즉 사용자 지정 경로 01(우)-02(하)-03(좌)-04.
 *
 * 각 cell.exits 는 authored LDtk 템플릿의 실제 출구와 *동일하게* 세팅한다.
 * 그래야 placement 강제맵(cell→template)이 picker 의 strict sameExitSet 매칭을
 * 통과한다. authored 출구(2026-06-04 런타임 확인):
 *   Prologue_01 = R,U   (U = 다이브 천장 입구)  · roomType Start
 *   Prologue_02 = L,R,D (R = 여분 개구부)        · roomType Start
 *   Prologue_03 = L,U                            · roomType Start
 *   Prologue_04 = R                              · roomType Boss
 *
 * roomGraphs 는 F2/?debug=graph 오버레이 전용이라 시각화용 4 노드 그래프를 같이 만든다.
 */

import type { LdtkLevel } from '@level/LdtkLoader';
import type { RoomType, UnifiedGridData, UnifiedRoomCell } from '@level/RoomGrid';
import type { RoomEdge, RoomGraphData, RoomNode } from '@level/RoomGraph';

type Exits = { left: boolean; right: boolean; up: boolean; down: boolean };

interface PrologueRoomDef {
  templateId: string;
  nodeId: string;
  col: number;
  row: number;
  exits: Exits;
  role: 'hub' | 'spoke' | 'boss';
}

// 순서 = 진행 순서(01→02→03→04). 인접 col/row 가 출구 방향과 일치해야 한다.
const PROLOGUE_ROOMS: readonly PrologueRoomDef[] = [
  { templateId: 'ItemStratum_Prologue_01', nodeId: 'h0',   col: 0, row: 0, role: 'hub',
    exits: { left: false, right: true,  up: true,  down: false } },
  { templateId: 'ItemStratum_Prologue_02', nodeId: 'cp1',  col: 1, row: 0, role: 'spoke',
    exits: { left: true,  right: true,  up: false, down: true  } },
  { templateId: 'ItemStratum_Prologue_03', nodeId: 'cp2',  col: 1, row: 1, role: 'spoke',
    exits: { left: true,  right: false, up: true,  down: false } },
  { templateId: 'ItemStratum_Prologue_04', nodeId: 'boss', col: 0, row: 1, role: 'boss',
    exits: { left: false, right: true,  up: false, down: false } },
];

/** RoomGraphAdapter.deriveRoomType 와 동일 규칙 (시각 door 배치 힌트). */
function deriveType(exits: Exits, role: 'hub' | 'spoke' | 'boss'): RoomType {
  if (role === 'boss') return 4;
  if (exits.up && exits.down) return 4;
  if (exits.down) return 2;
  if (exits.up && !exits.down) return 3;
  if (exits.left || exits.right) return 1;
  return 0;
}

/** 모든 프롤로그 템플릿이 풀에 존재하는가. */
export function hasPrologueTemplates(templates: readonly LdtkLevel[]): boolean {
  return PROLOGUE_ROOMS.every(r => templates.some(t => t.identifier === r.templateId));
}

export interface PrologueDive {
  unifiedGrid: UnifiedGridData;
  graphs: RoomGraphData[];
  /** col:absRow → 강제 템플릿. picker 의 memory-placement 경로로 주입. */
  placements: Map<string, LdtkLevel>;
}

/**
 * 프롤로그 강제 다이브 그리드/그래프/placement 를 만든다.
 * 템플릿이 하나라도 없으면 null (호출 측이 절차 생성으로 fallback).
 */
export function buildPrologueDive(templates: readonly LdtkLevel[]): PrologueDive | null {
  const byId = new Map(templates.map(t => [t.identifier, t]));
  if (!PROLOGUE_ROOMS.every(r => byId.has(r.templateId))) return null;

  const totalWidth = 2;
  const totalHeight = 2;
  const cells: (UnifiedRoomCell | null)[][] = [
    [null, null],
    [null, null],
  ];
  const placements = new Map<string, LdtkLevel>();
  const nodes = new Map<string, RoomNode>();
  const criticalPathIds = new Set<string>();

  for (const r of PROLOGUE_ROOMS) {
    const cell: UnifiedRoomCell = {
      col: r.col,
      row: r.row,
      type: deriveType(r.exits, r.role),
      onCriticalPath: true,
      exits: { ...r.exits },
      visited: false,
      cleared: false,
      role: r.role,
      stratumIndex: 0,
      absoluteRow: r.row,
    };
    cells[r.row][r.col] = cell;
    placements.set(`${r.col}:${r.row}`, byId.get(r.templateId)!);

    nodes.set(r.nodeId, {
      id: r.nodeId,
      role: r.role,
      hubIndex: 0,
      branchIndex: 0,
      depth: r.nodeId === 'h0' ? 0 : 1,
      stratumIndex: 0,
      layout: { angleRad: 0, ring: 0, x: r.col, y: r.row },
      tags: [],
      visited: false,
      cleared: false,
    });
    criticalPathIds.add(r.nodeId);
  }

  // 사슬 엣지: 01→02 (R/L), 02→03 (D/U), 03→04 (L/R).
  const edges: RoomEdge[] = [
    { a: 'h0',  b: 'cp1',  kind: 'tree', sideA: 'right', sideB: 'left' },
    { a: 'cp1', b: 'cp2',  kind: 'tree', sideA: 'down',  sideB: 'up'   },
    { a: 'cp2', b: 'boss', kind: 'tree', sideA: 'left',  sideB: 'right' },
  ];

  const graph: RoomGraphData = {
    stratumIndex: 0,
    hubIds: ['h0'],
    bossBranchIndex: 0,
    bossId: 'boss',
    shrineId: null,
    criticalPathIds,
    nodes,
    edges,
  };

  const unifiedGrid: UnifiedGridData = {
    totalWidth,
    totalHeight,
    cells,
    strataOffsets: [{ rowOffset: 0, width: totalWidth, height: totalHeight }],
    stratumStartRooms: [{ col: 0, absoluteRow: 0, stratumIndex: 0 }],
    stratumEndRooms: [{ col: 0, absoluteRow: 1, stratumIndex: 0 }],
    startRoom: { col: 0, absoluteRow: 0 },
    endRoom: { col: 0, absoluteRow: 1 },
  };

  return { unifiedGrid, graphs: [graph], placements };
}
