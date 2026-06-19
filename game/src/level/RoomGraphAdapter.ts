/**
 * RoomGraphAdapter.ts ??DEC-039 Vertical Dive embedding.
 *
 * RoomGraphData ??UnifiedGridData. ê°?stratum ??vertical dive ê·¸ëž˜?„ë? ì§ì ‘
 * (col, row) ê·¸ë¦¬?œì— ë§¤í•‘???? stratum ?¤ì„ ?¸ë¡œë¡?stack ?œë‹¤.
 *
 * ë§¤í•‘ ë£?(vertical dive ?¨ì¼ ?•ìƒ):
 *   hub (Plaza)         ??(0, 0)
 *   CP spoke d=1..cpLen ??(0, d)
 *   boss                ??(0, cpLen + 1)
 *   L branch d=1..lLen  ??(-d, 0)
 *   R branch d=1..rLen  ??(+d, 0)
 *   shrine (Archive)    ??ë¶€ì°?ë°©í–¥?¼ë¡œ ??ì¹???(R ??/ L ??/ hub ??
 *
 * Cell.exits ??(a) ê·¸ë¦¬???¸ì ‘??RoomEdge ?ì„œ ?ë™ ?„ì¶œ + (b) ?¸ë“œ ?œê·¸
 * ('no_up' / 'no_down') ë¡?ê°•ì œ ? ê¸ˆ. Plaza ??'no_up' ?¼ë¡œ U ?êµ¬ ? ê¸ˆ
 * (ì²œìž¥ ?Œê´´ ?œê°??LDtk ì¸?ì±…ìž„), Boss ??'no_down' ?¼ë¡œ D ?êµ¬ ? ê¸ˆ
 * (ì²˜ì¹˜ ??Trapdoor entity ê°€ ?¤ìŒ Plaza ë¡œì˜ ?„ì´ ?´ë‹¹).
 *
 * DEC-039 ?ê¸°:
 *   - tryGridEmbedRadial (radial ?„ë² ?? ??vertical dive ???¨ì¼ ?•ìƒ?´ë¼ ë¶ˆí•„?? *   - linearEmbed (? í˜• fallback) ??vertical dive ????ƒ ?„ë² ??ê°€?? *   - stitchInterStrataCorridors (ì§€ì¸?ê°?ë¬¼ë¦¬ ?µë¡œ) ??Trapdoor ?¬íƒˆ???„ì´ ?´ë‹¹
 */

import type { UnifiedGridData } from '@level/RoomGrid';
import type { StratumDef, TopologyKind } from '@data/StrataConfig';
import type { RoomGraphData } from '@level/RoomGraph';
import { generateRoomGraph, validateRoomGraph } from '@level/RoomGraph';
import type { Archetype } from '@level/RoomGraphArchetypes';
import type { LdtkLevel } from '@level/LdtkLoader';
import { embedItemWorldGraph } from '@level/ItemWorldGraphLayout';
import { buildItemWorldUnifiedGrid } from '@level/ItemWorldUnifiedGridBuilder';
import { assignItemWorldTemplatesToGraph } from '@level/ItemWorldTemplateAssignment';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function generateUnifiedGridFromGraph(
  strataDefs: StratumDef[],
  itemUid: number,
  topologyOverride?: TopologyKind,
  archetype: Archetype = 'zigzag',
  templates: LdtkLevel[] = [],
): { unifiedGrid: UnifiedGridData; graphs: RoomGraphData[] } {
  const layouts = strataDefs.map((def, si) => {
    const graph = generateRoomGraph(def, itemUid, si, topologyOverride, archetype);
    try { validateRoomGraph(graph, def); }
    catch (err) { console.warn(`[RoomGraphAdapter] stratum ${si} validation failed`, err); }

    assignItemWorldTemplatesToGraph(graph, templates, itemUid + si * 1009);
    const layout = embedItemWorldGraph(graph);

    // Debug overlay (F2) reads node.layout.x/y ??overwrite with grid coords.
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
  const unifiedGrid = buildItemWorldUnifiedGrid(layouts);
  return { unifiedGrid, graphs };
}

