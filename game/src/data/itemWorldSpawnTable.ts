/**
 * itemWorldSpawnTable.ts — Item World enemy spawn pools (2-axis model).
 *
 * SSoT: Sheets/Content_ItemWorld_SpawnTable.csv (imported at build time via ?raw)
 * CSV columns (RES-IWS-01 §7.1 contract):
 *   Family,Behavior,FluidOverride,MinStratum,MaxStratum,Weight,ClusterMin,ClusterMax
 *
 * - Family: forge|iron|rust|spark|shadow — pool key, resolved from the dive
 *   weapon's temperamentPrimary. The special family `boss` feeds the boss slot.
 * - Behavior: implemented enemy type name (EnemyFactory). Attribute-free —
 *   the family's fluid applies via temperament resolution, not per-row.
 * - FluidOverride: parsed per contract; per-enemy fluid module attach is an
 *   M2 work item (no runtime consumer yet).
 * - Min/MaxStratum: depth window. Rarity gating is implicit (stratum count).
 *
 * Edit the CSV in Sheets/; rebuild picks it up automatically.
 */

import csvText from '../../../Sheets/Content_ItemWorld_SpawnTable.csv?raw';

export interface FamilySpawnEntry {
  family: string;
  enemyType: string;
  fluidOverride: string;
  minStratum: number;
  maxStratum: number;
  weight: number;
  clusterMin: number;
  clusterMax: number;
}

// Index by family ('forge'|'iron'|'rust'|'spark'|'shadow'|'boss')
const POOLS = new Map<string, FamilySpawnEntry[]>();

const DEFAULT_FAMILY = 'forge';

/** Parse CSV text into family pools. */
function parseCSV(text: string): void {
  POOLS.clear();
  const lines = text.trim().split('\n');
  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].trim().split(',');
    if (cols.length < 8) continue;

    const entry: FamilySpawnEntry = {
      family: cols[0].trim().toLowerCase(),
      enemyType: cols[1].trim(),
      fluidOverride: cols[2].trim().toLowerCase(),
      minStratum: parseInt(cols[3].trim(), 10),
      maxStratum: parseInt(cols[4].trim(), 10),
      weight: parseInt(cols[5].trim(), 10),
      clusterMin: parseInt(cols[6].trim(), 10),
      clusterMax: parseInt(cols[7].trim(), 10),
    };
    if (!entry.family || !entry.enemyType) continue;

    if (!POOLS.has(entry.family)) POOLS.set(entry.family, []);
    POOLS.get(entry.family)!.push(entry);
  }
}

// Parse at module load — synchronous, deterministic, no fetch.
parseCSV(csvText);

/**
 * Legacy async shim — kept for backward compatibility with callers.
 * Data is already loaded at module import time; this is a no-op.
 */
export async function loadSpawnTable(): Promise<void> {
  return;
}

/**
 * Get the spawn pool for a family, filtered by stratum depth window (1-based).
 * Unknown/missing family falls back to the default family pool.
 */
export function getFamilyPool(family: string | null | undefined, stratum: number): FamilySpawnEntry[] {
  const pool = POOLS.get((family ?? DEFAULT_FAMILY).toLowerCase())
    ?? POOLS.get(DEFAULT_FAMILY)
    ?? [];
  return pool.filter(e => stratum >= e.minStratum && stratum <= e.maxStratum);
}

/** Get the boss entry for a stratum (special `boss` family pool). */
export function getBossEntry(stratum: number): FamilySpawnEntry | null {
  const pool = POOLS.get('boss') ?? [];
  return pool.find(e => stratum >= e.minStratum && stratum <= e.maxStratum) ?? null;
}

/** Pick a random entry from weighted entries using a PRNG value (0~1). */
export function pickWeightedEnemy(entries: FamilySpawnEntry[], roll: number): FamilySpawnEntry | null {
  if (entries.length === 0) return null;
  const totalWeight = entries.reduce((sum, e) => sum + e.weight, 0);
  let cumulative = 0;
  for (const entry of entries) {
    cumulative += entry.weight;
    if (roll * totalWeight < cumulative) return entry;
  }
  return entries[entries.length - 1];
}
