/**
 * Element affinity & damage-multiplier system.
 *
 * Every damageable target (enemy, breakable, future props) declares a single
 * `affinity` tag describing its elemental "family". Incoming damage carries
 * its own source element. The target's `elementMultiplier(src)` returns the
 * scalar applied to the raw amount:
 *
 *   0     — fully immune
 *   0.5   — resistant
 *   1.0   — neutral (default)
 *   1.5   — weak
 *
 * Affinity groups (TileSystem.md §3 / DEC-036):
 *   fire group     = fire, magma     — sources: fire-shard, magma cell, burn DOT
 *   ice group      = ice             — sources: ice-shard, freeze status
 *   thunder group  = thunder         — sources: thunder-shard, charged cell, thunder chain
 *   acid group     = acid            — sources: acid cell, acid residue
 *   physical group = physical        — sources: sword, basic shard hit, thrown container
 *
 * An affinity that matches the incoming source's group is FAMILY-IMMUNE by
 * default. e.g. an enemy with `affinity: 'magma'` ignores both magma-cell
 * damage and fire-shard ignites. This default is what lets new enemies
 * declare just `affinity = 'fire'` and get coherent fire-tribe behavior
 * without listing every immunity manually. Explicit `elementImmune` /
 * `elementResist` / `elementWeak` sets override the family rule.
 */

import type { HazardSource } from '../systems/TileHazards';

export type ElementAffinity =
  | 'fire' | 'ice' | 'thunder'
  | 'acid' | 'magma'
  | 'physical' | 'neutral';

export type ElementGroup = 'fire' | 'ice' | 'thunder' | 'acid' | 'physical' | 'neutral';

const GROUP: Record<ElementAffinity, ElementGroup> = {
  fire:     'fire',
  magma:    'fire',
  ice:      'ice',
  thunder:  'thunder',
  acid:     'acid',
  physical: 'physical',
  neutral:  'neutral',
};

export function elementGroup(e: ElementAffinity): ElementGroup { return GROUP[e]; }

/** Map a TileHazards source string to its parent element. */
export function hazardToElement(src: HazardSource): ElementAffinity {
  switch (src) {
    case 'magma':   return 'magma';
    case 'fire':    return 'fire';
    case 'burn':    return 'fire';
    case 'thunder': return 'thunder';
    case 'charged': return 'thunder';
    case 'acid':    return 'acid';
    case 'cyro':    return 'ice';
  }
}
