import type { LdtkLevel, ExitDir } from '@level/LdtkLoader';
import type { ExitSide, RoomGraphData, RoomNode } from '@level/RoomGraph';
import { PRNG } from '@utils/PRNG';
import { buildItemWorldGraphEdgeMap } from '@level/ItemWorldGraphLayout';
import { createItemWorldTemplateCatalog, sameItemWorldExitSet } from '@level/ItemWorldTemplateCatalog';

type ExitState = { left: boolean; right: boolean; up: boolean; down: boolean };

export function assignItemWorldTemplatesToGraph(graph: RoomGraphData, templates: LdtkLevel[], seed: number): void {
  if (templates.length === 0) return;
  const rng = new PRNG(seed * 2654435761);
  const catalog = createItemWorldTemplateCatalog(templates);
  const pool = catalog.entries;
  if (pool.length === 0) return;
  const edgeMap = buildItemWorldGraphEdgeMap(graph.edges);

  for (const [nodeId, node] of graph.nodes) {
    const exits = deriveExitsFromGraph(nodeId, edgeMap);
    applyNodeExitTags(node, exits);
    const required = exitsToDirs(exits);
    let desiredType = getDesiredTemplateType(graph, node, rng);
    let candidates = pool.filter(entry =>
      entry.template.roomType === desiredType && sameItemWorldExitSet(entry.template.exits, required));
    if ((desiredType === 'Treasure' || desiredType === 'Puzzle') && candidates.length === 0) {
      desiredType = 'Combat';
      candidates = pool.filter(entry =>
        entry.template.roomType === desiredType && sameItemWorldExitSet(entry.template.exits, required));
    }
    if (candidates.length === 0) {
      candidates = pool.filter(entry => sameItemWorldExitSet(entry.template.exits, required));
    }
    const picked = candidates.length > 0 ? candidates[rng.nextInt(0, candidates.length - 1)] : null;
    if (!picked) {
      console.warn(`[RoomGraphAdapter] no exact-exit ItemStratum template for node=${nodeId} exits=${required.join('') || 'none'} role=${node.role}`);
      continue;
    }
    node.templateId = picked.template.identifier;
    node.footprint = picked.footprint;
    node.socketAnchors = picked.socketAnchors;
  }
}

function getDesiredTemplateType(graph: RoomGraphData, node: RoomNode, rng: PRNG): string {
  if (node.role === 'hub') return 'Start';
  if (node.role === 'boss' || node.id === graph.bossId) return 'Boss';
  if (node.role === 'shrine') return 'Rest';
  if (node.tags.includes('corridor')) return 'Corridor';
  if (!graph.criticalPathIds.has(node.id)) {
    const roll = rng.next();
    if (roll < 0.15) return 'Treasure';
    if (roll < 0.30) return 'Puzzle';
  }
  return 'Combat';
}

function deriveExitsFromGraph(
  nodeId: string,
  edgeMap: Map<string, { other: string; from: ExitSide }[]>,
): ExitState {
  const exits = { left: false, right: false, up: false, down: false };
  for (const inc of edgeMap.get(nodeId) ?? []) {
    if (inc.from === 'right') exits.right = true;
    else if (inc.from === 'left') exits.left = true;
    else if (inc.from === 'down') exits.down = true;
    else if (inc.from === 'up') exits.up = true;
  }
  return exits;
}

function applyNodeExitTags(node: RoomNode, exits: ExitState): void {
  if (node.tags.includes('force_up')) exits.up = true;
  if (node.tags.includes('no_down')) exits.down = false;
  if (node.tags.includes('force_lru')) {
    exits.left = true;
    exits.right = true;
    exits.up = true;
  }
}

function exitsToDirs(exits: ExitState): ExitDir[] {
  const dirs: ExitDir[] = [];
  if (exits.left) dirs.push('L');
  if (exits.right) dirs.push('R');
  if (exits.up) dirs.push('U');
  if (exits.down) dirs.push('D');
  return dirs;
}
