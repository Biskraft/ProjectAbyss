import type { RoomCell, RoomType, StratumBound, UnifiedGridData, UnifiedRoomCell } from '@level/RoomGrid';
import type { NodeRole } from '@level/RoomGraph';
import {
  buildItemWorldGraphEdgeMap,
  deriveItemWorldGraphExitsFromEdges,
  type ItemWorldStratumLayout,
} from '@level/ItemWorldGraphLayout';
import { ITEM_WORLD_SLOT_TILES } from '@level/ItemWorldTemplateCatalog';

type ExitState = { left: boolean; right: boolean; up: boolean; down: boolean };

export function buildItemWorldUnifiedGrid(layouts: readonly ItemWorldStratumLayout[]): UnifiedGridData {
  const targetPlazaCol = Math.max(0, ...layouts.map(l => l.hubLocal.col));
  const colOffsets = layouts.map(l => targetPlazaCol - l.hubLocal.col);
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

    const occupiedSlots = markOccupiedSlots(layout, colOffset, rowOffset);
    placeGraphRooms(cells, layout, si, colOffset, rowOffset, totalHeight, totalWidth);
    placeFillerCells(cells, layout, si, colOffset, rowOffset, occupiedSlots);

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

function markOccupiedSlots(layout: ItemWorldStratumLayout, colOffset: number, rowOffset: number): Set<string> {
  const occupiedSlots = new Set<string>();
  for (const [, p] of layout.placements) {
    const c0 = Math.floor(p.tileX / ITEM_WORLD_SLOT_TILES);
    const c1 = Math.ceil((p.tileX + p.tileW) / ITEM_WORLD_SLOT_TILES);
    const r0 = Math.floor(p.tileY / ITEM_WORLD_SLOT_TILES);
    const r1 = Math.ceil((p.tileY + p.tileH) / ITEM_WORLD_SLOT_TILES);
    for (let rr = r0; rr < r1; rr++) {
      for (let cc = c0; cc < c1; cc++) {
        occupiedSlots.add(`${cc + colOffset},${rowOffset + rr}`);
      }
    }
  }
  return occupiedSlots;
}

function placeGraphRooms(
  cells: (UnifiedRoomCell | null)[][],
  layout: ItemWorldStratumLayout,
  stratumIndex: number,
  colOffset: number,
  rowOffset: number,
  totalHeight: number,
  totalWidth: number,
): void {
  const edgeMap = buildItemWorldGraphEdgeMap(layout.graph.edges);
  for (const [nodeId, p] of layout.placements) {
    const node = layout.graph.nodes.get(nodeId);
    if (!node?.templateId) continue;
    const absRow = rowOffset + p.row;
    const absCol = p.col + colOffset;
    if (absRow < 0 || absRow >= totalHeight) continue;
    if (absCol < 0 || absCol >= totalWidth) continue;

    const exits = deriveItemWorldGraphExitsFromEdges(nodeId, edgeMap, layout.placements);
    applyNodeExitTags(node.tags, exits);
    const onCriticalPath = layout.graph.criticalPathIds.has(nodeId);
    const kind: 'corridor' | 'room' | undefined = node.tags.includes('corridor')
      ? 'corridor'
      : node.tags.includes('room')
        ? 'room'
        : undefined;
    const base: RoomCell = {
      col: absCol,
      row: absRow,
      type: deriveRoomType(exits, node.role) as RoomType,
      onCriticalPath,
      exits,
      visited: false,
      cleared: false,
      kind,
      role: node.role,
      footprint: { w: p.w, h: p.h },
      tileRect: {
        x: colOffset * ITEM_WORLD_SLOT_TILES + p.tileX,
        y: rowOffset * ITEM_WORLD_SLOT_TILES + p.tileY,
        w: p.tileW,
        h: p.tileH,
      },
      templateId: node.templateId,
    };
    cells[absRow][absCol] = {
      ...base,
      absoluteRow: absRow,
      stratumIndex,
    };
  }
}

function placeFillerCells(
  cells: (UnifiedRoomCell | null)[][],
  layout: ItemWorldStratumLayout,
  stratumIndex: number,
  colOffset: number,
  rowOffset: number,
  occupiedSlots: Set<string>,
): void {
  for (let localRow = 0; localRow < layout.height; localRow++) {
    for (let absCol = 0; absCol < layout.width + colOffset; absCol++) {
      const absRow = rowOffset + localRow;
      if (cells[absRow]?.[absCol]) continue;
      if (occupiedSlots.has(`${absCol},${absRow}`)) continue;
      cells[absRow][absCol] = {
        col: absCol,
        row: absRow,
        type: 0,
        onCriticalPath: false,
        exits: { left: false, right: false, up: false, down: false },
        visited: false,
        cleared: true,
        kind: 'room',
        footprint: { w: 1, h: 1 },
        tileRect: {
          x: absCol * ITEM_WORLD_SLOT_TILES,
          y: absRow * ITEM_WORLD_SLOT_TILES,
          w: ITEM_WORLD_SLOT_TILES,
          h: ITEM_WORLD_SLOT_TILES,
        },
        absoluteRow: absRow,
        stratumIndex,
        isFiller: true,
        templateId: 'ItemStratum_Filler_01',
      };
    }
  }
}

function applyNodeExitTags(tags: readonly string[], exits: ExitState): void {
  if (tags.includes('force_up')) exits.up = true;
  if (tags.includes('no_down')) exits.down = false;
  if (tags.includes('force_lru')) {
    exits.left = true;
    exits.right = true;
    exits.up = true;
  }
}

function deriveRoomType(exits: ExitState, role?: NodeRole): number {
  if (role === 'boss') return 4;
  if (exits.up && exits.down) return 4;
  if (exits.down) return 2;
  if (exits.up && !exits.down) return 3;
  if (exits.left || exits.right) return 1;
  return 0;
}
