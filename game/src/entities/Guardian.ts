/**
 * Guardian.ts — 기억의 수문장 (Memory Guardian)
 *
 * First boss of the Item World. Tier: 아이템 장군 (Item General).
 *
 * Stats: HP 80, ATK 12, DEF 5
 * Patterns:
 *  1. Horizontal Charge — dashes across arena (left/right)
 *  2. Jump Slam — leaps up, slams down at player's position
 *
 * Each attack has a 500ms telegraph (flash + pause).
 * Phase transition at 50% HP: faster cooldowns, higher charge speed.
 */

import { Enemy } from './Enemy';
import { Graphics } from 'pixi.js';

export type GuardianState = 'idle' | 'detect' | 'chase' | 'telegraph' | 'charge' | 'slam_rise' | 'slam_fall' | 'slam_land' | 'swipe' | 'attack' | 'cooldown' | 'hit' | 'death';

const TELEGRAPH_DURATION = 500; // ms — 0.5s warning
const CHARGE_SPEED = 350;       // px/s
const CHARGE_SPEED_ENRAGED = 480;
const CHARGE_DURATION = 600;    // ms
const SLAM_RISE_SPEED = -520;   // px/s (upward) — higher jump
const SLAM_RISE_DURATION = 500; // ms — longer hang time
const SLAM_FALL_SPEED = 750;    // px/s (downward) — faster slam
const SLAM_LAND_DURATION = 500; // ms — longer recovery (punish window)
const SWIPE_TELEGRAPH = 250;    // ms — shorter telegraph, more reactive
const SWIPE_DURATION = 300;     // ms — quick melee swing
const SWIPE_KNOCKBACK = 200;    // px/s — pushes player away
const COOLDOWN_NORMAL = 1200;   // ms
const COOLDOWN_ENRAGED = 700;   // ms

export class Guardian extends Enemy<GuardianState> {
  private attackTimer = 0;
  private attackActive = false;
  private telegraphTimer = 0;
  private pendingAttack: 'charge' | 'slam' | 'swipe' = 'charge';
  private chargeDir = 1;
  private slamTargetX = 0;
  private enraged = false;
  private telegraphFlashTimer = 0;

  /** When true, 50% HP enrage is suppressed (first Normal entry special). */
  noEnrage = false;
  /** When true, only use charge pattern (first Normal entry special). */
  chargeOnly = false;

  /** Marker for boss kill handling in scene. */
  readonly _isBoss = true;

  constructor(level = 1) {
    super({
      width: 32,
      height: 48,
      color: 0x8844aa,
      hp: 1, atk: 1, def: 0,
      detectRange: 300, attackRange: 200,
      moveSpeed: 50, attackCooldown: COOLDOWN_NORMAL,
    });
    this.applyStats('Guardian', level);
    this.superArmor = true;
  }

  protected setupStates(): void {
    // --- IDLE ---
    this.fsm.addState({
      name: 'idle',
      update: () => {
        this.vx = 0;
        if (this.distToTarget() <= this.detectRange) {
          this.fsm.transition('detect');
        }
      },
    });

    // --- DETECT (brief pause before chasing) ---
    let detectTimer = 0;
    this.fsm.addState({
      name: 'detect',
      enter: () => { this.vx = 0; detectTimer = 2000; },
      update: (dt: number) => {
        detectTimer -= dt;
        if (this.distToTarget() > this.detectRange) {
          this.fsm.transition('idle');
          return;
        }
        if (detectTimer <= 0) {
          this.fsm.transition('chase');
        }
      },
    });

    // --- CHASE ---
    this.fsm.addState({
      name: 'chase',
      update: () => {
        const dist = this.horizontalDistToTarget();
        if (dist > this.detectRange * 2) {
          this.fsm.transition('idle');
          return;
        }
        if (this.cooldownTimer <= 0) {
          this.fsm.transition('telegraph');
          return;
        }
        this.moveTowardTarget(this.moveSpeed);
      },
    });

    // --- TELEGRAPH ---
    this.fsm.addState({
      name: 'telegraph',
      enter: () => {
        this.telegraphFlashTimer = 0;
        this.vx = 0;

        // Pick attack based on distance (chargeOnly: first Normal entry)
        if (this.chargeOnly || !this.target) {
          this.pendingAttack = 'charge';
        } else {
          const dist = this.horizontalDistToTarget();
          if (dist < 40) {
            const r = Math.random();
            this.pendingAttack = r < 0.6 ? 'swipe' : 'slam';
          } else if (dist < 80) {
            const r = Math.random();
            this.pendingAttack = r < 0.3 ? 'swipe' : r < 0.7 ? 'slam' : 'charge';
          } else {
            this.pendingAttack = Math.random() < 0.6 ? 'charge' : 'slam';
          }
        }

        // Swipe has shorter telegraph for snappier reaction
        this.telegraphTimer = this.pendingAttack === 'swipe' ? SWIPE_TELEGRAPH : TELEGRAPH_DURATION;

        // Store charge direction / slam target
        if (this.target) {
          this.chargeDir = this.target.x > this.x ? 1 : -1;
          this.slamTargetX = this.target.x;
        }
      },
      update: (dt) => {
        this.telegraphTimer -= dt;
        // Flash effect during telegraph
        this.telegraphFlashTimer += dt;
        const flashOn = Math.sin(this.telegraphFlashTimer * 0.02) > 0;
        this.sprite.alpha = flashOn ? 0.5 : 1.0;

        if (this.telegraphTimer <= 0) {
          this.sprite.alpha = 1.0;
          if (this.pendingAttack === 'charge') {
            this.fsm.transition('charge');
          } else if (this.pendingAttack === 'swipe') {
            this.fsm.transition('swipe');
          } else {
            this.fsm.transition('slam_rise');
          }
        }
      },
      exit: () => {
        this.sprite.alpha = 1.0;
      },
    });

    // --- CHARGE ---
    this.fsm.addState({
      name: 'charge',
      enter: () => {
        const speed = this.enraged ? CHARGE_SPEED_ENRAGED : CHARGE_SPEED;
        this.vx = this.chargeDir * speed;
        this.attackTimer = CHARGE_DURATION;
        this.attackActive = true;
      },
      update: (dt) => {
        this.attackTimer -= dt;
        if (this.attackTimer <= 0) {
          this.attackActive = false;
          this.cooldownTimer = this.enraged ? COOLDOWN_ENRAGED : COOLDOWN_NORMAL;
          this.fsm.transition('cooldown');
        }
      },
      exit: () => {
        this.attackActive = false;
        this.vx = 0;
      },
    });

    // --- SLAM: RISE ---
    this.fsm.addState({
      name: 'slam_rise',
      enter: () => {
        this.vy = SLAM_RISE_SPEED;
        this.attackTimer = SLAM_RISE_DURATION;
        // Move toward player's X during rise
        if (this.target) {
          this.slamTargetX = this.target.x;
        }
      },
      update: (dt) => {
        this.attackTimer -= dt;
        // Drift toward target X
        const dx = this.slamTargetX - this.x;
        this.vx = Math.sign(dx) * Math.min(Math.abs(dx) / 0.3, 400);

        if (this.attackTimer <= 0) {
          this.fsm.transition('slam_fall');
        }
      },
      exit: () => {
        this.vx = 0;
      },
    });

    // --- SLAM: FALL ---
    this.fsm.addState({
      name: 'slam_fall',
      enter: () => {
        this.vy = SLAM_FALL_SPEED;
        this.attackActive = true;
      },
      update: () => {
        // Wait until grounded
        if (this.grounded) {
          this.fsm.transition('slam_land');
        }
      },
      exit: () => {
        this.attackActive = false;
      },
    });

    // --- SLAM: LAND ---
    this.fsm.addState({
      name: 'slam_land',
      enter: () => {
        this.attackTimer = SLAM_LAND_DURATION;
        this.vx = 0;
        this.vy = 0;
        // Brief attack active on landing
        this.attackActive = true;
        setTimeout(() => { this.attackActive = false; }, 100);
      },
      update: (dt) => {
        this.attackTimer -= dt;
        if (this.attackTimer <= 0) {
          this.cooldownTimer = this.enraged ? COOLDOWN_ENRAGED : COOLDOWN_NORMAL;
          this.fsm.transition('cooldown');
        }
      },
      exit: () => {
        this.attackActive = false;
      },
    });

    // --- SWIPE (close-range melee) ---
    this.fsm.addState({
      name: 'swipe',
      enter: () => {
        this.attackTimer = SWIPE_DURATION;
        this.attackActive = true;
        // Lunge forward slightly
        const dir = this.target ? (this.target.x > this.x ? 1 : -1) : (this.facingRight ? 1 : -1);
        this.vx = dir * SWIPE_KNOCKBACK;
      },
      update: (dt) => {
        this.attackTimer -= dt;
        this.vx *= 0.92; // decelerate during swing
        if (this.attackTimer <= 0) {
          this.attackActive = false;
          this.cooldownTimer = this.enraged ? COOLDOWN_ENRAGED * 0.7 : COOLDOWN_NORMAL * 0.6;
          this.fsm.transition('cooldown');
        }
      },
      exit: () => {
        this.attackActive = false;
        this.vx = 0;
      },
    });

    // --- ATTACK (unused, but required by base) ---
    this.fsm.addState({
      name: 'attack',
      update: () => { this.fsm.transition('cooldown'); },
    });

    // --- COOLDOWN ---
    this.fsm.addState({
      name: 'cooldown',
      update: () => {
        this.vx = 0;
        if (this.cooldownTimer <= 0) {
          this.fsm.transition('chase');
        }
      },
    });

    // --- HIT ---
    this.fsm.addState({
      name: 'hit',
      update: (dt) => {
        this.stateHitUpdate(dt);
        // Check for enrage at 50% HP (suppressed by noEnrage flag)
        if (!this.noEnrage && !this.enraged && this.hp <= this.maxHp * 0.5) {
          this.enraged = true;
        }
      },
    });

    // --- DEATH ---
    this.fsm.addState({
      name: 'death',
      update: () => {},
    });
  }

  isAttackActive(): boolean {
    return this.attackActive;
  }
}
