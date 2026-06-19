import type { ExitSide, RoomEdge, RoomGraphData, RoomNode } from '@level/RoomGraph';
import { ITEM_WORLD_SLOT_TILES } from '@level/ItemWorldTemplateCatalog';

const DEFAULT_ROOM_FOOTPRINT = { w: 1, h: 1 } as const;

export interface ItemWorldGraphPlacement {
  col: number;
  row: number;
  w: number;
  h: number;
  tileX: number;
  tileY: number;
  tileW: number;
  tileH: number;
}

export interface ItemWorldStratumLayout {
  graph: RoomGraphData;
  placements: Map<string, ItemWorldGraphPlacement>;
  width: number;
  height: number;
  tileWidth: number;
  tileHeight: number;
  hubLocal: ItemWorldGraphPlacement;
  bossLocal: ItemWorldGraphPlacement;
}

export type ItemWorldGraphEdgeMap = Map<string, { other: string; from: ExitSide }[]>;

export function embedItemWorldGraph(graph: RoomGraphData): ItemWorldStratumLayout {
  const placements = new Map<string, ItemWorldGraphPlacement>();

  const byId = (id: string): RoomNode | undefined => graph.nodes.get(id);
  const footprintOf = (node: RoomNode | undefined) => node?.footprint ?? DEFAULT_ROOM_FOOTPRINT;
  const tileSizeOf = (node: RoomNode | undefined) => {
    const fp = footprintOf(node);
    return {
      w: fp.w,
      h: fp.h,
      tileW: fp.w * ITEM_WORLD_SLOT_TILES,
      tileH: fp.h * ITEM_WORLD_SLOT_TILES,
    };
  };
  const placementFromTile = (tileX: number, tileY: number, node: RoomNode | undefined): ItemWorldGraphPlacement => {
    const s = tileSizeOf(node);
    return {
      col: Math.floor(tileX / ITEM_WORLD_SLOT_TILES),
      row: Math.floor(tileY / ITEM_WORLD_SLOT_TILES),
      w: s.w,
      h: s.h,
      tileX,
      tileY,
      tileW: s.tileW,
      tileH: s.tileH,
    };
  };
  const anchor = (node: RoomNode | undefined, side: ExitSide): number => {
    const fp = footprintOf(node);
    const fallbackX = fp.w * ITEM_WORLD_SLOT_TILES * 0.5;
    const fallbackY = fp.h * ITEM_WORLD_SLOT_TILES * 0.5;
    const a = node?.socketAnchors;
    if (side === 'left') return a?.leftY ?? fallbackY;
    if (side === 'right') return a?.rightY ?? fallbackY;
    if (side === 'up') return a?.upX ?? fallbackX;
    return a?.downX ?? fallbackX;
  };

  const edgeMap = buildItemWorldGraphEdgeMap(graph.edges);
  const queue: string[] = ['h0'];
  placements.set('h0', placementFromTile(0, 0, byId('h0')));

  while (queue.length > 0) {
    const id = queue.shift()!;
    const parent = placements.get(id);
    const parentNode = byId(id);
    if (!parent) continue;
    for (const inc of edgeMap.get(id) ?? []) {
      if (placements.has(inc.other)) continue;
      const childNode = byId(inc.other);
      const childSize = tileSizeOf(childNode);
      let tileX = parent.tileX;
      let tileY = parent.tileY;
      if (inc.from === 'right') {
        tileX = parent.tileX + parent.tileW;
        tileY = parent.tileY + anchor(parentNode, 'right') - anchor(childNode, 'left');
      } else if (inc.from === 'left') {
        tileX = parent.tileX - childSize.tileW;
        tileY = parent.tileY + anchor(parentNode, 'left') - anchor(childNode, 'right');
      } else if (inc.from === 'down') {
        tileX = parent.tileX + anchor(parentNode, 'down') - anchor(childNode, 'up');
        tileY = parent.tileY + parent.tileH;
      } else if (inc.from === 'up') {
        tileX = parent.tileX + anchor(parentNode, 'up') - anchor(childNode, 'down');
        tileY = parent.tileY - childSize.tileH;
      }
      placements.set(inc.other, placementFromTile(tileX, tileY, childNode));
      queue.push(inc.other);
    }
  }

  let minTileX = Infinity;
  let maxTileX = -Infinity;
  let minTileY = Infinity;
  let maxTileY = -Infinity;
  for (const p of placements.values()) {
    if (p.tileX < minTileX) minTileX = p.tileX;
    if (p.tileX + p.tileW > maxTileX) maxTileX = p.tileX + p.tileW;
    if (p.tileY < minTileY) minTileY = p.tileY;
    if (p.tileY + p.tileH > maxTileY) maxTileY = p.tileY + p.tileH;
  }
  if (!Number.isFinite(minTileX)) {
    minTileX = 0;
    maxTileX = 0;
    minTileY = 0;
    maxTileY = 0;
  }

  const tx = -Math.floor(minTileX / ITEM_WORLD_SLOT_TILES) * ITEM_WORLD_SLOT_TILES;
  const ty = -Math.floor(minTileY / ITEM_WORLD_SLOT_TILES) * ITEM_WORLD_SLOT_TILES;
  for (const [id, p] of placements) {
    const tileX = p.tileX + tx;
    const tileY = p.tileY + ty;
    placements.set(id, {
      ...p,
      tileX,
      tileY,
      col: Math.floor(tileX / ITEM_WORLD_SLOT_TILES),
      row: Math.floor(tileY / ITEM_WORLD_SLOT_TILES),
    });
  }

  const tileWidth = Math.ceil((maxTileX + tx) / ITEM_WORLD_SLOT_TILES) * ITEM_WORLD_SLOT_TILES;
  const tileHeight = Math.ceil((maxTileY + ty) / ITEM_WORLD_SLOT_TILES) * ITEM_WORLD_SLOT_TILES;
  const width = Math.max(1, Math.ceil(tileWidth / ITEM_WORLD_SLOT_TILES));
  const height = Math.max(1, Math.ceil(tileHeight / ITEM_WORLD_SLOT_TILES));
  const hubLocal = placements.get('h0') ?? placementFromTile(0, 0, byId('h0'));
  const bossLocal = placements.get(graph.bossId) ?? hubLocal;

  return { graph, placements, width, height, tileWidth, tileHeight, hubLocal, bossLocal };
}

export function buildItemWorldGraphEdgeMap(edges: RoomEdge[]): ItemWorldGraphEdgeMap {
  const map: ItemWorldGraphEdgeMap = new Map();
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

export function deriveItemWorldGraphExitsFromEdges(
  nodeId: string,
  edgeMap: ItemWorldGraphEdgeMap,
  placements: Map<string, ItemWorldGraphPlacement>,
): { left: boolean; right: boolean; up: boolean; down: boolean } {
  const exits = { left: false, right: false, up: false, down: false };
  if (!placements.has(nodeId)) return exits;
  for (const inc of edgeMap.get(nodeId) ?? []) {
    if (!placements.has(inc.other)) continue;
    if (inc.from === 'right') exits.right = true;
    else if (inc.from === 'left') exits.left = true;
    else if (inc.from === 'down') exits.down = true;
    else if (inc.from === 'up') exits.up = true;
  }
  return exits;
}
