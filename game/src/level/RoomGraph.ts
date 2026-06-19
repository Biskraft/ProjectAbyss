/**
 * RoomGraph.ts ??DEC-039 Vertical Dive Graph (?˜ì§ ???¤ì´ë¸?ê·¸ë˜??.
 *
 * DEC-037 hub-and-spoke ë°©ì‚¬?•ì? ?ê¸°. ê°?stratum ê·¸ë˜?„ëŠ” ?¨ì¼ ?˜ì§ ?¤ì´ë¸?
 *
 *   [Plaza (hub)] ??top, ì¶œêµ¬ LRD only (U ì²œì¥ ?Œê´´ ?œê°)
 *      ?œâ? L ??[Lane spoke] ??[Lane spoke] ??...               (ì¢Œì¸¡ ë¶„ê¸°)
 *      ?œâ? R ??[Lane spoke] ??[Lane spoke] ??[Archive(shrine)] (?°ì¸¡ ë¶„ê¸°, ?ì— shrine)
 *      ?”â? D ??[CP spoke] ??[CP spoke] ??... ??[Boss]          (critical path)
 *                                                ??(ì²˜ì¹˜ ??Trapdoor ?¬íƒˆ ?œì„±)
 *                                                ??ê³µê²© ???¸í„°?™íŠ¸ ???¤ìŒ Plaza
 *
 * ë£?
 *   - hub ?¸ë“œ = ì§€ì¸?top, role='hub'. ì¶œêµ¬ = LR + D (U ?†ìŒ).
 *   - boss ?¸ë“œ = ì§€ì¸?bottom, role='boss'. ì¶œêµ¬ = LRU (D ??ì²˜ì¹˜ ??Trapdoor entity ê°€ ?´ë‹¹).
 *   - shrine ?¸ë“œ = R ë¶„ê¸° ê°€ì§€ ?? role='shrine'. ?µì…˜ ?ˆì „ì§€?€. ??spawn 0.
 *   - critical path = hub + D ë°©í–¥ spoke ?¬ìŠ¬ + boss.
 *   - ë¶„ê¸° = LR (hub ì§ì†).
 *   - chain-length êµë²ˆ (?€??depth = corridor, ì§ìˆ˜ = room) ë³´ì¡´.
 *   - StratumDef.topology / branchCount / hubCount ??ë¬´ì‹œ (vertical dive ???¨ì¼ ?•ìƒ).
 *     CSV ??nodeCount ??ë¶„ë°° ?ˆì‚°?¼ë¡œë§??¬ìš©.
 *
 * ë³´ì¡´ invariants:
 *   - ?ë£Œêµ¬ì¡° (RoomNode/RoomEdge/RoomGraphData) DEC-037 ?€ ?™ì¼ ??RoomGraphAdapter
 *     ?€ ItemWorldScene ??ê·¸ë?ë¡??¬ìš©?œë‹¤.
 *   - validateRoomGraph ??nodeCount ?¼ì¹˜ / hub BFS ?„ë‹¬ / bossÂ·shrine ë³„ë„ ?¸ë“œ.
 *
 * ?ê¸° (?¬ë„??ê¸ˆì?):
 *   - hub_spoke / multi_hub / linear_right / y_fork / t_junction / layer_cake
 *     / ring / spine_pockets / two_arc_pocketed ë¹Œë”.
 *   - applyStratumVariant (mirror X/Y/180Â°) ??vertical dive ??hub-top / boss-bottom
 *     ë¶ˆë???mirror Y ê°€ ê¹¨ëœ¨ë¦¬ë?ë¡??ê¸°. ?œê° ?¤ì–‘?”ëŠ” LDtk ?œí”Œë¦??€?‰ì…˜ê³? *     ?Œë§ˆ ?¬ëŸ¬ê·¸ê? ?´ë‹¹.
 *   - hub-hub multi_hub ?£ì? (Ancient ?¤ì¤‘ hub ???¨ì¼ ?˜ì§ dive ë¡??µì¼).
 */

import { PRNG } from '@utils/PRNG';
import type { StratumDef, TopologyKind } from '@data/StrataConfig';
import { ARCHETYPE_WEIGHTS, type Archetype } from '@level/RoomGraphArchetypes';

// ---------------------------------------------------------------------------
// Types ???¸ë? import ?¸í™˜?±ì„ ?„í•´ ?œê·¸?ˆì²˜ ë³´ì¡´.
// ---------------------------------------------------------------------------

export type NodeRole = 'hub' | 'spoke' | 'boss' | 'shrine';
export type ExitSide = 'left' | 'right' | 'up' | 'down';

export interface RoomNode {
  id: string;
  role: NodeRole;
  /** vertical dive ????ƒ 0 (?¨ì¼ hub). */
  hubIndex: number;
  /** -1 = hub/shrine, 0 = critical path (D ë°©í–¥), 1 = L ë¶„ê¸°, 2 = R ë¶„ê¸°. */
  branchIndex: number;
  /** hub: 0, spoke ?¬ìŠ¬ ì§„í–‰??1.. */
  depth: number;
  stratumIndex: number;
  layout: { angleRad: number; ring: number; x: number; y: number };
  tags: string[];
  visited: boolean;
  cleared: boolean;
  bossPortalX?: number;
  bossPortalY?: number;
  footprint?: { w: number; h: number };
  templateId?: string;
  socketAnchors?: { leftY: number; rightY: number; upX: number; downX: number };
}

export interface RoomEdge {
  a: string;
  b: string;
  /** vertical dive ??'tree' ë§??¬ìš©. multi_hub / ring_closure ???ê¸°?˜ì—ˆ?¼ë‚˜ ?¸í™˜ ? ì?. */
  kind: 'tree' | 'multi_hub' | 'ring_closure';
  sideA: ExitSide;
  sideB: ExitSide;
}

export interface RoomGraphData {
  stratumIndex: number;
  hubIds: string[];
  /** vertical dive ????ƒ 0 (CP = D ë¶„ê¸°). ?¸í™˜ ? ì? ?„ë“œ. */
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
 * RoomGraph ì§„ì…?? DEC-039 vertical dive ?¨ì¼ ë¹Œë”.
 *
 * topologyOverride / def.topology ??ë¬´ì‹œ. CSV ??nodeCount ë§?ë¶„ë°° ?ˆì‚°?¼ë¡œ ?¬ìš©.
 * archetype ?€ ë¬´ê¸°??(ì£¼ìƒ‰, ë¶€?? ?¼ë¡œ ?¸ì¶œ ì¸¡ì´ ê²°ì • ??RoomGraphAdapter ê°€
 * archetypeFor() ë¡?ë§¤í•‘ ???„ë‹¬. ë¯¸ì?????'zigzag' fallback.
 *
 * @param def              StratumDef (CSV ??StrataConfig.ts)
 * @param itemUid          ê²°ì •???œë“œ???„ì´???ë³„?? * @param stratumIndex     0-based
 * @param topologyOverride ë¬´ì‹œ (vertical dive ?¨ì¼ ?•ìƒ)
 * @param archetype        DEC-039 7 archetype ì¤??˜ë‚˜ ??ë¯¸ì?????'zigzag'
 */
export function generateRoomGraph(
  def: StratumDef,
  itemUid: number,
  stratumIndex: number,
  topologyOverride?: TopologyKind,
  archetype: Archetype = 'zigzag',
): RoomGraphData {
  const topology = topologyOverride === 'horizontal_descent' ? topologyOverride : def.topology;
  if (topology === 'horizontal_descent') {
    return buildHorizontalDescent(def, itemUid, stratumIndex);
  }
  return buildVerticalDive(def, itemUid, stratumIndex, archetype);
}

// ---------------------------------------------------------------------------
// Vertical Dive builder
// ---------------------------------------------------------------------------

/**
 * Vertical Dive ë¹Œë”.
 *
 * ?¸ë“œ ë¶„ë°° (ì´?nodeCount):
 *   hub(1) + boss(1) + shrine(1) + cpLen(D) + lLen(L) + rLen(R) = nodeCount
 *
 * ë¶„ë°° ë£?
 *   spokeBudget = max(0, nodeCount - 3)
 *   cpLen       = max(2, ceil(spokeBudget / 2))    -- ?€ë¶€ë¶??ˆì‚°?€ CP ?? *   sideBudget  = spokeBudget - cpLen
 *   lLen        = max(1, floor(sideBudget / 2))    -- ì¢Œì¸¡ ë¶„ê¸°
 *   rLen        = max(1, sideBudget - lLen)        -- ?°ì¸¡ ë¶„ê¸° (shrine ë¶€ì°?
 *
 * ë¶€ì¡±í•œ ê²½ìš° (nodeCount < 6) ??cpLen ?°ì„ , ë¶„ê¸° ê¸¸ì´ 0 ?¼ë¡œ ?ì—° degenerate.
 * Shrine ?€ R ë¶„ê¸° ê°€ì§€ ?ì— ë¶€ì°? ë¶„ê¸° ê¸¸ì´ 0 ??ê²½ìš° hub ??W (ì¢? alcove ë¡?fallback.
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

  // 1) ?¸ë“œ ë¶„ë°° ??DEC-039 archetype ?œìŠ¤??(?¬ìš©??ê²°ì • 2026-05-03):
  //    archetype ê°€ì¤‘ì¹˜ (D/L/R ë¹„ìœ¨, branchBudgetPct, branchMaxDepth) ê°€
  //    ë¬´ê¸°??(ì£¼ìƒ‰, ë¶€?? ê¸°ì§ˆ ì¡°í•©?¼ë¡œ ê²°ì •?? ê°™ì? archetype ë¬´ê¸°?¤ë„
  //    itemUid ?œë“œë¡?placement ?¤ì–‘??
  //
  //    archetype.branchBudgetPct ê°€ spokeBudget ì¤?branch ë¹„ìœ¨.
  //    archetype.branchMaxDepth ê°€ branch ìµœë? ê¹Šì´.
  //    spiral archetype ?€ itemUid ??LSB ë¡?L/R ?°ì„¸ ê²°ì • (ë³„ë„ ì²˜ë¦¬).
  //
  //    L/R hub ê°€ì§€???ê¸° ??hub ?¬ë¡¯ (LR) ?€ CP ì²?step + shrine ê°€ ?ìœ .
  const archWeights = ARCHETYPE_WEIGHTS[archetype];
  // spiral ??L/R ë¹„ìœ¨ swap (R ?°ì„¸ ì¼€?´ìŠ¤)
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

  // 2) Hub (Plaza) ??ì§€ì¸?top. placement (col, row) = (0, 0).
  //    Plaza ì¶œêµ¬ = LRU (?¬ìš©??ê²°ì • 2026-05-03). D ?ê¸° ??ëª¨ë“  spoke ê°€ hub ??  //    L/R ì¶œêµ¬ë¥??µí•´ ?œì‘. 'no_down' ?¼ë¡œ D ? ê¸ˆ, 'force_up' ?¼ë¡œ U ê°•ì œ ??  //    LDtk LRU ë³€ì¢?(?? ItemStratum_Level_37) ë§¤ì¹­. ì²œì¥ ?ì—° open ?´ë¼ ?„ì—??  //    Trapdoor ë¡??¨ì–´???¤ì–´?¤ëŠ” ?¤ì´ë¸?ë©”í????ì—° ë´‰í•©.
  const hubId = 'h0';
  const hubNode = makeNode({
    id: hubId, role: 'hub', hubIndex: 0, branchIndex: -1, depth: 0,
    stratumIndex, angleRad: 0, ring: 0,
    tags: ['hub_plaza', 'safe', 'large', 'no_down', 'force_up'],
  });
  hubNode.layout.x = 0; hubNode.layout.y = 0;
  nodes.set(hubId, hubNode);

  // 3) Critical path ??Plaza ê°€ LR ì¶œêµ¬ë§?ê°€ì§€ë¯€ë¡?CP ì²?step ?€ L ?ëŠ” R ê°•ì œ.
  //    ?´í›„ step ?€ D/L/R ?ìœ  zigzag (?¤ì´ë¸?ë©”í?????D ê°€ì¤‘ì¹˜ ?’ìŒ).
  //    ?œì•½:
  //      - ì²?step (d=1): L ?ëŠ” R (D ê¸ˆì?). L/R ë¶„ê¸°?€ ì¶©ëŒ ????ë©€ë¦??í”„.
  //      - ì¤‘ê°„/ë§ˆì?ë§?step: D/L/R ?ìœ , ê°™ì? LR ?°ì† ?Œí”¼, occupied ?Œí”¼.
  //      - col ?€ [-3, +3] ??(Plaza LR ?œì‘ + L/R ë¶„ê¸° ?ˆë¨¸ê¹Œì? ?¬ìœ ).
  //
  //    L/R ë¶„ê¸°??hub ??(-d, 0) / (+d, 0) ì§ì„ ?´ë¼ CP ì²?step ??ê·¸ê²ƒ?¤ê³¼
  //    ì¶©ëŒ?˜ì? ?Šë„ë¡?occupied ???¬ì „ ?±ë¡.
  // CP ì²?step ë¯¸ë¦¬ ê²°ì • ??archetype ??L/R ë¹„ìœ¨ ë°˜ì˜. spiral ì²˜ëŸ¼ ?œìª½ ?°ì„¸
  // archetype ?€ ì²?step ??ê·??°ì„¸ ë°©í–¥ 70% ?•ë„. ê·??¸ëŠ” L/R 50/50.
  // shrine ?„ì¹˜ (ë°˜ë???hub ì¶œêµ¬) ê°€ ì²?step ??ì¢…ì†?˜ë?ë¡?ë¯¸ë¦¬ ê²°ì •.
  const lrSum = cpL + cpR;
  const lProb = lrSum > 0 ? cpL / lrSum : 0.5;
  const cpFirstStepDecision: 'L' | 'R' = rng.next() < lProb ? 'L' : 'R';
  const shrineColPre = cpFirstStepDecision === 'L' ? 1 : -1;

  const cpSteps: Array<'D' | 'L' | 'R'> = [];
  const occupied = new Set<string>(['0,0']); // hub
  occupied.add(`${shrineColPre},0`); // shrine ??CP zigzag ê°€ ì¹¨ë²” ëª»í•˜ê²??¬ì „ ?±ë¡
  for (let d = 1; d <= lLen; d++) occupied.add(`${-d},0`);
  for (let d = 1; d <= rLen; d++) occupied.add(`${d},0`);
  let curCol = 0, curRow = 0;
  for (let d = 1; d <= cpLen; d++) {
    const isFirst = d === 1;
    let chosen: 'D' | 'L' | 'R' = 'D';
    let placed = false;

    if (isFirst) {
      // ì²?step ??Plaza LR ì¶œêµ¬ ?œìš©. cpFirstStepDecision (?„ì—??ë¯¸ë¦¬ ê²°ì •??
      // ?¬ìš© ??shrine ?„ì¹˜?€ ?¼ê???ë³´ì¥.
      chosen = cpFirstStepDecision;
      placed = true;
    } else {
      // ì¤‘ê°„/ë§ˆì?ë§?step ??archetype ê°€ì¤‘ì¹˜ ?¬ìš© (DEC-039 ?¬ìš©??ê²°ì • 2026-05-03).
      // RNG ?„ì  ë¶„í¬ë¡?D/L/R ?„ë³´ ?œì„œ ê²°ì •. ê°€ì¤‘ì¹˜ ?©ì? 1.0 ?•ê·œ??
      // ë§?step ??|curCol| <= max(1, stepsLeftAfter) ê°•ì œ (ë³´ìŠ¤ col=0 ?˜ë ´).
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
        if (Math.abs(nc) > maxColAfter) continue; // col=0 ?˜ë ´ ë¶ˆê?????skip
        if (occupied.has(`${nc},${nr}`)) continue;
        chosen = cand;
        placed = true;
        break;
      }
      if (!placed) {
        // Fallback: ëª¨ë“  ?ìœ  ?„ë³´ ë§‰í˜ ??col ë³´ì • step (curCol ë¶€??ë°˜ë?) ?ëŠ” D.
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
    const kind: 'room' = 'room';
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

  // 4) Boss ???¬ìš©??ê²°ì • (2026-05-03): ë³´ìŠ¤ col ?€ *ë°˜ë“œ?? plaza col ê³??™ì¼
  //    (= 0). Trapdoor ê°€ ë³´ìŠ¤ D ?ì—­??hole ???«ìœ¼ë©?ê·?hole ???¤ìŒ stratum
  //    ??plaza ?„ë¡œ ?•í™•???¨ì–´??player ê°€ plaza ?ˆì— ?ˆì°©?œë‹¤.
  //
  //    boss step ê²°ì •:
  //      - cp.last col == 0 ??step D (?ë™ col=0)
  //      - cp.last col == 1 ??step L (ë³´ì • col=0)
  //      - cp.last col == -1 ??step R (ë³´ì • col=0)
  //    cp zigzag ê°€ |cp.last col| <= 1 ë³´ì¥?˜ë?ë¡?1-step ?¼ë¡œ col=0 ?„ë‹¬.
  //
  //    'no_down' = D ? ê¸ˆ (Trapdoor ?´ë‹¹).
  //    'force_lru' = ë³´ìŠ¤ prefab LRU ë³€ì¢?ê°•ì œ (?…êµ¬ ë³€??ë¬´ê??˜ê²Œ ?µì¼).
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

  // 5) Left branch ??hub ??W ë°©í–¥ spoke ?¬ìŠ¬. placement (-d, 0).
  let prevLeft = hubId;
  for (let d = 1; d <= lLen; d++) {
    const id = `l.${d}`;
    const kind: 'room' = 'room';
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

  // 6) Right branch ??hub ??E ë°©í–¥ spoke ?¬ìŠ¬. placement (+d, 0). shrine ?€ ?ì— ë¶€ì°?
  let prevRight = hubId;
  for (let d = 1; d <= rLen; d++) {
    const id = `r.${d}`;
    const kind: 'room' = 'room';
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

  // 7) Shrine (Archive) ??hub ??CP ì²?step ë°˜ë???ì¶œêµ¬ (?¬ìš©??ê²°ì • 2026-05-02).
  //    shrineColPre ??Â§3 ??occupied ?¬ì „ ?±ë¡ê³??¼ê?.
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
  occupied.add(`${shrineCol},${shrineRow}`); // shrine ?„ì¹˜??branch ?Œí”¼ ?€??
  // 7.5) Dead-end branch (DEC-039 ?¬ìš©??ê²°ì • 2026-05-03) ??CP ?¸ë“œ ?¼ë??ì„œ
  //      ì§ì„  dead-end ê°€ì§€ê°€ 1..branchMaxDepth ê¹Šì´ë¡?ë»—ì–´?˜ì˜´. rarity ê°€ ?’ì„
  //      ?˜ë¡ ê¹Šì? ê°€ì§€. RNG ë¡?CP ?œì„œ ?”í”Œ ??ê°??¸ë“œ??free cardinal (L/R
  //      ?°ì„ , U/D ?„ìˆœ?? ì²?ë°©í–¥?¼ë¡œ ë¶€ì°? ê°™ì? ë°©í–¥ ì§ì„  ?°ì¥.
  //      remaining (branchBudget) ê°€ ?Œì§„???Œê¹Œì§€ ë°˜ë³µ.
  let branchN = 0;
  if (branchBudget > 0 && cpLen > 0 && branchMaxDepth > 0) {
    const cpOrder: number[] = [];
    for (let d = 1; d <= cpLen; d++) cpOrder.push(d);
    for (let i = cpOrder.length - 1; i > 0; i--) {
      const j = rng.nextInt(0, i);
      [cpOrder[i], cpOrder[j]] = [cpOrder[j], cpOrder[i]];
    }
    interface DirCard { dx: number; dy: number; out: ExitSide; in: ExitSide; }
    // L/R ?°ì„  (?˜í‰ ?¤ì–‘??, U/D ?„ìˆœ??
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
      // ì²?ë°©í–¥ ê²°ì • ??L/R ?”í”Œ ??ì²?free ?€ ë°©í–¥ ì±„íƒ.
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

      // ê°€ì§€ ê¹Šì´ ê²°ì • ??1..min(branchMaxDepth, remaining) RNG.
      const depthCap = Math.min(branchMaxDepth, remaining);
      const targetDepth = 1 + rng.nextInt(0, depthCap - 1);

      // ì§ì„  ?°ì¥ ??ê°™ì? ë°©í–¥?¼ë¡œ targetDepth ê¹Œì?. ì¶©ëŒ ??ì¡°ê¸° ì¤‘ë‹¨.
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
        const kind: 'room' = 'room';
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
  // budget ë¯¸ë‹¬ (ëª¨ë“  CP ?„ë³´ ì¶©ëŒ) ??ë¹ ì§„ ë§Œí¼ boss/shrine ???¸ë“œ ?˜ê? ?ì–´
  // validateRoomGraph IWF-R10 ê°€ nodeCount mismatch ë¡?throw ??ê·¸ë˜??ê²Œì„?€ ì§„í–‰.


  // 8) Critical Path ì§‘í•© ??hub + CP spoke + boss
  const criticalPathIds = new Set<string>();
  criticalPathIds.add(hubId);
  for (const node of nodes.values()) {
    if (node.role === 'spoke' && node.branchIndex === BR_CP) criticalPathIds.add(node.id);
  }
  criticalPathIds.add(bossId);

  // 9) Polar layout ?°ì¶œ?€ ?ê¸° ??buildVerticalDive ê°€ layout.x/y ??ì§ì ‘ grid
  //    placement ë¥??€?¥í•˜ë¯€ë¡?overwrite ?˜ì? ?ŠëŠ”?? Adapter ê°€ ê·¸ë?ë¡??¬ìš©.

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
// Horizontal Descent builder
// ---------------------------------------------------------------------------

/**
 * Horizontal Descent builder.
 *
 * Shape intent:
 *   A -- B -- C -- D
 *             |
 *             E
 *             |
 *             F
 *             |
 *             G
 *
 * C is a rectangular LRD descent_anchor room. It is not an L-shaped graph node;
 * LDtk room authoring owns the internal L-shaped movement. E/F are simple UD
 * vertical_shaft rooms. The last vertical node is the boss terminal.
 */
function buildHorizontalDescent(
  def: StratumDef,
  itemUid: number,
  stratumIndex: number,
): RoomGraphData {
  const rng = new PRNG(itemUid * 7919 + stratumIndex * 104729 + def.nodeCount * 31);
  const nodes = new Map<string, RoomNode>();
  const edges: RoomEdge[] = [];
  const nodeCount = Math.max(5, def.nodeCount);

  const minHorizontalLen = Math.min(4, nodeCount - 2);
  const maxHorizontalLen = Math.max(minHorizontalLen, Math.min(nodeCount - 2, Math.max(4, Math.floor(nodeCount * 0.68))));
  const horizontalLen = rng.nextInt(minHorizontalLen, maxHorizontalLen);
  let remainingVerticalBudget = nodeCount - horizontalLen;

  const interiorIndices: number[] = [];
  for (let i = 1; i <= horizontalLen - 2; i++) interiorIndices.push(i);
  const anchorIndex = interiorIndices.length > 0
    ? interiorIndices[rng.nextInt(0, interiorIndices.length - 1)]
    : Math.max(1, horizontalLen - 2);

  const preferredMainLen = rng.nextInt(2, Math.max(2, Math.min(5, remainingVerticalBudget)));
  let mainVerticalLen = Math.min(remainingVerticalBudget, preferredMainLen);
  remainingVerticalBudget -= mainVerticalLen;

  const branchAnchors = rng.shuffle(interiorIndices.filter(i => i !== anchorIndex));
  const branchPlans: Array<{ anchorIndex: number; length: number }> = [];
  while (remainingVerticalBudget > 0 && branchAnchors.length > 0) {
    const anchor = branchAnchors.shift()!;
    const length = rng.nextInt(1, Math.min(3, remainingVerticalBudget));
    branchPlans.push({ anchorIndex: anchor, length });
    remainingVerticalBudget -= length;
  }
  while (remainingVerticalBudget > 0) {
    if (branchPlans.length > 0 && rng.next() < 0.65) {
      branchPlans[rng.nextInt(0, branchPlans.length - 1)].length++;
    } else {
      mainVerticalLen++;
    }
    remainingVerticalBudget--;
  }

  const hubId = 'h0';
  const hubNode = makeNode({
    id: hubId,
    role: 'hub',
    hubIndex: 0,
    branchIndex: -1,
    depth: 0,
    stratumIndex,
    angleRad: ANGLE_RIGHT,
    ring: 0,
    tags: ['hub_plaza', 'safe', 'room', 'horizontal_descent_start'],
  });
  hubNode.layout.x = 0;
  hubNode.layout.y = 0;
  nodes.set(hubId, hubNode);

  const branchAnchorSet = new Set(branchPlans.map(p => p.anchorIndex));
  const horizontalIds: string[] = [hubId];
  let shrineId: string | null = null;
  for (let i = 1; i < horizontalLen; i++) {
    const isMainAnchor = i === anchorIndex;
    const isBranchAnchor = branchAnchorSet.has(i);
    const isRightEnd = i === horizontalLen - 1;
    const id = isMainAnchor ? 'descent_anchor' : isRightEnd ? 'shrine' : `h.${i}`;
    const role: NodeRole = isRightEnd ? 'shrine' : 'spoke';
    const tags = isMainAnchor
      ? ['room', 'descent_anchor']
      : isRightEnd
        ? ['room', 'shrine_alcove', 'safe', 'horizontal_terminal']
        : isBranchAnchor
          ? ['room', 'descent_anchor', 'side_descent_anchor']
          : ['room', 'horizontal_spoke'];
    const node = makeNode({
      id,
      role,
      hubIndex: 0,
      branchIndex: isRightEnd ? BR_RIGHT : BR_CP,
      depth: i,
      stratumIndex,
      angleRad: ANGLE_RIGHT,
      ring: i * RING_UNIT,
      tags,
    });
    node.layout.x = i;
    node.layout.y = 0;
    nodes.set(id, node);
    edges.push(makeEdge(horizontalIds[horizontalIds.length - 1], id, 'tree', 'right', 'left'));
    horizontalIds.push(id);
    if (isRightEnd) shrineId = id;
  }

  const verticalIds: string[] = [];
  let parentId = horizontalIds[anchorIndex];
  for (let j = 1; j <= mainVerticalLen; j++) {
    const isBoss = j === mainVerticalLen;
    const id = isBoss ? 'boss0' : `v.${j}`;
    const node = makeNode({
      id,
      role: isBoss ? 'boss' : 'spoke',
      hubIndex: 0,
      branchIndex: BR_CP,
      depth: anchorIndex + j,
      stratumIndex,
      angleRad: ANGLE_DOWN,
      ring: (anchorIndex + j) * RING_UNIT,
      tags: isBoss
        ? ['room', 'boss_chamber', 'vertical_terminal', 'no_down']
        : ['room', 'vertical_shaft'],
    });
    node.layout.x = anchorIndex;
    node.layout.y = j;
    nodes.set(id, node);
    edges.push(makeEdge(parentId, id, 'tree', 'down', 'up'));
    verticalIds.push(id);
    parentId = id;
  }

  branchPlans.forEach((plan, branchIdx) => {
    let branchParentId = horizontalIds[plan.anchorIndex];
    for (let j = 1; j <= plan.length; j++) {
      const isTerminal = j === plan.length;
      const id = `b.${branchIdx + 1}.${j}`;
      const node = makeNode({
        id,
        role: 'spoke',
        hubIndex: 0,
        branchIndex: BR_LEFT + branchIdx,
        depth: plan.anchorIndex + j,
        stratumIndex,
        angleRad: ANGLE_DOWN,
        ring: (plan.anchorIndex + j) * RING_UNIT,
        tags: isTerminal
          ? ['room', 'vertical_shaft', 'vertical_deadend', 'no_down']
          : ['room', 'vertical_shaft'],
      });
      node.layout.x = plan.anchorIndex;
      node.layout.y = j;
      nodes.set(id, node);
      edges.push(makeEdge(branchParentId, id, 'tree', 'down', 'up'));
      branchParentId = id;
    }
  });

  const criticalPathIds = new Set<string>();
  for (let i = 0; i <= anchorIndex; i++) criticalPathIds.add(horizontalIds[i]);
  for (const id of verticalIds) criticalPathIds.add(id);

  return {
    stratumIndex,
    hubIds: [hubId],
    bossBranchIndex: BR_CP,
    bossId: 'boss0',
    shrineId,
    criticalPathIds,
    nodes,
    edges,
  };
}
// ---------------------------------------------------------------------------// Validation ??DEC-039 invariants ??ë§ê²Œ ?¨ìˆœ??
// ---------------------------------------------------------------------------

export function validateRoomGraph(g: RoomGraphData, def: StratumDef): void {
  // IWF-R10: ?¸ë“œ ???¼ì¹˜ (hub + spoke + boss + shrine)
  if (g.nodes.size !== def.nodeCount) {
    throw new Error(`IWF-R10: nodeCount mismatch ??got ${g.nodes.size}, expected ${def.nodeCount}`);
  }

  // IWF-R11: hub[0] ?ì„œ BFS ?„ë‹¬ ê°€???¸ë“œ ??= ?„ì²´
  const reached = bfsReach(g, g.hubIds[0]);
  if (reached.size !== g.nodes.size) {
    throw new Error(`IWF-R11: graph not fully reachable from hub ??${reached.size}/${g.nodes.size}`);
  }

  // IWF-R17: boss ë³„ë„ ?¸ë“œ
  const bossNode = g.nodes.get(g.bossId);
  if (!bossNode || bossNode.role !== 'boss') {
    throw new Error(`IWF-R17: boss node missing or wrong role`);
  }

  // IWF-R18: shrine ë³„ë„ ?¸ë“œ
  if (!g.shrineId) {
    throw new Error(`IWF-R18: shrine node missing`);
  }
  const shrineNode = g.nodes.get(g.shrineId);
  if (!shrineNode || shrineNode.role !== 'shrine') {
    throw new Error(`IWF-R18: shrine node wrong role`);
  }

  // DEC-039-V1: hub ???•í™•??1ê°?('h0')
  if (g.hubIds.length !== 1 || g.hubIds[0] !== 'h0') {
    throw new Error(`DEC-039-V1: vertical dive requires single hub 'h0', got [${g.hubIds.join(',')}]`);
  }

  // DEC-039-V2: hub ?¸ë“œ??'force_up' ?œê·¸ë¥?ê°€?¸ì•¼ ?œë‹¤ (Plaza LRUD ê°•ì œ??.
  const hub = g.nodes.get(g.hubIds[0])!;
  if (!hub.tags.includes('horizontal_descent_start') && !hub.tags.includes('force_up')) {
    throw new Error(`DEC-039-V2: vertical dive hub must carry 'force_up' tag`);
  }

  // DEC-039-V3: boss ?¸ë“œ??'no_down' ?œê·¸ë¥?ê°€?¸ì•¼ ?œë‹¤ (Trapdoor entity ê°€ ?´ë‹¹).
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

/** placement delta (dx, dy) ??ì¶œêµ¬ ë©?(from = parent's side, to = child's side). */
function sidesByDelta(dx: number, dy: number): { from: ExitSide; to: ExitSide } {
  if (dx === 1 && dy === 0) return { from: 'right', to: 'left' };
  if (dx === -1 && dy === 0) return { from: 'left', to: 'right' };
  if (dx === 0 && dy === 1) return { from: 'down', to: 'up' };
  if (dx === 0 && dy === -1) return { from: 'up', to: 'down' };
  // Non-cardinal-adjacent ??ë°œìƒ?˜ë©´ ???˜ì?ë§??ˆì „?˜ê²Œ down ?¼ë¡œ fallback.
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







