/**
 * Slime.ts
 *
 * Small passive enemy that wanders nearby. Half the size of a Skeleton (8×12).
 * Does not attack first — only has idle and wander behavior.
 * Hops randomly on a short timer when grounded.
 */

import { Enemy } from './Enemy';

const HOP_VY = -180;
const WANDER_SPEED = 30;
const HOP_TIMER_MIN = 1500;
const HOP_TIMER_MAX = 3000;
const WANDER_RANGE = 4 * 16; // 4 tiles

export class Slime extends Enemy {
  private hopTimer: number;
  private wanderDir = 1;
  private spawnX = 0;

  constructor(level = 1) {
    super({
      width: 16,
      height: 16,
      color: 0x44cc44,
      hp: 1, atk: 1, def: 0,          // placeholder — overwritten by applyStats
      detectRange: 0, attackRange: 0,
      moveSpeed: WANDER_SPEED,
      attackCooldown: 0,
    });
    this.applyStats('Slime', level);

    this.hopTimer = HOP_TIMER_MIN + Math.random() * (HOP_TIMER_MAX - HOP_TIMER_MIN);
    if (Math.random() < 0.5) this.wanderDir = -1;
  }

  protected setupStates(): void {
    this.spawnX = this.x;

    this.fsm.addState({
      name: 'idle',
      update: (dt) => {
        // Lazy init spawnX (x is set after constructor)
        if (this.spawnX === 0) this.spawnX = this.x;

        this.vx = this.wanderDir * WANDER_SPEED;

        // Reverse direction at wander boundary
        if (this.x > this.spawnX + WANDER_RANGE) this.wanderDir = -1;
        else if (this.x < this.spawnX - WANDER_RANGE) this.wanderDir = 1;

        this.hopTimer -= dt;
        if (this.hopTimer <= 0 && this.grounded) {
          this.vy = HOP_VY;
          this.hopTimer = HOP_TIMER_MIN + Math.random() * (HOP_TIMER_MAX - HOP_TIMER_MIN);
          if (Math.random() < 0.3) this.wanderDir *= -1;
        }
      },
    });

    this.fsm.addState({
      name: 'chase',
      update: () => { this.fsm.transition('idle'); },
    });

    this.fsm.addState({
      name: 'hit',
      update: (dt) => this.stateHitUpdate(dt),
    });

    this.fsm.addState({
      name: 'death',
      update: () => {},
    });

    this.fsm.addState({ name: 'attack',   update: () => {} });
    this.fsm.addState({ name: 'cooldown', update: () => {} });
  }

  isAttackActive(): boolean {
    return false;
  }
}
