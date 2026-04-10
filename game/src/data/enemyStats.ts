/**
 * enemyStats.ts — Enemy stats loaded from CSV at build time.
 *
 * SSoT: Sheets/Content_Stats_Enemy.csv
 * CSV 수정 시 코드 변경 불필요. 빌드만 다시 하면 반영됨.
 */

import csvText from '../../../Sheets/Content_Stats_Enemy.csv?raw';

export interface EnemyStatEntry {
  type: string;
  level: number;
  hp: number;
  atk: number;
  def: number;
  detectRange: number;
  attackRange: number;
  moveSpeed: number;
  attackCooldown: number;
  jumpTiles: number;
}

/** All enemy stats indexed by "Type:Level" key. */
const ENEMY_STATS = new Map<string, EnemyStatEntry>();

// Parse CSV at module load
const lines = csvText.trim().split('\n');
for (let i = 1; i < lines.length; i++) {  // skip header
  const cols = lines[i].split(',');
  if (cols.length < 10) continue;

  const entry: EnemyStatEntry = {
    type: cols[0].trim(),
    level: parseInt(cols[1]),
    hp: parseInt(cols[2]),
    atk: parseInt(cols[3]),
    def: parseInt(cols[4]),
    detectRange: parseInt(cols[5]),
    attackRange: parseInt(cols[6]),
    moveSpeed: parseInt(cols[7]),
    attackCooldown: parseInt(cols[8]),
    jumpTiles: parseInt(cols[9]),
  };

  ENEMY_STATS.set(`${entry.type}:${entry.level}`, entry);
}

/** Get enemy stats for a given type and level. Falls back to level 1. */
export function getEnemyStats(type: string, level: number): EnemyStatEntry {
  return ENEMY_STATS.get(`${type}:${level}`)
    ?? ENEMY_STATS.get(`${type}:1`)
    ?? { type, level: 1, hp: 50, atk: 10, def: 1, detectRange: 160, attackRange: 18, moveSpeed: 60, attackCooldown: 1200, jumpTiles: 0 };
}
