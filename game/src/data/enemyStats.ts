/**
 * enemyStats.ts — Enemy stats loaded from CSV at build time.
 *
 * SSoT: Sheets/Content_Stats_Enemy.csv
 * CSV 수정 시 코드 변경 불필요. 빌드만 다시 하면 반영됨.
 */

import csvText from '../../../Sheets/Content_Stats_Enemy.csv?raw';
import { resolveGenericFluidType } from './ItemWorldFluidMapping';

export type MovementType = 'ground' | 'flying';

/**
 * 몬스터 속성(Attribute) — fluid 물질 1종.
 * SSoT 원칙(System_Enemy_MonsterArchetype.md §1.1 명제 2): 모든 몬스터는 속성을 가진다.
 * 무속성("none") 금지. CSV `Attribute` 가 비면 지층 테마(temperament)가 자동 바인딩한다.
 */
export type EnemyAttribute = 'water' | 'magma' | 'oil' | 'acid' | 'charged' | 'cyro';

const VALID_ATTRIBUTES: ReadonlySet<EnemyAttribute> = new Set<EnemyAttribute>([
  'water', 'magma', 'oil', 'acid', 'charged', 'cyro',
]);

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
  exp: number;
  movementType: MovementType;
  /** 명시 속성 override. undefined 면 스폰 시 테마 폴백(resolveEnemyAttribute). */
  attribute?: EnemyAttribute;
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
    exp: cols.length >= 11 ? parseInt(cols[10]) : 0,
    movementType: (cols.length >= 12 ? cols[11].trim().toLowerCase() : 'ground') as MovementType,
    attribute: parseAttribute(cols.length >= 13 ? cols[12] : ''),
  };

  ENEMY_STATS.set(`${entry.type}:${entry.level}`, entry);
}

/** CSV Attribute 셀 → EnemyAttribute | undefined (빈 값/무효 = undefined → 테마 폴백). */
function parseAttribute(raw: string | undefined): EnemyAttribute | undefined {
  const v = (raw ?? '').trim().toLowerCase();
  return VALID_ATTRIBUTES.has(v as EnemyAttribute) ? (v as EnemyAttribute) : undefined;
}

/**
 * 몬스터의 최종 속성을 해석한다. 명시 속성(CSV Attribute)이 있으면 그대로,
 * 없으면 지층 테마(temperament)의 primary fluid 로 폴백한다.
 *
 * **무속성 폴백 없음** — 항상 6 fluid 중 하나를 반환한다 (§1.1 명제 2 강제).
 * temperament 가 null/미정이면 ItemWorldFluidMapping 의 DEFAULT_TEMPERAMENT(forge→magma).
 *
 * @param explicit  EnemyStatEntry.attribute (명시 override) 또는 undefined
 * @param temperament  현 다이브 무기 기질 ('forge'|'iron'|'rust'|'spark'|'shadow') 또는 null
 */
export function resolveEnemyAttribute(
  explicit: EnemyAttribute | undefined,
  temperament: string | null | undefined,
): EnemyAttribute {
  if (explicit && VALID_ATTRIBUTES.has(explicit)) return explicit;
  // generic_a = 해당 temperament 의 primary fluid (slotA). 항상 fluid invariant.
  return resolveGenericFluidType('generic_a', temperament);
}

/** Get enemy stats for a given type and level. Falls back to level 1. */
export function getEnemyStats(type: string, level: number): EnemyStatEntry {
  return ENEMY_STATS.get(`${type}:${level}`)
    ?? ENEMY_STATS.get(`${type}:1`)
    ?? { type, level: 1, hp: 50, atk: 10, def: 1, detectRange: 160, attackRange: 18, moveSpeed: 60, attackCooldown: 1200, jumpTiles: 0, exp: 0, movementType: 'ground' as MovementType };
}
