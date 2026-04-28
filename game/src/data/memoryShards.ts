/**
 * memoryShards.ts — Memory Shard catalog (DEC-036).
 *
 * "Memory Shard" is the Sword Ego's forgotten memories. Internal type names
 * `Innocent`/`InnocentStatKey` are retained as transitional aliases to avoid a
 * 30+-file ripple; `MemoryShard` is the canonical alias for new code.
 *
 * SSoT:
 *   Shard catalog → Sheets/Content_MemoryShards.csv
 *   Slots/Spawn   → Sheets/Content_Rarity.csv (via rarityConfig.ts)
 *   Spec          → Documents/System/System_Memory_Core.md
 */

import shardCsvText from '../../../Sheets/Content_MemoryShards.csv?raw';
import type { Rarity } from './weapons';
import { getRarityConfig } from './rarityConfig';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InnocentStatKey = 'atk' | 'def' | 'hp';
export type MemoryShardStatKey = InnocentStatKey;

/** 5-color temperament per DEC-036. */
export type Temperament = 'forge' | 'iron' | 'rust' | 'spark' | 'shadow';

export interface Innocent {
  name: string;
  stat: InnocentStatKey;
  value: number;
  /**
   * State per DEC-036: false = Forgotten (50% effect, NPC), true = Recalled (100%, transferable).
   * Field name kept for transitional compat; semantically equivalent to `isRecalled`.
   */
  isSubdued: boolean;
  /** 5-color temperament per DEC-036. May be undefined for legacy data. */
  temperament?: Temperament;
}

export type MemoryShard = Innocent;

/** Per-rarity TOTAL slot count (identity + memory) — SSoT: Sheets/Content_Rarity.csv */
export const INNOCENT_SLOTS_BY_RARITY: Record<Rarity, number> = {
  normal:    getRarityConfig('normal').totalSlots,
  magic:     getRarityConfig('magic').totalSlots,
  rare:      getRarityConfig('rare').totalSlots,
  legendary: getRarityConfig('legendary').totalSlots,
  ancient:   getRarityConfig('ancient').totalSlots,
};

/** Per-rarity Identity slot count (Core Memory only) — DEC-036. */
export const IDENTITY_SLOTS_BY_RARITY: Record<Rarity, number> = {
  normal:    getRarityConfig('normal').identitySlots,
  magic:     getRarityConfig('magic').identitySlots,
  rare:      getRarityConfig('rare').identitySlots,
  legendary: getRarityConfig('legendary').identitySlots,
  ancient:   getRarityConfig('ancient').identitySlots,
};

/** Per-rarity free Memory slot count (Active/Passive shards) — DEC-036. */
export const MEMORY_SLOTS_BY_RARITY: Record<Rarity, number> = {
  normal:    getRarityConfig('normal').memorySlots,
  magic:     getRarityConfig('magic').memorySlots,
  rare:      getRarityConfig('rare').memorySlots,
  legendary: getRarityConfig('legendary').memorySlots,
  ancient:   getRarityConfig('ancient').memorySlots,
};

// ---------------------------------------------------------------------------
// Spawn configuration
// ---------------------------------------------------------------------------

/** Probability (0-1) of a Forgotten Memory Shard NPC spawn — SSoT: Sheets/Content_Rarity.csv */
export const INNOCENT_SPAWN_CHANCE = getRarityConfig('normal').shardSpawnChance;
export const SHARD_SPAWN_CHANCE = INNOCENT_SPAWN_CHANCE;

/** Memory Shard archetype table — SSoT: Sheets/Content_MemoryShards.csv */
interface InnocentArchetype {
  name: string;
  stat: InnocentStatKey;
  baseValue: number;
  temperament?: Temperament;
}

export const INNOCENT_ARCHETYPES: InnocentArchetype[] = [];

const _iLines = shardCsvText.trim().split('\n');
for (let i = 1; i < _iLines.length; i++) {
  const cols = _iLines[i].split(',');
  if (cols.length < 3) continue;
  INNOCENT_ARCHETYPES.push({
    name: cols[0].trim(),
    stat: cols[1].trim() as InnocentStatKey,
    baseValue: parseInt(cols[2]),
    temperament: (cols[3]?.trim() as Temperament) || undefined,
  });
}

// ---------------------------------------------------------------------------
// Effectiveness
// ---------------------------------------------------------------------------

/**
 * Returns the effective bonus for a Memory Shard.
 * Forgotten shards contribute 50% of their value until Recalled (격파) in the Item World.
 */
export function getInnocentEffectiveValue(innocent: Innocent): number {
  const effectiveness = innocent.isSubdued ? 1.0 : 0.5;
  return innocent.value * effectiveness;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates a Forgotten Memory Shard from the given archetype index.
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
    temperament: arch.temperament,
  };
}

/**
 * Creates a random Forgotten Memory Shard using a seeded integer for determinism.
 * seed should be derived from item uid + room position for reproducibility.
 */
export function createRandomInnocent(seed: number, stratumIndex = 0): Innocent {
  const archetypeIndex = seed % INNOCENT_ARCHETYPES.length;
  return createInnocent(archetypeIndex, stratumIndex);
}
