/**
 * WeaponFx.ts — Per-weapon-type slash FX resolution.
 *
 * Layer model (2026-04-20, DEC-027 foundation):
 *   L1: Content_FX_WeaponType.csv — (Type × ComboStep) base FX
 *   L2: Rarity modifier           — NOT IMPLEMENTED YET (deferred)
 *   L3: Per-weapon override       — NOT IMPLEMENTED YET (deferred)
 *
 * Bare-hand fallback lives in the same sheet under the synthetic "Bare" type
 * row, so there is exactly one SSoT for slash FX.
 *
 * CSV columns: Type,Step,FxSprite,FxScaleX,FxScaleY,FxOffsetX,FxOffsetY,FxColor
 */

import csvText from '../../../Sheets/Content_FX_WeaponType.csv?raw';
import type { Rarity, WeaponType } from '@data/weapons';
import { getRarityConfig } from '@data/rarityConfig';

export interface ResolvedFx {
  sprite: string;
  scaleX: number;
  scaleY: number;
  offsetX: number;
  offsetY: number;
  color: number;
}

/** Synthetic type used as bare-hand fallback — not part of the WeaponType union. */
const BARE_TYPE = 'Bare';

/** WEAPON_TYPE_FX[type][step] — step is 0-indexed (combo 1/2/3 → 0/1/2). */
const WEAPON_TYPE_FX: Record<string, ResolvedFx[]> = {};

const lines = csvText.trim().split(/\r?\n/);
for (let i = 1; i < lines.length; i++) {
  const c = lines[i].split(',');
  if (c.length < 8) continue;
  const type = c[0].trim();
  const step = parseInt(c[1]) - 1; // CSV is 1-indexed
  if (!WEAPON_TYPE_FX[type]) WEAPON_TYPE_FX[type] = [];
  WEAPON_TYPE_FX[type][step] = {
    sprite: c[2].trim(),
    scaleX: parseFloat(c[3]),
    scaleY: parseFloat(c[4]),
    offsetX: parseInt(c[5]),
    offsetY: parseInt(c[6]),
    color: parseInt(c[7].trim(), 16),
  };
}

/** Channel-wise multiply of two 0xRRGGBB colors, normalized to 0-255. */
function mixTint(a: number, b: number): number {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  const r = Math.round((ar * br) / 255);
  const g = Math.round((ag * bg) / 255);
  const bl = Math.round((ab * bb) / 255);
  return (r << 16) | (g << 8) | bl;
}

/**
 * Resolve the slash FX for the current attack frame.
 *
 * @param type       Equipped weapon type, or `null` for bare hand (→ "Bare" row).
 * @param rarity     Equipped weapon rarity, or `null` for bare hand (no tint).
 * @param comboIndex 0-based combo step (0=1타, 1=2타, 2=3타).
 */
export function resolveComboFx(
  type: WeaponType | null,
  rarity: Rarity | null,
  comboIndex: number,
): ResolvedFx | null {
  const key = type ?? BARE_TYPE;
  const base = WEAPON_TYPE_FX[key]?.[comboIndex]
    ?? WEAPON_TYPE_FX[BARE_TYPE]?.[comboIndex];
  if (!base) return null;
  if (!rarity) return base;
  // L2: rarity tint — multiply into base color.
  const tint = getRarityConfig(rarity).fxTint;
  if (tint === 0xffffff) return base;
  return { ...base, color: mixTint(base.color, tint) };
}

/**
 * Slash FX atlas frame ranges — maps an FX tag (as authored in the CSV
 * FxSprite column) to [fromFrameIdx, toFrameIdx] within fx_slash.json.
 * Must match fx_slash.json `frameTags`.
 */
export const FX_SLASH_FRAMES: Record<string, [number, number]> = {
  fx_slash_1: [0, 2],
  fx_slash_2: [3, 5],
};
