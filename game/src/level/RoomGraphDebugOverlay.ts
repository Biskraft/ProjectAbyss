/**
 * RoomGraphDebugOverlay.ts ??DEC-037 PR-B ?îÎ≤ÑÍ∑??úÍ∞Å??
 *
 * RoomGraphData[] Î•?Î∞õÏïÑ ?Ä?§ÌÅ¨Î¶??®ÎÑê??Î™®Îì† ÏßÄÏ∏?Í∑∏Îûò?ÑÎ? ?òÏßÅ ?§ÌÉù?ºÎ°ú ?åÎçî.
 * Í≤åÏûÑ Î°úÏßÅ/?åÎçî ?åÏù¥?ÑÎùº??Î¨¥Ïàò?????úÎìúÎ≥?Í≤∞Í≥º ?úÍ∞Å Í≤ÄÏ¶??ÑÏö©.
 *
 * ?†Í?: ItemWorldScene ??F2 ??+ ?debug=graph URL ?åÎûòÍ∑?
 *
 * ?âÏÉÅ Í∑úÏïΩ:
 *   role=hub     Ï£ºÌô© #FF8000
 *   role=spoke   Ï≤?°ù #5FE7FF
 *   role=boss    Îπ®Í∞ï #FF4444
 *   role=shrine  ?∞Îëê #88FF88
 *   edge tree    ?? #FFFFFF (alpha 0.6)
 *   edge multi_hub ?∏Îûë #FFD23F (alpha 0.9)
 *   Critical Path Ï£ºÌô© ?∏Í≥Ω??(?∏Îìú/?êÏ????ßÏπ†)
 */

import { Container, Graphics, Text } from 'pixi.js';
import type { RoomGraphData, RoomNode } from '@level/RoomGraph';

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

const NODE_RADIUS = 6;
const MAX_RING_PIXELS = 30;
const MIN_RING_PIXELS = 8;
const MIN_LABEL_RING_PIXELS = 14;
const CONCEPT_MAIN_SPACING_X = 1.05;
const CONCEPT_BRANCH_SPACING_Y = 0.56;
const CONCEPT_BRANCH_SPACING_X = 0.82;
const CONCEPT_BRANCH_WRAP = 8;
const CONCEPT_BRANCH_ROW_STEP_Y = 0.38;
const MAX_BRANCH_LANE_Y = 1.55;
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

function nodeLabel(role: RoomNode['role']): string {
  switch (role) {
    case 'hub': return 'Hub';
    case 'spoke': return 'Room';
    case 'boss': return 'Boss';
    case 'shrine': return 'Safe';
  }
}

function shortNodeLabel(role: RoomNode['role']): string {
  switch (role) {
    case 'hub': return 'S';
    case 'spoke': return 'R';
    case 'boss': return 'B';
    case 'shrine': return '+';
  }
}

// ---------------------------------------------------------------------------
// Per-stratum bounds (in ring-units)
// ---------------------------------------------------------------------------

interface Bounds {
  minX: number; maxX: number; minY: number; maxY: number;
}

interface GraphPoint {
  x: number;
  y: number;
}

interface AbstractEdge {
  a: string;
  b: string;
  kind: 'tree' | 'multi_hub' | 'ring_closure' | 'ring_closure';
  critical: boolean;
}

interface AbstractLayout {
  points: Map<string, GraphPoint>;
  edges: AbstractEdge[];
}

function branchLaneY(index: number): number {
  const magnitude = Math.min(
    MAX_BRANCH_LANE_Y,
    (Math.floor(index / 2) + 1) * CONCEPT_BRANCH_SPACING_Y,
  );
  return index % 2 === 0 ? magnitude : -magnitude;
}

function computeAbstractLayout(g: RoomGraphData): AbstractLayout {
  const points = new Map<string, GraphPoint>();
  const edges: AbstractEdge[] = [];

  const adjacency = buildAdjacency(g);
  const criticalPath = orderCriticalPath(g, adjacency);
  const drawnEdges = new Set<string>();

  const addEdge = (a: string, b: string, kind: 'tree' | 'multi_hub' | 'ring_closure', critical: boolean): void => {
    const key = edgeKey(a, b);
    if (drawnEdges.has(key)) return;
    drawnEdges.add(key);
    edges.push({ a, b, kind, critical });
  };

  for (let i = 0; i < criticalPath.length; i++) {
    points.set(criticalPath[i], { x: i * CONCEPT_MAIN_SPACING_X, y: 0 });
    if (i > 0) {
      addEdge(criticalPath[i - 1], criticalPath[i], 'tree', true);
    }
  }

  const placed = new Set<string>(criticalPath);
  const criticalSet = new Set(criticalPath);
  let branchLaneIndex = 0;
  for (let parentIndex = 0; parentIndex < criticalPath.length; parentIndex++) {
    const parentId = criticalPath[parentIndex];
    const branchNodes = collectBranchNodes(g, adjacency, parentId, placed);
    if (branchNodes.length === 0) continue;
    placeBranchLane(points, addEdge, branchLaneIndex++, parentId, branchNodes);
  }

  // Safety fallback for malformed or disconnected debug data: keep every node
  // visible as a conceptual "room-room-room" chain. Never use world/grid
  // coordinates here; Shift+2 is topology debug, not a minimap.
  let previousFallbackId = criticalPath[criticalPath.length - 1] ?? null;
  let fallbackX = criticalPath.length;
  for (const nodeId of g.nodes.keys()) {
    if (!points.has(nodeId)) {
      points.set(nodeId, { x: fallbackX++, y: 0 });
      if (previousFallbackId) {
        addEdge(previousFallbackId, nodeId, 'tree', false);
      }
      previousFallbackId = nodeId;
    }
  }

  for (const edge of g.edges) {
    if (criticalSet.has(edge.a) && criticalSet.has(edge.b)) continue;
    const a = points.get(edge.a);
    const b = points.get(edge.b);
    if (!a || !b) continue;
    if (Math.abs(a.x - b.x) > CONCEPT_MAIN_SPACING_X * 2.5 || Math.abs(a.y - b.y) > CONCEPT_BRANCH_SPACING_Y * 3) continue;
    addEdge(edge.a, edge.b, edge.kind, false);
  }

  return { points, edges };
}

function edgeKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function buildAdjacency(g: RoomGraphData): Map<string, string[]> {
  const adjacency = new Map<string, string[]>();
  for (const nodeId of g.nodes.keys()) adjacency.set(nodeId, []);
  for (const edge of g.edges) {
    adjacency.get(edge.a)?.push(edge.b);
    adjacency.get(edge.b)?.push(edge.a);
  }
  for (const neighbors of adjacency.values()) neighbors.sort();
  return adjacency;
}

function orderCriticalPath(g: RoomGraphData, adjacency: Map<string, string[]>): string[] {
  const startId = g.hubIds.find(id => g.criticalPathIds.has(id)) ?? g.hubIds[0];
  const goalId = g.bossId;
  if (startId && goalId) {
    const path = findPath(startId, goalId, adjacency, id => g.criticalPathIds.has(id));
    if (path.length > 0) return path;
  }

  const criticalNodes = [...g.nodes.values()]
    .filter(n => g.criticalPathIds.has(n.id));
  if (criticalNodes.length > 0) {
    criticalNodes.sort((a, b) => {
      if (a.depth !== b.depth) return a.depth - b.depth;
      if (a.role === 'hub' && b.role !== 'hub') return -1;
      if (a.role !== 'hub' && b.role === 'hub') return 1;
      if (a.role === 'boss' && b.role !== 'boss') return 1;
      if (a.role !== 'boss' && b.role === 'boss') return -1;
      return a.id.localeCompare(b.id);
    });
    return criticalNodes.map(n => n.id);
  }

  const hubId = g.hubIds[0];
  if (hubId) return [hubId];
  return [...g.nodes.keys()].slice(0, 1);
}

function findPath(
  startId: string,
  goalId: string,
  adjacency: Map<string, string[]>,
  canVisit: (nodeId: string) => boolean,
): string[] {
  const queue: string[] = [startId];
  const parent = new Map<string, string | null>([[startId, null]]);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    if (current === goalId) {
      const path: string[] = [];
      let cursor: string | null = current;
      while (cursor) {
        path.push(cursor);
        cursor = parent.get(cursor) ?? null;
      }
      return path.reverse();
    }
    for (const next of adjacency.get(current) ?? []) {
      if (parent.has(next) || !canVisit(next)) continue;
      parent.set(next, current);
      queue.push(next);
    }
  }

  return [];
}

function collectBranchNodes(
  g: RoomGraphData,
  adjacency: Map<string, string[]>,
  parentId: string,
  placed: Set<string>,
): string[] {
  const queue: Array<{ id: string; depth: number; parent: string }> = [];
  for (const next of adjacency.get(parentId) ?? []) {
    if (g.criticalPathIds.has(next) || placed.has(next)) continue;
    queue.push({ id: next, depth: 1, parent: parentId });
  }

  const collected: Array<{ id: string; depth: number }> = [];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || placed.has(current.id) || g.criticalPathIds.has(current.id)) continue;
    placed.add(current.id);
    collected.push({ id: current.id, depth: current.depth });

    const children = (adjacency.get(current.id) ?? [])
      .filter(next => next !== current.parent)
      .filter(next => !g.criticalPathIds.has(next));
    for (const child of children) {
      queue.push({ id: child, depth: current.depth + 1, parent: current.id });
    }
  }

  collected.sort((a, b) => {
    if (a.depth !== b.depth) return a.depth - b.depth;
    return a.id.localeCompare(b.id);
  });
  return collected.map(n => n.id);
}

function placeBranchLane(
  points: Map<string, GraphPoint>,
  addEdge: (a: string, b: string, kind: 'tree' | 'multi_hub' | 'ring_closure', critical: boolean) => void,
  laneIndex: number,
  parentId: string,
  branchNodes: string[],
): void {
  const parentPoint = points.get(parentId);
  if (!parentPoint) return;

  let previousId = parentId;
  const branchRow = branchLaneY(laneIndex);
  for (let i = 0; i < branchNodes.length; i++) {
    const nodeId = branchNodes[i];
    const col = i % CONCEPT_BRANCH_WRAP;
    const row = Math.floor(i / CONCEPT_BRANCH_WRAP);
    const rowSign = branchRow < 0 ? -1 : 1;
    points.set(nodeId, {
      // Display-only lane: Hub-Room-Room-Room, folded near the parent.
      // This intentionally ignores exact generated fan-out, grid position,
      // room footprint, shaft length, and LDtk template size.
      x: parentPoint.x + 0.48 + col * CONCEPT_BRANCH_SPACING_X,
      y: branchRow + row * CONCEPT_BRANCH_ROW_STEP_Y * rowSign,
    });
    addEdge(previousId, nodeId, 'tree', false);
    previousId = nodeId;
  }
}

function computeBounds(points: Map<string, GraphPoint>): Bounds {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of points.values()) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
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
    text: `RoomGraph debug ??rarity=${rarity}, uid=${itemUid}, strata=${graphs.length}   [F2: hide]`,
    style: { fill: COLOR_TEXT, fontFamily: 'monospace', fontSize: 14 },
  });
  header.x = PANEL_PADDING;
  header.y = PANEL_PADDING;
  root.addChild(header);

  // Legend
  const legend = new Text({
    text: 'Concept graph: Hub-Room-Room...  Hub=orange  Room=cyan  Boss=red  Safe=green  main path=orange ring',
    style: { fill: 0x999999, fontFamily: 'monospace', fontSize: 11 },
  });
  legend.x = PANEL_PADDING;
  legend.y = PANEL_PADDING + 18;
  root.addChild(legend);

  let cursorY = PANEL_PADDING + 50;
  const graphCount = Math.max(1, graphs.length);
  const remainingHeight = Math.max(80, screenHeight - cursorY - PANEL_PADDING - STRATUM_GAP * (graphCount - 1));
  const panelHeightBudget = Math.max(80, remainingHeight / graphCount);

  for (let i = 0; i < graphs.length; i++) {
    const g = graphs[i];
    const stratumPanel = renderStratumPanel(g, screenWidth - PANEL_PADDING * 2, panelHeightBudget);
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

function renderStratumPanel(g: RoomGraphData, panelWidth: number, panelHeightBudget: number): Container & { height: number } {
  const panel = new Container() as Container & { height: number };

  const label = new Text({
    text: `Stratum ${g.stratumIndex + 1}  nodes=${g.nodes.size}  edges=${g.edges.length}  hubs=${g.hubIds.length}  cp=${g.criticalPathIds.size}`,
    style: { fill: COLOR_TEXT, fontFamily: 'monospace', fontSize: 12 },
  });
  label.x = 0;
  label.y = 0;
  panel.addChild(label);

  // Compute abstract bounds and fit the diagram into the available panel space.
  // Actual room/grid distances are intentionally discarded here; this overlay is
  // a conceptual room graph, not a world-space minimap.
  const layout = computeAbstractLayout(g);
  const points = layout.points;
  const b = computeBounds(points);
  const widthRings = Math.max(1, b.maxX - b.minX);
  const heightRings = Math.max(1, b.maxY - b.minY);
  const innerPad = NODE_RADIUS * 4;
  const availableW = Math.max(80, panelWidth - innerPad * 2);
  const availableH = Math.max(60, panelHeightBudget - STRATUM_LABEL_HEIGHT - innerPad);
  const ringPixels = Math.max(
    MIN_RING_PIXELS,
    Math.min(
      MAX_RING_PIXELS,
      availableW / Math.max(1, widthRings),
      availableH / Math.max(1, heightRings),
    ),
  );
  const diagramWidth = widthRings * ringPixels + innerPad;
  const diagramHeight = heightRings * ringPixels + innerPad;

  const diagram = new Container();
  diagram.x = Math.max(0, (panelWidth - diagramWidth) / 2);
  diagram.y = STRATUM_LABEL_HEIGHT;
  panel.addChild(diagram);

  // Diagram-local origin: shift so (minX, minY) maps to the inner padding.
  const ox = -b.minX * ringPixels + innerPad * 0.5;
  const oy = -b.minY * ringPixels + innerPad * 0.5;

  // ---- Edges first (under nodes) ----
  const edgeGfx = new Graphics();
  for (const e of layout.edges) {
    const a = g.nodes.get(e.a);
    const b2 = g.nodes.get(e.b);
    const ap = points.get(e.a);
    const bp = points.get(e.b);
    if (!a || !b2 || !ap || !bp) continue;
    const ax = ox + ap.x * ringPixels;
    const ay = oy + ap.y * ringPixels;
    const bx = ox + bp.x * ringPixels;
    const by = oy + bp.y * ringPixels;
    const color = e.kind === 'multi_hub' ? COLOR_EDGE_MULTI : COLOR_EDGE_TREE;
    const alpha = e.kind === 'multi_hub' ? 0.9 : 0.55;
    const cpEdge = e.critical;
    edgeGfx.moveTo(ax, ay).lineTo(bx, by);
    edgeGfx.stroke({ color, alpha, width: cpEdge ? 3 : 2 });
    if (cpEdge) {
      edgeGfx.moveTo(ax, ay).lineTo(bx, by);
      edgeGfx.stroke({ color: COLOR_CP, alpha: 0.4, width: 5 });
    }
  }
  diagram.addChild(edgeGfx);

  // ---- Nodes ----
  const nodeGfx = new Graphics();
  for (const n of g.nodes.values()) {
    const p = points.get(n.id);
    if (!p) continue;
    const x = ox + p.x * ringPixels;
    const y = oy + p.y * ringPixels;
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
    const p = points.get(n.id);
    if (!p) continue;
    const x = ox + p.x * ringPixels;
    const y = oy + p.y * ringPixels;
    const txt = new Text({
      text: ringPixels >= MIN_LABEL_RING_PIXELS ? nodeLabel(n.role) : shortNodeLabel(n.role),
      style: { fill: 0x111111, fontFamily: 'monospace', fontSize: ringPixels >= MIN_LABEL_RING_PIXELS ? 9 : 7 },
    });
    txt.anchor.set(0.5, 0.5);
    txt.x = x;
    txt.y = y;
    diagram.addChild(txt);
  }

  panel.height = STRATUM_LABEL_HEIGHT + diagramHeight;
  return panel;
}
