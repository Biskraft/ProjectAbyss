/**
 * enemyStats.ts - Enemy stats and behavior loaded from CSV at build time.
 *
 * SSoT:
 * - Sheets/Content_Stats_Enemy.csv: simple numeric rewards/stats only.
 * - Sheets/Content_Enemy.csv: behavior/movement/attribute tuning.
 */

import statCsvText from '../../../Sheets/Content_Stats_Enemy.csv?raw';
import behaviorCsvText from '../../../Sheets/Content_Enemy.csv?raw';
import { resolveGenericFluidType } from './ItemWorldFluidMapping';

export type MovementType = 'ground' | 'flying' | 'surface';

/**
 * Enemy elemental attribute. Empty CSV Attribute means the Item World
 * temperament resolves the final attribute through resolveEnemyAttribute().
 */
export type EnemyAttribute = 'water' | 'magma' | 'oil' | 'acid' | 'charged' | 'cyro';

const VALID_ATTRIBUTES: ReadonlySet<EnemyAttribute> = new Set<EnemyAttribute>([
  'water', 'magma', 'oil', 'acid', 'charged', 'cyro',
]);

const VALID_MOVEMENT_TYPES: ReadonlySet<MovementType> = new Set<MovementType>([
  'ground', 'flying', 'surface',
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
  /** Explicit attribute override. Undefined means spawn-theme fallback. */
  attribute?: EnemyAttribute;
}

interface EnemyStatRow {
  type: string;
  level: number;
  hp: number;
  atk: number;
  def: number;
  exp: number;
}

interface EnemyBehaviorEntry {
  type: string;
  detectRange: number;
  attackRange: number;
  moveSpeed: number;
  attackCooldown: number;
  jumpTiles: number;
  movementType: MovementType;
  attribute?: EnemyAttribute;
  archetype: string;
}

const DEFAULT_BEHAVIOR: Omit<EnemyBehaviorEntry, 'type' | 'level'> = {
  detectRange: 160,
  attackRange: 18,
  moveSpeed: 60,
  attackCooldown: 1200,
  jumpTiles: 0,
  movementType: 'ground',
  attribute: undefined,
  archetype: '',
};

const DEFAULT_STAT: Omit<EnemyStatRow, 'type' | 'level'> = {
  hp: 50,
  atk: 10,
  def: 1,
  exp: 0,
};

const ENEMY_STAT_ROWS = new Map<string, EnemyStatRow>();
const ENEMY_BEHAVIORS = new Map<string, EnemyBehaviorEntry>();

for (const row of parseCsvRows(statCsvText)) {
  const entry: EnemyStatRow = {
    type: value(row, 'Type'),
    level: intValue(row, 'Level', 1),
    hp: intValue(row, 'HP', DEFAULT_STAT.hp),
    atk: intValue(row, 'ATK', DEFAULT_STAT.atk),
    def: intValue(row, 'DEF', DEFAULT_STAT.def),
    exp: intValue(row, 'Exp', DEFAULT_STAT.exp),
  };
  if (!entry.type) continue;
  ENEMY_STAT_ROWS.set(key(entry.type, entry.level), entry);
}

for (const row of parseCsvRows(behaviorCsvText)) {
  const movementType = movementValue(row, 'MovementType', DEFAULT_BEHAVIOR.movementType);
  const entry: EnemyBehaviorEntry = {
    type: value(row, 'Type'),
    detectRange: intValue(row, 'DetectRange', DEFAULT_BEHAVIOR.detectRange),
    attackRange: intValue(row, 'AttackRange', DEFAULT_BEHAVIOR.attackRange),
    moveSpeed: intValue(row, 'MoveSpeed', DEFAULT_BEHAVIOR.moveSpeed),
    attackCooldown: intValue(row, 'AttackCooldown', DEFAULT_BEHAVIOR.attackCooldown),
    jumpTiles: intValue(row, 'JumpTiles', DEFAULT_BEHAVIOR.jumpTiles),
    movementType,
    attribute: parseAttribute(value(row, 'Attribute')),
    archetype: value(row, 'Archetype'),
  };
  if (!entry.type) continue;
  ENEMY_BEHAVIORS.set(entry.type, entry);
}

function key(type: string, level: number): string {
  return `${type}:${level}`;
}

function parseCsvRows(text: string): Array<Record<string, string>> {
  const lines = text.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length <= 1) return [];
  const headers = splitCsvLine(lines[0]).map(header => header.trim());
  const rows: Array<Record<string, string>> = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const row: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      row[headers[c]] = (cols[c] ?? '').trim();
    }
    rows.push(row);
  }
  return rows;
}

function splitCsvLine(line: string): string[] {
  const cols: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (ch === ',' && !quoted) {
      cols.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  cols.push(cur);
  return cols;
}

function value(row: Record<string, string>, field: string): string {
  return (row[field] ?? '').trim();
}

function intValue(row: Record<string, string>, field: string, fallback: number): number {
  const parsed = Number.parseInt(value(row, field), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function movementValue(
  row: Record<string, string>,
  field: string,
  fallback: MovementType,
): MovementType {
  const raw = value(row, field).toLowerCase();
  return VALID_MOVEMENT_TYPES.has(raw as MovementType) ? raw as MovementType : fallback;
}

/** CSV Attribute to EnemyAttribute | undefined. Empty/invalid means theme fallback. */
function parseAttribute(raw: string | undefined): EnemyAttribute | undefined {
  const v = (raw ?? '').trim().toLowerCase();
  return VALID_ATTRIBUTES.has(v as EnemyAttribute) ? (v as EnemyAttribute) : undefined;
}

/**
 * Resolve the final enemy attribute. Explicit CSV Attribute wins; otherwise the
 * Item World temperament primary fluid is used. This preserves the invariant
 * that every spawned monster has one fluid attribute at runtime.
 */
export function resolveEnemyAttribute(
  explicit: EnemyAttribute | undefined,
  temperament: string | null | undefined,
): EnemyAttribute {
  if (explicit && VALID_ATTRIBUTES.has(explicit)) return explicit;
  return resolveGenericFluidType('generic_a', temperament);
}

/** Get enemy stats and behavior for a given type/level. Falls back to level 1. */
export function getEnemyStats(type: string, level: number): EnemyStatEntry {
  const stats = ENEMY_STAT_ROWS.get(key(type, level))
    ?? ENEMY_STAT_ROWS.get(key(type, 1));
  const behavior = ENEMY_BEHAVIORS.get(type);

  return {
    type,
    level: stats?.level ?? 1,
    hp: stats?.hp ?? DEFAULT_STAT.hp,
    atk: stats?.atk ?? DEFAULT_STAT.atk,
    def: stats?.def ?? DEFAULT_STAT.def,
    exp: stats?.exp ?? DEFAULT_STAT.exp,
    detectRange: behavior?.detectRange ?? DEFAULT_BEHAVIOR.detectRange,
    attackRange: behavior?.attackRange ?? DEFAULT_BEHAVIOR.attackRange,
    moveSpeed: behavior?.moveSpeed ?? DEFAULT_BEHAVIOR.moveSpeed,
    attackCooldown: behavior?.attackCooldown ?? DEFAULT_BEHAVIOR.attackCooldown,
    jumpTiles: behavior?.jumpTiles ?? DEFAULT_BEHAVIOR.jumpTiles,
    movementType: behavior?.movementType ?? DEFAULT_BEHAVIOR.movementType,
    attribute: behavior?.attribute,
  };
}
