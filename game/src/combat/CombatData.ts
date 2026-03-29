/** 3-hit sword combo data from GDD */

export interface ComboStep {
  hitboxW: number;
  hitboxH: number;
  activeFrames: number;     // frames hitbox is active
  totalFrames: number;      // total animation frames
  hitstopFrames: number;    // freeze frames on hit
  hitstun: number;          // ms target is stunned
  knockbackX: number;       // px/s horizontal knockback
  knockbackY: number;       // px/s vertical knockback (negative = up)
  shakeIntensity: number;   // camera shake px
}

/**
 * Sakurai Technique 5: Hitstop proportional to attack power.
 * Each combo step escalates: light → medium → heavy.
 * 3타 has dramatically more hitstop/shake for climactic impact.
 */
export const COMBO_STEPS: ComboStep[] = [
  // 1타: Slash1 — light, quick feedback
  {
    hitboxW: 45, hitboxH: 19,
    activeFrames: 6, totalFrames: 12,
    hitstopFrames: 3, hitstun: 200,
    knockbackX: 120, knockbackY: -30,
    shakeIntensity: 1.5,
  },
  // 2타: Slash2 — medium, building momentum
  {
    hitboxW: 50, hitboxH: 19,
    activeFrames: 6, totalFrames: 12,
    hitstopFrames: 4, hitstun: 250,
    knockbackX: 150, knockbackY: -40,
    shakeIntensity: 2.5,
  },
  // 3타: Slash3 — heavy finisher, big payoff
  {
    hitboxW: 54, hitboxH: 24,
    activeFrames: 7, totalFrames: 14,
    hitstopFrames: 6, hitstun: 400,
    knockbackX: 240, knockbackY: -80,
    shakeIntensity: 4,
  },
];

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

export const COMBO_WINDOW = 400;      // ms to input next attack
export const COMBO3_END_LAG = 600;    // ms end lag after 3rd hit
export const INVINCIBILITY_ON_HIT = 500; // ms invincibility after being hit
