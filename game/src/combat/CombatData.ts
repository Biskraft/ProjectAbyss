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
import { CombatConst } from '@data/constData';

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

/**
 * Build the attack hitbox AABB for a given attacker and combo step.
 *
 * 사용자 결정 (2026-05-03): 적이 player AABB 와 겹치면 기존 hitbox (정면 옆 strip)
 * 가 적을 못 감싸 공격이 안 먹는 문제 해결. hitbox 를 player **몸 절반(aw/2) 만큼
 * player 안쪽으로 확장**해 player 중심부터 시작하도록 변경. width 도 hitboxW + aw/2.
 *
 * 기존: facingRight → x = ax + aw, width = hitboxW              (player 옆 strip)
 * 신규: facingRight → x = ax + aw/2, width = hitboxW + aw/2     (player 중심부터)
 *       facingLeft  → x = ax - hitboxW, width = hitboxW + aw/2  (player 중심까지)
 */
export function getAttackHitbox(
  ax: number, ay: number, aw: number, ah: number,
  facingRight: boolean, step: ComboStep,
): { x: number; y: number; width: number; height: number } {
  const halfBody = aw / 2;
  return {
    x: facingRight ? ax + halfBody : ax - step.hitboxW,
    y: ay + (ah - step.hitboxH) / 2,
    width: step.hitboxW + halfBody,
    height: step.hitboxH,
  };
}

export const COMBO_WINDOW = _comboWindow;
export const COMBO3_END_LAG = _endLag;
export const INVINCIBILITY_ON_HIT = CombatConst.InvincibilityOnHitMs;
