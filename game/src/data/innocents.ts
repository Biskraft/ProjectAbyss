/**
 * innocents.ts
 *
 * Innocent type definitions, slot tables, spawn chance, and factory function.
 *
 * SSoT:
 *   Archetypes → Sheets/Content_Innocents.csv
 *   Slots/Spawn → Sheets/Content_Rarity.csv (via rarityConfig.ts)
 */

import innocentCsvText from '../../../Sheets/Content_Innocents.csv?raw';
import type { Rarity } from './weapons';
import { getRarityConfig } from './rarityConfig';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InnocentStatKey = 'atk' | 'def' | 'hp' | 'exp%' | 'luck';

export interface Innocent {
  name: string;
  stat: InnocentStatKey;
  value: number;
  isSubdued: boolean;
}

/** Per-rarity slot count — SSoT: Sheets/Content_Rarity.csv */
export const INNOCENT_SLOTS_BY_RARITY: Record<Rarity, number> = {
  normal:    getRarityConfig('normal').innocentSlots,
  magic:     getRarityConfig('magic').innocentSlots,
  rare:      getRarityConfig('rare').innocentSlots,
  legendary: getRarityConfig('legendary').innocentSlots,
  ancient:   getRarityConfig('ancient').innocentSlots,
};

// ---------------------------------------------------------------------------
// Spawn configuration
// ---------------------------------------------------------------------------

/** Probability (0-1) — SSoT: Sheets/Content_Rarity.csv */
export const INNOCENT_SPAWN_CHANCE = getRarityConfig('normal').innocentSpawnChance;

/** Innocent archetype table — SSoT: Sheets/Content_Innocents.csv */
interface InnocentArchetype {
  name: string;
  stat: InnocentStatKey;
  baseValue: number;
}

export const INNOCENT_ARCHETYPES: InnocentArchetype[] = [];

const _iLines = innocentCsvText.trim().split('\n');
for (let i = 1; i < _iLines.length; i++) {
  const cols = _iLines[i].split(',');
  if (cols.length < 3) continue;
  INNOCENT_ARCHETYPES.push({
    name: cols[0].trim(),
    stat: cols[1].trim() as InnocentStatKey,
    baseValue: parseInt(cols[2]),
  });
}

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
