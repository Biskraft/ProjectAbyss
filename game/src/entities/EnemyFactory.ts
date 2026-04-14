/**
 * EnemyFactory.ts
 *
 * Centralized factory for creating enemy instances by type string.
 * Eliminates duplicated if/else chains in LdtkWorldScene and ItemWorldScene.
 */

import { Skeleton } from './Skeleton';
import { Ghost } from './Ghost';
import { Slime } from './Slime';
import { Guardian } from './Guardian';
import { GoldenMonster } from './GoldenMonster';
import type { Enemy } from './Enemy';

export type EnemyTypeName = 'Skeleton' | 'Ghost' | 'Slime' | 'Guardian' | 'GoldenMonster' | 'Boss';

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
    case 'Guardian':
    case 'Boss':
      return new Guardian(level);
    case 'GoldenMonster':
    case 'Golden':
      return new GoldenMonster(goldenDifficulty, level);
    default:
      return new Skeleton(level);
  }
}
