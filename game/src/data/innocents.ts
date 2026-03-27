/**
 * innocents.ts
 *
 * Innocent type definitions, slot tables, spawn chance, and factory function.
 * Implements System_ItemNarrative_* — Innocent residents that grant bonus stats
 * to items they inhabit.
 *
 * Wild innocents = 50% effectiveness (need to be subdued to reach 100%).
 * Stat keys: 'atk', 'def', 'hp', 'exp%', 'luck'
 *
 * Design ref: System_ItemWorld_Core.md — Innocent System
 */

import type { Rarity } from './weapons';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The five stat keys an innocent can buff. */
export type InnocentStatKey = 'atk' | 'def' | 'hp' | 'exp%' | 'luck';

/** A single innocent resident living inside an item. */
export interface Innocent {
  /** Display name shown in item tooltip and Item World HUD. */
  name: string;
  /** Which stat this innocent amplifies. */
  stat: InnocentStatKey;
  /** Raw bonus value at full (subdued) effectiveness. */
  value: number;
  /**
   * Whether the player has subdued (defeated) this innocent in the Item World.
   * Wild = 50% effectiveness. Subdued = 100%.
   */
  isSubdued: boolean;
}

/** Per-rarity slot count (max innocents an item may contain). */
export const INNOCENT_SLOTS_BY_RARITY: Record<Rarity, number> = {
  normal:    2,
  magic:     3,
  rare:      4,
  legendary: 6,
  ancient:   8,
};

// ---------------------------------------------------------------------------
// Spawn configuration
// ---------------------------------------------------------------------------

/** Probability (0–1) that any given enemy spawn is replaced by an InnocentNPC. */
export const INNOCENT_SPAWN_CHANCE = 0.15;

/** Innocent archetype table — designer-tunable values. */
interface InnocentArchetype {
  name: string;
  stat: InnocentStatKey;
  baseValue: number;
}

export const INNOCENT_ARCHETYPES: InnocentArchetype[] = [
  { name: 'Gladiator',  stat: 'atk',  baseValue: 5  },
  { name: 'Guardian',   stat: 'def',  baseValue: 8  },
  { name: 'Vitality',   stat: 'hp',   baseValue: 20 },
  { name: 'Scholar',    stat: 'exp%', baseValue: 10 },
  { name: 'Fortune',    stat: 'luck', baseValue: 6  },
];

// ---------------------------------------------------------------------------
// Effectiveness
// ---------------------------------------------------------------------------

/**
 * Returns the effective bonus for an innocent.
 * Wild innocents contribute 50% of their value until subdued in the Item World.
 */
export function getInnocentEffectiveValue(innocent: Innocent): number {
  const effectiveness = innocent.isSubdued ? 1.0 : 0.5;
  return innocent.value * effectiveness;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates a wild innocent from the given archetype index.
 * Value scales slightly with stratum depth (stratumIndex 0-based).
 */
export function createInnocent(archetypeIndex: number, stratumIndex = 0): Innocent {
  const arch = INNOCENT_ARCHETYPES[archetypeIndex % INNOCENT_ARCHETYPES.length];
  const scaledValue = Math.floor(arch.baseValue * (1 + stratumIndex * 0.3));
  return {
    name: arch.name,
    stat: arch.stat,
    value: scaledValue,
    isSubdued: false,
  };
}

/**
 * Creates a random wild innocent using a seeded integer for determinism.
 * seed should be derived from item uid + room position for reproducibility.
 */
export function createRandomInnocent(seed: number, stratumIndex = 0): Innocent {
  const archetypeIndex = seed % INNOCENT_ARCHETYPES.length;
  return createInnocent(archetypeIndex, stratumIndex);
}
