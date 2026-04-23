/**
 * decoPresets.ts — Theme-specific ProceduralDecorator presets loaded from CSV.
 *
 * SSoT: Sheets/Content_ItemWorld_DecoPresets.csv
 */

import csvText from '../../../Sheets/Content_ItemWorld_DecoPresets.csv?raw';

export interface DecoPreset {
  themeId: string;
  growerColor: number;
  growerTipColor: number;
  hangerColor: number;
  hangerDripColor: number;
  clingerColor: number;
  clingerVineColor: number;
  structColor1: number;
  structColor2: number;
  detailDensity: number;
  structDensity: number;
  growerHeightMin: number;
  growerHeightMax: number;
  hangerLenMin: number;
  hangerLenMax: number;
}

function parseHex(s: string): number {
  return parseInt(s.trim().replace(/^0x/i, ''), 16);
}

export const DECO_PRESETS: Map<string, DecoPreset> = new Map();

const lines = csvText.trim().split(/\r?\n/);
for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split(',');
  if (cols.length < 15) continue;
  const preset: DecoPreset = {
    themeId: cols[0].trim(),
    growerColor: parseHex(cols[1]),
    growerTipColor: parseHex(cols[2]),
    hangerColor: parseHex(cols[3]),
    hangerDripColor: parseHex(cols[4]),
    clingerColor: parseHex(cols[5]),
    clingerVineColor: parseHex(cols[6]),
    structColor1: parseHex(cols[7]),
    structColor2: parseHex(cols[8]),
    detailDensity: parseFloat(cols[9]),
    structDensity: parseFloat(cols[10]),
    growerHeightMin: parseFloat(cols[11]),
    growerHeightMax: parseFloat(cols[12]),
    hangerLenMin: parseFloat(cols[13]),
    hangerLenMax: parseFloat(cols[14]),
  };
  DECO_PRESETS.set(preset.themeId, preset);
}

/** Default fallback preset (T-HABITAT). */
export function getDecoPreset(themeId: string): DecoPreset {
  return DECO_PRESETS.get(themeId) ?? DECO_PRESETS.get('T-HABITAT')!;
}
