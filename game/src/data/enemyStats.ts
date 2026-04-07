/**
 * enemyStats.ts — Enemy stat definitions loaded from CSV.
 *
 * Source: Sheets/Content_Stats_Enemy.csv
 * Columns: Type,Level,HP,ATK,DEF,DetectRange,AttackRange,MoveSpeed,AttackCooldown,JumpTiles
 */

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

// Inline data from Content_Stats_Enemy.csv
const RAW: EnemyStatEntry[] = [
  // Slime
  { type: 'Slime', level: 1, hp: 15, atk: 3, def: 1, detectRange: 0, attackRange: 0, moveSpeed: 30, attackCooldown: 0, jumpTiles: 6 },
  { type: 'Slime', level: 2, hp: 25, atk: 5, def: 2, detectRange: 0, attackRange: 0, moveSpeed: 35, attackCooldown: 0, jumpTiles: 6 },
  { type: 'Slime', level: 3, hp: 40, atk: 8, def: 3, detectRange: 0, attackRange: 0, moveSpeed: 40, attackCooldown: 0, jumpTiles: 6 },
  // Skeleton
  { type: 'Skeleton', level: 1, hp: 40, atk: 8, def: 3, detectRange: 160, attackRange: 18, moveSpeed: 60, attackCooldown: 1200, jumpTiles: 6 },
  { type: 'Skeleton', level: 2, hp: 65, atk: 12, def: 5, detectRange: 180, attackRange: 20, moveSpeed: 70, attackCooldown: 1100, jumpTiles: 6 },
  { type: 'Skeleton', level: 3, hp: 100, atk: 18, def: 8, detectRange: 200, attackRange: 22, moveSpeed: 80, attackCooldown: 1000, jumpTiles: 6 },
  // Ghost
  { type: 'Ghost', level: 1, hp: 30, atk: 6, def: 2, detectRange: 200, attackRange: 120, moveSpeed: 40, attackCooldown: 2000, jumpTiles: 0 },
  { type: 'Ghost', level: 2, hp: 50, atk: 10, def: 3, detectRange: 220, attackRange: 130, moveSpeed: 45, attackCooldown: 1800, jumpTiles: 0 },
  { type: 'Ghost', level: 3, hp: 80, atk: 15, def: 5, detectRange: 240, attackRange: 140, moveSpeed: 50, attackCooldown: 1600, jumpTiles: 0 },
  // GoldenMonster
  { type: 'GoldenMonster', level: 1, hp: 80, atk: 12, def: 5, detectRange: 200, attackRange: 20, moveSpeed: 90, attackCooldown: 1000, jumpTiles: 0 },
  { type: 'GoldenMonster', level: 2, hp: 130, atk: 18, def: 8, detectRange: 220, attackRange: 22, moveSpeed: 100, attackCooldown: 900, jumpTiles: 0 },
  { type: 'GoldenMonster', level: 3, hp: 200, atk: 25, def: 12, detectRange: 240, attackRange: 24, moveSpeed: 110, attackCooldown: 800, jumpTiles: 0 },
  // Guardian (Boss)
  { type: 'Guardian', level: 1, hp: 80, atk: 12, def: 5, detectRange: 300, attackRange: 200, moveSpeed: 50, attackCooldown: 1200, jumpTiles: 0 },
  { type: 'Guardian', level: 2, hp: 150, atk: 20, def: 8, detectRange: 320, attackRange: 220, moveSpeed: 60, attackCooldown: 1000, jumpTiles: 0 },
  { type: 'Guardian', level: 3, hp: 250, atk: 30, def: 12, detectRange: 350, attackRange: 240, moveSpeed: 70, attackCooldown: 800, jumpTiles: 0 },
];

for (const entry of RAW) {
  ENEMY_STATS.set(`${entry.type}:${entry.level}`, entry);
}

/** Get enemy stats for a given type and level. Falls back to level 1. */
export function getEnemyStats(type: string, level: number): EnemyStatEntry {
  return ENEMY_STATS.get(`${type}:${level}`)
    ?? ENEMY_STATS.get(`${type}:1`)
    ?? RAW[0]; // ultimate fallback
}
