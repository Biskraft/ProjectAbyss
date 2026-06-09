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
import { MawDrone } from './MawDrone';
import {
  Bulwark,
  CinderImp,
  Conduit,
  Lobber,
  Lurker,
  Sentry,
  B07_Gunner,
  B20_Flit,
  B24_Gunship,
  B25_AirBomber,
  B27_Carrier,
  B35_Bunker,
  B37_Totem,
  B39_Emitter,
  B45_HiddenSniper,
  B46_TrapLayer,
  B50_CeilingDropling,
  B52_WallGun,
  B53_Kamikaze,
  B54_Volatile,
  B55_Brood,
  B56_Rupture,
  B57_AirKamikaze,
  B58_AirBrood,
  SparkBat,
} from './ArchetypeEnemies';
// Guardian: ?먭린 ?꾨낫 (Boss01 ?쇰줈 ?듯빀). import ?쒓굅 ???꾩슂 ???ㅼ떆 異붽?.
import type { Enemy } from './Enemy';

export type EnemyTypeName = string;

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
    case 'B07_Gunner':
      return new B07_Gunner(level);
    case 'B20_Flit':
      return new B20_Flit(level);
    case 'B24_Gunship':
      return new B24_Gunship(level);
    case 'B25_AirBomber':
      return new B25_AirBomber(level);
    case 'B27_Carrier':
      return new B27_Carrier(level);
    case 'B35_Bunker':
      return new B35_Bunker(level);
    case 'B37_Totem':
      return new B37_Totem(level);
    case 'B39_Emitter':
      return new B39_Emitter(level);
    case 'B45_HiddenSniper':
      return new B45_HiddenSniper(level);
    case 'B46_TrapLayer':
      return new B46_TrapLayer(level);
    case 'B50_CeilingDropling':
      return new B50_CeilingDropling(level);
    case 'B52_WallGun':
      return new B52_WallGun(level);
    case 'B53_Kamikaze':
      return new B53_Kamikaze(level);
    case 'B54_Volatile':
      return new B54_Volatile(level);
    case 'B55_Brood':
      return new B55_Brood(level);
    case 'B56_Rupture':
      return new B56_Rupture(level);
    case 'B57_AirKamikaze':
      return new B57_AirKamikaze(level);
    case 'B58_AirBrood':
      return new B58_AirBrood(level);
    case 'Ghost':
      return new Ghost(level);
    case 'Slime':
      return new Slime(level);
    case 'MawDrone':
      return new MawDrone(level);
    case 'SparkBat':
      return new SparkBat(level);
    case 'CinderImp':
      return new CinderImp(level);
    case 'Lobber':
      return new Lobber(level);
    case 'Bulwark':
      return new Bulwark(level);
    case 'Lurker':
      return new Lurker(level);
    case 'Conduit':
      return new Conduit(level);
    case 'Sentry':
      return new Sentry(level);
    // 'Guardian' / 'Boss' / 'Boss01' 紐⑤몢 Boss01 ?쇰줈 ?듯빀 ??24-frame atlas 湲곕컲
    // ?좉퇋 蹂댁뒪濡??쒓컖 ?듭씪. Guardian ?대옒?ㅻ뒗 import 留??좎? (rollback ??.
    case 'Guardian':
    case 'Boss':
    case 'Boss01':
      return new Boss01(level);
    case 'GoldenMonster':
    case 'Golden':
      return new GoldenMonster(goldenDifficulty, level);
    default:
      if (/^B\d{2}_/.test(type)) {
        console.warn('[EnemyFactory] unknown B-series type, fallback to Skeleton:', type);
      }
      return new Skeleton(level);
  }
}

