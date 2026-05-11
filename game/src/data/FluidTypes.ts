/**
 * FluidTypes.ts — Dynamic fluid 타입 정의 (water / lava / ...)
 *
 * SSoT: Sheets/Content_System_FluidTypes.csv (build-time ?raw import)
 * 참조: Documents/System/System_World_Fluid.md
 *
 * 새 fluid 추가 = CSV 한 줄. 코드 분기 없음 (FluidType 은 string union 확장만).
 */

import csvText from '../../../Sheets/Content_System_FluidTypes.csv?raw';

export type FluidType = 'water' | 'lava' | string;

export interface FluidTypeDef {
  id: FluidType;
  displayName: string;
  surfaceColor: number;    // 0xRRGGBB
  bodyColor: number;
  glowColor: number | null;
  surfaceK: number;
  surfaceDamping: number;
  propagation: number;
  viscosity: number;
  buoyancyMul: number;
  entityDragMul: number;
  damageDps: number;
  damageType: string;      // 'none' / 'fire' / 'acid' / ...
  splashSprite: string;
  bubbleEmitter: string | null;
  surfaceSfx: string;
  enterSfx: string;
}

const TABLE = new Map<string, FluidTypeDef>();

function parseHexColor(s: string): number {
  const t = s.trim();
  if (!t) return 0xffffff;
  const hex = t.startsWith('#') ? t.slice(1) : t;
  return parseInt(hex, 16);
}

function parseOptHex(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  return parseHexColor(t);
}

function parseOptStr(s: string): string | null {
  const t = s.trim();
  return t.length === 0 ? null : t;
}

function parseCSV(text: string): void {
  TABLE.clear();
  const lines = text.trim().split(/\r?\n/);
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#')) continue;
    const cols = line.split(',');
    if (cols.length < 17) continue;
    const def: FluidTypeDef = {
      id: cols[0].trim(),
      displayName: cols[1].trim(),
      surfaceColor: parseHexColor(cols[2]),
      bodyColor: parseHexColor(cols[3]),
      glowColor: parseOptHex(cols[4]),
      surfaceK: parseFloat(cols[5]),
      surfaceDamping: parseFloat(cols[6]),
      propagation: parseFloat(cols[7]),
      viscosity: parseFloat(cols[8]),
      buoyancyMul: parseFloat(cols[9]),
      entityDragMul: parseFloat(cols[10]),
      damageDps: parseInt(cols[11].trim(), 10) || 0,
      damageType: cols[12].trim() || 'none',
      splashSprite: cols[13].trim(),
      bubbleEmitter: parseOptStr(cols[14]),
      surfaceSfx: cols[15].trim(),
      enterSfx: cols[16].trim(),
    };
    TABLE.set(def.id, def);
  }
}

parseCSV(csvText);

/** Fallback def returned when an id is missing. Uses water defaults. */
const FALLBACK: FluidTypeDef = {
  id: 'water',
  displayName: 'Water',
  surfaceColor: 0x7297e5,
  bodyColor: 0x2244aa,
  glowColor: null,
  surfaceK: 0.025,
  surfaceDamping: 0.02,
  propagation: 0.2,
  viscosity: 1.0,
  buoyancyMul: 1.0,
  entityDragMul: 1.0,
  damageDps: 0,
  damageType: 'none',
  splashSprite: 'fx_splash_water',
  bubbleEmitter: 'bubble_water',
  surfaceSfx: 'sfx_water_amb',
  enterSfx: 'sfx_water_enter',
};

export function getFluidDef(id: FluidType): FluidTypeDef {
  return TABLE.get(id) ?? FALLBACK;
}

export function hasFluidDef(id: string): boolean {
  return TABLE.has(id);
}
