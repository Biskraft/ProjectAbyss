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

// Inline data synced from Content_Stats_Enemy.csv (2026-04-09)
const RAW: EnemyStatEntry[] = [
  // Slime — Lv.1: ~4타 (ATK25 기준)
  { type: 'Slime', level: 1, hp: 80, atk: 16, def: 1, detectRange: 0, attackRange: 0, moveSpeed: 30, attackCooldown: 0, jumpTiles: 4 },
  { type: 'Slime', level: 2, hp: 200, atk: 32, def: 2, detectRange: 0, attackRange: 0, moveSpeed: 35, attackCooldown: 0, jumpTiles: 4 },
  { type: 'Slime', level: 3, hp: 500, atk: 64, def: 4, detectRange: 0, attackRange: 0, moveSpeed: 40, attackCooldown: 0, jumpTiles: 4 },
  // Skeleton — Lv.1: ~5타
  { type: 'Skeleton', level: 1, hp: 100, atk: 32, def: 3, detectRange: 160, attackRange: 18, moveSpeed: 60, attackCooldown: 1200, jumpTiles: 5 },
  { type: 'Skeleton', level: 2, hp: 250, atk: 64, def: 6, detectRange: 180, attackRange: 20, moveSpeed: 70, attackCooldown: 1100, jumpTiles: 5 },
  { type: 'Skeleton', level: 3, hp: 625, atk: 128, def: 12, detectRange: 200, attackRange: 22, moveSpeed: 80, attackCooldown: 1000, jumpTiles: 5 },
  // Ghost — Lv.1: ~2타
  { type: 'Ghost', level: 1, hp: 50, atk: 24, def: 1, detectRange: 200, attackRange: 120, moveSpeed: 40, attackCooldown: 2000, jumpTiles: 0 },
  { type: 'Ghost', level: 2, hp: 125, atk: 48, def: 2, detectRange: 220, attackRange: 130, moveSpeed: 45, attackCooldown: 1800, jumpTiles: 0 },
  { type: 'Ghost', level: 3, hp: 310, atk: 96, def: 4, detectRange: 240, attackRange: 140, moveSpeed: 50, attackCooldown: 1600, jumpTiles: 0 },
  // GoldenMonster — Lv.1: ~6타
  { type: 'GoldenMonster', level: 1, hp: 120, atk: 40, def: 4, detectRange: 200, attackRange: 20, moveSpeed: 90, attackCooldown: 1000, jumpTiles: 0 },
  { type: 'GoldenMonster', level: 2, hp: 300, atk: 80, def: 8, detectRange: 220, attackRange: 22, moveSpeed: 100, attackCooldown: 900, jumpTiles: 0 },
  { type: 'GoldenMonster', level: 3, hp: 750, atk: 160, def: 16, detectRange: 240, attackRange: 24, moveSpeed: 110, attackCooldown: 800, jumpTiles: 0 },
  // Guardian (Boss) — Lv.1: ~27타, 장기전
  { type: 'Guardian', level: 1, hp: 600, atk: 30, def: 5, detectRange: 300, attackRange: 200, moveSpeed: 50, attackCooldown: 1200, jumpTiles: 0 },
  { type: 'Guardian', level: 2, hp: 1200, atk: 45, def: 10, detectRange: 320, attackRange: 220, moveSpeed: 60, attackCooldown: 1000, jumpTiles: 0 },
  { type: 'Guardian', level: 3, hp: 2400, atk: 60, def: 20, detectRange: 350, attackRange: 240, moveSpeed: 70, attackCooldown: 800, jumpTiles: 0 },
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
