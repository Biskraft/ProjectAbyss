/**
 * CombatData.ts — Combo step data loaded from CSV.
 *
 * SSoT: Sheets/Content_Combat_Combo.csv
 * CSV columns: Step,HitboxW,HitboxH,ActiveFrames,TotalFrames,HitstopFrames,
 *              Hitstun,KnockbackX,KnockbackY,ShakeIntensity,ComboWindow,EndLag
 *
 * Visual FX (slash sprite, scale, offset, tint) is now owned by
 * Sheets/Content_FX_WeaponType.csv via WeaponFx.ts. This sheet is
 * mechanics-only (hitbox, frames, knockback, timing).
 */

import csvText from '../../../Sheets/Content_Combat_Combo.csv?raw';

export interface ComboStep {
  hitboxW: number;
  hitboxH: number;
  activeFrames: number;
  totalFrames: number;
  hitstopFrames: number;
  hitstun: number;
  knockbackX: number;
  knockbackY: number;
  shakeIntensity: number;
}

export const COMBO_STEPS: ComboStep[] = [];

let _comboWindow = 400;
let _endLag = 600;

const lines = csvText.trim().split('\n');
for (let i = 1; i < lines.length; i++) {
  const c = lines[i].split(',');
  if (c.length < 12) continue;
  COMBO_STEPS.push({
    hitboxW: parseInt(c[1]),
    hitboxH: parseInt(c[2]),
    activeFrames: parseInt(c[3]),
    totalFrames: parseInt(c[4]),
    hitstopFrames: parseInt(c[5]),
    hitstun: parseInt(c[6]),
    knockbackX: parseInt(c[7]),
    knockbackY: parseInt(c[8]),
    shakeIntensity: parseFloat(c[9]),
  });
  // Last non-zero ComboWindow / EndLag wins (step 3 has EndLag, steps 1-2 have ComboWindow)
  const cw = parseInt(c[10]);
  const el = parseInt(c[11]);
  if (cw > 0) _comboWindow = cw;
  if (el > 0) _endLag = el;
}

/** Build the attack hitbox AABB for a given attacker and combo step. */
export function getAttackHitbox(
  ax: number, ay: number, aw: number, ah: number,
  facingRight: boolean, step: ComboStep,
): { x: number; y: number; width: number; height: number } {
  return {
    x: facingRight ? ax + aw : ax - step.hitboxW,
    y: ay + (ah - step.hitboxH) / 2,
    width: step.hitboxW,
    height: step.hitboxH,
  };
}

export const COMBO_WINDOW = _comboWindow;
export const COMBO3_END_LAG = _endLag;
export const INVINCIBILITY_ON_HIT = 500;
