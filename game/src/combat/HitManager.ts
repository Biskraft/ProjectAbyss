import { aabbOverlap, type AABB } from '@core/Physics';
import { calculateDamage } from '@data/damage';
import { COMBO_STEPS, getAttackHitbox, type ComboStep } from './CombatData';
import type { Entity } from '@entities/Entity';
import type { Game } from '../Game';

export interface CombatEntity {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  invincible: boolean;
  invincibleTimer: number;  // ms remaining
  facingRight?: boolean;
  /**
   * Weapon-driven scale multiplier applied to COMBO_STEPS hitboxW/H.
   * Default 1 (no scaling). Player sets this based on equipped weapon;
   * enemies leave it undefined.
   */
  attackHitboxMul?: number;
  onHit(knockbackX: number, knockbackY: number, hitstun: number): void;
  onDeath?(): void;
}

/** Compose a scaled ComboStep when a weapon multiplier is in play. */
export function scaleComboStep(base: ComboStep, mul: number): ComboStep {
  if (mul === 1) return base;
  return {
    ...base,
    hitboxW: Math.round(base.hitboxW * mul),
    hitboxH: Math.round(base.hitboxH * mul),
  };
}

/**
 * Baseline HitboxW used as the "1.0x" reference for computing
 * WeaponDef.hitboxW → attackHitboxMul. Matches Content_Stats_Weapon_List.csv
 * `sword_rustborn` (Rustborn, the starter full-size blade) and Content_Combat_Combo.csv
 * step 1 (HitboxW=45, bare-hand baseline).
 */
export const BASE_HITBOX_W = 45;

export interface HitResult {
  target: CombatEntity;
  damage: number;
  comboStep: ComboStep;
  /** World-space hit point for spark effects */
  hitX: number;
  hitY: number;
  /** Knockback direction for directional effects */
  dirX: number;
  /** Whether this is a heavy hit (3타 or killing blow) */
  heavy: boolean;
  /** Whether this hit was a critical strike */
  critical: boolean;
}

/**
 * Sakurai Hit Stop 8 Techniques integrated:
 * 1. Victim vibrates larger, attacker smaller
 * 2. Hitbox doesn't move during vibration (positions frozen in hitstop)
 * 3. Grounded = horizontal, airborne = omnidirectional
 * 4. Amplitude converges (decay per frame)
 * 5. Hitstop proportional to attack power / combo step
 * 6. Hit pose blending (handled by state machine transitions)
 * 7. Attacker micro-advances during hitstop
 * 8. Camera shake with directional bias
 */
export class HitManager {
  private game: Game;

  constructor(game: Game) {
    this.game = game;
  }

  checkHits(
    attacker: CombatEntity,
    comboIndex: number,
    hitList: Set<CombatEntity>,
    targets: CombatEntity[],
  ): HitResult[] {
    const baseStep = COMBO_STEPS[comboIndex];
    if (!baseStep) return [];
    const step = scaleComboStep(baseStep, attacker.attackHitboxMul ?? 1);

    const facingRight = attacker.facingRight ?? true;
    const hitbox: AABB = getAttackHitbox(
      attacker.x, attacker.y, attacker.width, attacker.height,
      facingRight, step,
    );

    const results: HitResult[] = [];

    for (const target of targets) {
      if (hitList.has(target)) continue;
      if (target.invincible) continue;
      if (target.hp <= 0) continue;

      const targetBox: AABB = {
        x: target.x,
        y: target.y,
        width: target.width,
        height: target.height,
      };

      if (aabbOverlap(hitbox, targetBox)) {
        hitList.add(target);

        const critical = Math.random() < 0.05; // 5% crit chance
        const isFinisher = comboIndex >= 2; // 3타 finisher bonus
        const damage = calculateDamage({
          atk: attacker.atk,
          def: target.def,
          skillMultiplier: isFinisher ? 1.5 : 1.0,
          criticalMultiplier: critical ? 1.5 : 1.0,
        });

        target.hp -= damage;

        const dirX = facingRight ? 1 : -1;
        target.onHit(
          step.knockbackX * dirX,
          step.knockbackY,
          step.hitstun,
        );

        // Brief invincibility matching hitstun duration
        target.invincible = true;
        target.invincibleTimer = step.hitstun;

        const isKill = target.hp <= 0;
        if (isKill) {
          target.hp = 0;
          target.onDeath?.();
        }

        const heavy = comboIndex >= 2 || isKill || critical;

        // --- Sakurai Feedback System ---
        const attackerEntity = attacker as unknown as Entity;
        const targetEntity = target as unknown as Entity;

        // Technique 5: hitstop proportional to combo step
        // 1타=3f, 2타=4f, 3타=6f, kill=8f
        const hitstopBase = step.hitstopFrames;
        const hitstopBonus = isKill ? 5 : heavy ? 2 : 0;
        this.game.hitstopFrames = hitstopBase + hitstopBonus;

        // Technique 1 & 4: vibration (victim large, attacker small)
        const vibrateTotal = this.game.hitstopFrames;
        if (targetEntity.startVibrate) {
          const targetAmp = heavy ? 5 : 3;
          targetEntity.startVibrate(targetAmp, vibrateTotal, true);
          targetEntity.triggerFlash();
        }
        if (attackerEntity.startVibrate) {
          const attackerAmp = heavy ? 1.5 : 0.8;
          attackerEntity.startVibrate(attackerAmp, vibrateTotal, true);
        }

        // Technique 7: attacker micro-advance
        if (attackerEntity.startHitAdvance) {
          attackerEntity.startHitAdvance(dirX, heavy ? 3 : 1.5);
        }

        // Technique 8: directional camera shake, proportional to combo
        const shakeIntensity = step.shakeIntensity * (heavy ? 1.8 : 1.0) + (isKill ? 2 : 0);
        this.game.camera.shakeDirectional(
          shakeIntensity,
          dirX,
          step.knockbackY < -40 ? -0.3 : 0,
        );

        // Hit point (center of overlap region)
        const hitX = facingRight
          ? Math.min(attacker.x + attacker.width + step.hitboxW * 0.3, target.x + target.width / 2)
          : Math.max(attacker.x - step.hitboxW * 0.3, target.x + target.width / 2);
        const hitY = target.y + target.height * 0.4;

        results.push({
          target, damage, comboStep: step,
          hitX, hitY, dirX, heavy, critical,
        });
      }
    }

    return results;
  }
}
