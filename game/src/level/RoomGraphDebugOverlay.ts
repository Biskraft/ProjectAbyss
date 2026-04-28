/**
 * RoomGraphDebugOverlay.ts — DEC-037 PR-B 디버그 시각화.
 *
 * RoomGraphData[] 를 받아 풀스크린 패널에 모든 지층 그래프를 수직 스택으로 렌더.
 * 게임 로직/렌더 파이프라인 무수정 — 시드별 결과 시각 검증 전용.
 *
 * 토글: ItemWorldScene 의 F2 키 + ?debug=graph URL 플래그.
 *
 * 색상 규약:
 *   role=hub     주황 #FF8000
 *   role=spoke   청록 #5FE7FF
 *   role=boss    빨강 #FF4444
 *   role=shrine  연두 #88FF88
 *   edge tree    흰  #FFFFFF (alpha 0.6)
 *   edge multi_hub 노랑 #FFD23F (alpha 0.9)
 *   Critical Path 주황 외곽선 (노드/에지에 덧칠)
 */

import { Container, Graphics, Text } from 'pixi.js';
import type { RoomGraphData, RoomNode } from '@level/RoomGraph';

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

const NODE_RADIUS = 10;
const RING_PIXELS = 56; // 1 ring = 56px in overlay
const STRATUM_LABEL_HEIGHT = 22;
const STRATUM_GAP = 28;
const PANEL_PADDING = 24;
const BG_COLOR = 0x0a0a14;
const BG_ALPHA = 0.92;

const COLOR_HUB = 0xff8000;
const COLOR_SPOKE = 0x5fe7ff;
const COLOR_BOSS = 0xff4444;
const COLOR_SHRINE = 0x88ff88;
const COLOR_EDGE_TREE = 0xffffff;
const COLOR_EDGE_MULTI = 0xffd23f;
const COLOR_CP = 0xff8000;
const COLOR_TEXT = 0xeeeeee;

function nodeColor(role: RoomNode['role']): number {
  switch (role) {
    case 'hub': return COLOR_HUB;
    case 'spoke': return COLOR_SPOKE;
    case 'boss': return COLOR_BOSS;
    case 'shrine': return COLOR_SHRINE;
  }
}

// ---------------------------------------------------------------------------
// Per-stratum bounds (in ring-units)
// ---------------------------------------------------------------------------

interface Bounds {
  minX: number; maxX: number; minY: number; maxY: number;
}

function computeBounds(g: RoomGraphData): Bounds {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const n of g.nodes.values()) {
    if (n.layout.x < minX) minX = n.layout.x;
    if (n.layout.x > maxX) maxX = n.layout.x;
    if (n.layout.y < minY) minY = n.layout.y;
    if (n.layout.y > maxY) maxY = n.layout.y;
  }
  if (!Number.isFinite(minX)) { minX = 0; maxX = 0; minY = 0; maxY = 0; }
  return { minX, maxX, minY, maxY };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build a self-contained Container that renders all strata as a single
 * scrollable column. Caller is responsible for visibility toggling and
 * positioning.
 */
export function createRoomGraphDebugOverlay(
  graphs: RoomGraphData[],
  rarity: string,
  itemUid: number,
  screenWidth: number,
  screenHeight: number,
): Container {
  const root = new Container();

  // Dim background
  const bg = new Graphics();
  bg.rect(0, 0, screenWidth, screenHeight).fill({ color: BG_COLOR, alpha: BG_ALPHA });
  root.addChild(bg);

  // Header
  const header = new Text({
    text: `RoomGraph debug — rarity=${rarity}, uid=${itemUid}, strata=${graphs.length}   [F2: hide]`,
    style: { fill: COLOR_TEXT, fontFamily: 'monospace', fontSize: 14 },
  });
  header.x = PANEL_PADDING;
  header.y = PANEL_PADDING;
  root.addChild(header);

  // Legend
  const legend = new Text({
    text: 'hub=orange  spoke=cyan  boss=red  shrine=green   edge tree=white  multi_hub=yellow   CP=orange ring',
    style: { fill: 0x999999, fontFamily: 'monospace', fontSize: 11 },
  });
  legend.x = PANEL_PADDING;
  legend.y = PANEL_PADDING + 18;
  root.addChild(legend);

  let cursorY = PANEL_PADDING + 50;

  for (let i = 0; i < graphs.length; i++) {
    const g = graphs[i];
    const stratumPanel = renderStratumPanel(g, screenWidth - PANEL_PADDING * 2);
    stratumPanel.x = PANEL_PADDING;
    stratumPanel.y = cursorY;
    root.addChild(stratumPanel);
    cursorY += stratumPanel.height + STRATUM_GAP;
  }

  return root;
}

// ---------------------------------------------------------------------------
// Per-stratum panel
// ---------------------------------------------------------------------------

function renderStratumPanel(g: RoomGraphData, panelWidth: number): Container & { height: number } {
  const panel = new Container() as Container & { height: number };

  const label = new Text({
    text: `Stratum ${g.stratumIndex + 1}  nodes=${g.nodes.size}  edges=${g.edges.length}  hubs=${g.hubIds.length}  cp=${g.criticalPathIds.size}`,
    style: { fill: COLOR_TEXT, fontFamily: 'monospace', fontSize: 12 },
  });
  label.x = 0;
  label.y = 0;
  panel.addChild(label);

  // Compute bounds and centering offset
  const b = computeBounds(g);
  const widthRings = Math.max(1, b.maxX - b.minX);
  const heightRings = Math.max(1, b.maxY - b.minY);
  const diagramWidth = widthRings * RING_PIXELS + NODE_RADIUS * 4;
  const diagramHeight = heightRings * RING_PIXELS + NODE_RADIUS * 4;

  const diagram = new Container();
  diagram.x = Math.max(0, (panelWidth - diagramWidth) / 2);
  diagram.y = STRATUM_LABEL_HEIGHT;
  panel.addChild(diagram);

  // Diagram-local origin: shift so (minX, minY) maps to (NODE_RADIUS*2, NODE_RADIUS*2)
  const ox = -b.minX * RING_PIXELS + NODE_RADIUS * 2;
  const oy = -b.minY * RING_PIXELS + NODE_RADIUS * 2;

  // ---- Edges first (under nodes) ----
  const edgeGfx = new Graphics();
  for (const e of g.edges) {
    const a = g.nodes.get(e.a);
    const b2 = g.nodes.get(e.b);
    if (!a || !b2) continue;
    const ax = ox + a.layout.x * RING_PIXELS;
    const ay = oy + a.layout.y * RING_PIXELS;
    const bx = ox + b2.layout.x * RING_PIXELS;
    const by = oy + b2.layout.y * RING_PIXELS;
    const color = e.kind === 'multi_hub' ? COLOR_EDGE_MULTI : COLOR_EDGE_TREE;
    const alpha = e.kind === 'multi_hub' ? 0.9 : 0.55;
    const cpEdge =
      g.criticalPathIds.has(e.a) && g.criticalPathIds.has(e.b);
    edgeGfx.moveTo(ax, ay).lineTo(bx, by);
    edgeGfx.stroke({ color, alpha, width: cpEdge ? 4 : 2 });
    if (cpEdge) {
      edgeGfx.moveTo(ax, ay).lineTo(bx, by);
      edgeGfx.stroke({ color: COLOR_CP, alpha: 0.4, width: 7 });
    }
  }
  diagram.addChild(edgeGfx);

  // ---- Nodes ----
  const nodeGfx = new Graphics();
  for (const n of g.nodes.values()) {
    const x = ox + n.layout.x * RING_PIXELS;
    const y = oy + n.layout.y * RING_PIXELS;
    const fill = nodeColor(n.role);

    // CP outer ring
    if (g.criticalPathIds.has(n.id)) {
      nodeGfx.circle(x, y, NODE_RADIUS + 4).stroke({ color: COLOR_CP, width: 2, alpha: 0.9 });
    }
    nodeGfx.circle(x, y, NODE_RADIUS).fill({ color: fill, alpha: 0.95 });
    nodeGfx.circle(x, y, NODE_RADIUS).stroke({ color: 0x000000, width: 1, alpha: 0.7 });
  }
  diagram.addChild(nodeGfx);

  // ---- Node id labels (small, dim) ----
  for (const n of g.nodes.values()) {
    const x = ox + n.layout.x * RING_PIXELS;
    const y = oy + n.layout.y * RING_PIXELS;
    const txt = new Text({
      text: n.id,
      style: { fill: 0x111111, fontFamily: 'monospace', fontSize: 9 },
    });
    txt.anchor.set(0.5, 0.5);
    txt.x = x;
    txt.y = y;
    diagram.addChild(txt);
  }

  panel.height = STRATUM_LABEL_HEIGHT + diagramHeight;
  return panel;
}
