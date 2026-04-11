/**
 * itemWorldSpawnTable.ts — Item World enemy spawn configuration.
 *
 * SSoT: Sheets/Content_ItemWorld_SpawnTable.csv (imported at build time via ?raw)
 * CSV columns: Rarity,Stratum,EnemyType,Weight,Level,MinCount,MaxCount,IsBoss
 *
 * Edit the CSV in Sheets/; rebuild picks it up automatically.
 */

import type { Rarity } from '@data/weapons';
import csvText from '../../../Sheets/Content_ItemWorld_SpawnTable.csv?raw';

export interface SpawnEntry {
  enemyType: string;
  weight: number;
  level: number;
  minCount: number;
  maxCount: number;
  isBoss: boolean;
}

interface SpawnBucket {
  normal: SpawnEntry[];
  boss: SpawnEntry | null;
}

// Index by "rarity:stratum"
const SPAWN_TABLE = new Map<string, SpawnBucket>();

/** Parse CSV text into spawn table. */
function parseCSV(text: string): void {
  SPAWN_TABLE.clear();
  const lines = text.trim().split('\n');
  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].trim().split(',');
    if (cols.length < 8) continue;

    const rarity = cols[0].trim().toLowerCase();
    const stratum = parseInt(cols[1].trim(), 10);
    const entry: SpawnEntry = {
      enemyType: cols[2].trim(),
      weight: parseInt(cols[3].trim(), 10),
      level: parseInt(cols[4].trim(), 10),
      minCount: parseInt(cols[5].trim(), 10),
      maxCount: parseInt(cols[6].trim(), 10),
      isBoss: cols[7].trim().toLowerCase() === 'true',
    };

    const key = `${rarity}:${stratum}`;
    if (!SPAWN_TABLE.has(key)) {
      SPAWN_TABLE.set(key, { normal: [], boss: null });
    }
    const bucket = SPAWN_TABLE.get(key)!;
    if (entry.isBoss) {
      bucket.boss = entry;
    } else {
      bucket.normal.push(entry);
    }
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

/** Get spawn entries for a given rarity and stratum (1-based). */
export function getSpawnTable(rarity: Rarity, stratum: number): SpawnBucket {
  return SPAWN_TABLE.get(`${rarity}:${stratum}`) ?? { normal: [], boss: null };
}

/** Pick a random enemy type from weighted entries using a PRNG value (0~1). */
export function pickWeightedEnemy(entries: SpawnEntry[], roll: number): SpawnEntry | null {
  if (entries.length === 0) return null;
  const totalWeight = entries.reduce((sum, e) => sum + e.weight, 0);
  let cumulative = 0;
  for (const entry of entries) {
    cumulative += entry.weight;
    if (roll * totalWeight < cumulative) return entry;
  }
  return entries[entries.length - 1];
}
