import csvText from '../../../Sheets/Content_PlayerAttackTimeline.csv?raw';

export type PlayerAttackId = 'ground1' | 'ground2' | 'ground3' | 'air';

export interface PlayerAttackTimeline {
  attackId: PlayerAttackId;
  comboIndex: number;
  airborne: boolean;
  animTag: string;
  reverseAnim: boolean;
  visualTotalMs: number | 'auto';
  hitStartFrame: number;
  hitEndFrame: number;
  fxFrame: number;
  cancelStartFrame: number;
  cancelEndFrame: number;
  inputLockEndFrame: number;
  moveLockEndFrame: number;
  lungeStartFrame: number;
  lungeEndFrame: number;
  comboWindowMs: number;
  endLagMs: number;
  preDelayMs: number;
}

const DEFAULT_ATTACK_TIMELINES: PlayerAttackTimeline[] = [
  {
    attackId: 'ground1',
    comboIndex: 0,
    airborne: false,
    animTag: 'attack1',
    reverseAnim: false,
    visualTotalMs: 'auto',
    hitStartFrame: 1,
    hitEndFrame: 2,
    fxFrame: 1,
    cancelStartFrame: 2,
    cancelEndFrame: 7,
    inputLockEndFrame: 2,
    moveLockEndFrame: 2,
    lungeStartFrame: 0,
    lungeEndFrame: 1,
    comboWindowMs: 400,
    endLagMs: 0,
    preDelayMs: 0,
  },
  {
    attackId: 'ground2',
    comboIndex: 1,
    airborne: false,
    animTag: 'attack1',
    reverseAnim: true,
    visualTotalMs: 'auto',
    hitStartFrame: 1,
    hitEndFrame: 2,
    fxFrame: 1,
    cancelStartFrame: 2,
    cancelEndFrame: 7,
    inputLockEndFrame: 2,
    moveLockEndFrame: 2,
    lungeStartFrame: 0,
    lungeEndFrame: 1,
    comboWindowMs: 400,
    endLagMs: 0,
    preDelayMs: 0,
  },
  {
    attackId: 'ground3',
    comboIndex: 2,
    airborne: false,
    animTag: 'attack2',
    reverseAnim: false,
    visualTotalMs: 'auto',
    hitStartFrame: 1,
    hitEndFrame: 3,
    fxFrame: 1,
    cancelStartFrame: 4,
    cancelEndFrame: 7,
    inputLockEndFrame: 3,
    moveLockEndFrame: 3,
    lungeStartFrame: 0,
    lungeEndFrame: 2,
    comboWindowMs: 0,
    endLagMs: 28,
    preDelayMs: 100,
  },
  {
    attackId: 'air',
    comboIndex: 0,
    airborne: true,
    animTag: 'attack_air',
    reverseAnim: false,
    visualTotalMs: 'auto',
    hitStartFrame: 1,
    hitEndFrame: 2,
    fxFrame: 1,
    cancelStartFrame: 2,
    cancelEndFrame: 3,
    inputLockEndFrame: 2,
    moveLockEndFrame: 2,
    lungeStartFrame: 0,
    lungeEndFrame: 1,
    comboWindowMs: 400,
    endLagMs: 0,
    preDelayMs: 0,
  },
];

function parseBool(value: string | undefined, fallback = false): boolean {
  if (value == null || value.trim() === '') return fallback;
  return /^(1|true|yes|y)$/i.test(value.trim());
}

function parseNum(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseVisualTotal(value: string | undefined): number | 'auto' {
  if (!value || value.trim().toLowerCase() === 'auto') return 'auto';
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 'auto';
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if (ch === ',' && !inQuote) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function parseTimelines(): PlayerAttackTimeline[] {
  const lines = csvText.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length <= 1) return DEFAULT_ATTACK_TIMELINES;
  const headers = splitCsvLine(lines[0]).map(h => h.trim());
  const parsed: PlayerAttackTimeline[] = [];
  for (const line of lines.slice(1)) {
    const values = splitCsvLine(line);
    const row = new Map<string, string>();
    headers.forEach((h, i) => row.set(h, values[i] ?? ''));
    const attackId = (row.get('AttackId') ?? '') as PlayerAttackId;
    if (!attackId) continue;
    parsed.push({
      attackId,
      comboIndex: parseNum(row.get('ComboIndex'), 0),
      airborne: parseBool(row.get('Airborne')),
      animTag: row.get('AnimTag') || 'attack1',
      reverseAnim: parseBool(row.get('ReverseAnim')),
      visualTotalMs: parseVisualTotal(row.get('VisualTotalMs')),
      hitStartFrame: parseNum(row.get('HitStartFrame'), 1),
      hitEndFrame: parseNum(row.get('HitEndFrame'), 2),
      fxFrame: parseNum(row.get('FxFrame'), 1),
      cancelStartFrame: parseNum(row.get('CancelStartFrame'), 2),
      cancelEndFrame: parseNum(row.get('CancelEndFrame'), 7),
      inputLockEndFrame: parseNum(row.get('InputLockEndFrame'), 2),
      moveLockEndFrame: parseNum(row.get('MoveLockEndFrame'), 2),
      lungeStartFrame: parseNum(row.get('LungeStartFrame'), 0),
      lungeEndFrame: parseNum(row.get('LungeEndFrame'), 1),
      comboWindowMs: parseNum(row.get('ComboWindowMs'), 400),
      endLagMs: parseNum(row.get('EndLagMs'), 0),
      preDelayMs: parseNum(row.get('PreDelayMs'), 0),
    });
  }
  return parsed.length > 0 ? parsed : DEFAULT_ATTACK_TIMELINES;
}

export const PLAYER_ATTACK_TIMELINES = parseTimelines();

export function getPlayerAttackTimeline(comboIndex: number, grounded: boolean): PlayerAttackTimeline {
  if (!grounded) {
    return PLAYER_ATTACK_TIMELINES.find(t => t.airborne) ?? DEFAULT_ATTACK_TIMELINES[3];
  }
  return PLAYER_ATTACK_TIMELINES.find(t => !t.airborne && t.comboIndex === comboIndex)
    ?? DEFAULT_ATTACK_TIMELINES[Math.max(0, Math.min(2, comboIndex))];
}
