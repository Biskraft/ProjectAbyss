/**
 * itemWorldSpawnTable.ts — Item World enemy spawn configuration.
 *
 * Loads from data/Content_ItemWorld_SpawnTable.csv at runtime.
 * CSV columns: Rarity,Stratum,EnemyType,Weight,Level,MinCount,MaxCount,IsBoss
 */

import type { Rarity } from '@data/weapons';

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
let loaded = false;

/** Parse CSV text into spawn table. */
function parseCSV(csvText: string): void {
  SPAWN_TABLE.clear();
  const lines = csvText.trim().split('\n');
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
  loaded = true;
}

/** Load spawn table from CSV. Call once during init. */
export async function loadSpawnTable(): Promise<void> {
  if (loaded) return;
  try {
    const res = await fetch('data/Content_ItemWorld_SpawnTable.csv');
    const text = await res.text();
    parseCSV(text);
  } catch (e) {
    console.error('[SpawnTable] Failed to load CSV, using fallback', e);
    // Minimal fallback
    SPAWN_TABLE.set('normal:1', {
      normal: [
        { enemyType: 'Slime', weight: 70, level: 1, minCount: 2, maxCount: 3, isBoss: false },
        { enemyType: 'Skeleton', weight: 30, level: 1, minCount: 1, maxCount: 2, isBoss: false },
      ],
      boss: { enemyType: 'Guardian', weight: 100, level: 1, minCount: 1, maxCount: 1, isBoss: true },
    });
    loaded = true;
  }
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
