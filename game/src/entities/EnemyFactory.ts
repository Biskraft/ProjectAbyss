/**
 * EnemyFactory.ts
 *
 * Centralized factory for creating enemy instances by type string.
 * Eliminates duplicated if/else chains in LdtkWorldScene and ItemWorldScene.
 */

import { Skeleton } from './Skeleton';
import { Ghost } from './Ghost';
import { Slime } from './Slime';
import { GoldenMonster } from './GoldenMonster';
import { Boss01 } from './Boss01';
// Guardian: 폐기 후보 (Boss01 으로 통합). import 제거 — 필요 시 다시 추가.
import type { Enemy } from './Enemy';

export type EnemyTypeName = 'Skeleton' | 'Ghost' | 'Slime' | 'WeakSlime' | 'Guardian' | 'GoldenMonster' | 'Boss' | 'Boss01';

/**
 * Create an enemy instance by type name.
 * @param type - Enemy type string (from LDtk field or spawn table)
 * @param level - Enemy level for stat scaling
 * @param goldenDifficulty - Difficulty tier for GoldenMonster ('low'|'mid'|'high')
 * @returns Enemy instance, or Skeleton as default fallback
 */
export function createEnemy(
  type: string,
  level = 1,
  goldenDifficulty: 'low' | 'mid' | 'high' = 'mid',
): Enemy<string> {
  switch (type) {
    case 'Ghost':
      return new Ghost(level);
    case 'Slime':
      return new Slime(level);
    case 'WeakSlime':
      return new Slime(level, 'WeakSlime');
    // 'Guardian' / 'Boss' / 'Boss01' 모두 Boss01 으로 통합 — 24-frame atlas 기반
    // 신규 보스로 시각 통일. Guardian 클래스는 import 만 유지 (rollback 용).
    case 'Guardian':
    case 'Boss':
    case 'Boss01':
      return new Boss01(level);
    case 'GoldenMonster':
    case 'Golden':
      return new GoldenMonster(goldenDifficulty, level);
    default:
      return new Skeleton(level);
  }
}
