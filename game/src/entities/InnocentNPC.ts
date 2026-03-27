/**
 * InnocentNPC.ts
 *
 * An Innocent resident that has escaped into the dungeon corridors and must be
 * subdued (defeated) by the player to convert it from wild (50% effectiveness)
 * to subdued (100% effectiveness).
 *
 * AI behaviour: flee from the player. Jumps on a random 2–3 s timer when
 * grounded. Never attacks.
 *
 * Design ref: System_ItemWorld_Core.md — Innocent System
 *             System_ItemNarrative_MonsterPool.md — InnocentNPC
 */

import { Enemy } from './Enemy';
import type { Innocent } from '@data/innocents';

/** Jump velocity applied when flee-jumping (px/s). */
const FLEE_JUMP_VY = -320;

/** Minimum ms between jump attempts. */
const JUMP_TIMER_MIN = 2000;

/** Maximum ms between jump attempts. */
const JUMP_TIMER_MAX = 3000;

export class InnocentNPC extends Enemy {
  /**
   * The innocent data this NPC represents.
   * Set by the scene before the NPC is added to the world.
   * On subdual (player kills NPC) the scene reads this to call onSubdued.
   */
  innocent: Innocent | null = null;

  /**
   * Called once when the NPC dies (i.e. is subdued by the player).
   * The scene wires this callback to mark innocent.isSubdued = true on the
   * owning ItemInstance.
   */
  onSubdued: (() => void) | null = null;

  private jumpTimer: number;

  constructor() {
    super({
      width: 12,
      height: 12,
      color: 0xffdd44,      // Yellow — visually distinct from enemies
      hp: 15,
      atk: 0,               // Innocents never attack
      def: 0,               // Innocents have no defense
      detectRange: 200,     // Flee when player is within this range
      attackRange: 0,       // Never attacks
      moveSpeed: 80,        // px/s — slightly faster than Skeleton to feel evasive
      attackCooldown: 0,
    });

    // Random initial jump timer so NPCs don't all jump simultaneously
    this.jumpTimer = JUMP_TIMER_MIN + Math.random() * (JUMP_TIMER_MAX - JUMP_TIMER_MIN);
  }

  protected setupStates(): void {
    // --- idle: stand still until player enters detect range ---
    this.fsm.addState({
      name: 'idle',
      update: () => {
        this.vx = 0;
        if (this.distToTarget() <= this.detectRange) {
          this.fsm.transition('chase');
        }
      },
    });

    // --- chase: flee AWAY from player (inverse movement direction) ---
    this.fsm.addState({
      name: 'chase',
      update: (dt) => {
        if (!this.target) return;

        // Flee: move opposite direction from player
        const dir = this.target.x > this.x ? -1 : 1;
        this.vx = dir * this.moveSpeed;

        // Jump timer — escape pits and obstacles
        this.jumpTimer -= dt;
        if (this.jumpTimer <= 0 && this.grounded) {
          this.vy = FLEE_JUMP_VY;
          this.jumpTimer = JUMP_TIMER_MIN + Math.random() * (JUMP_TIMER_MAX - JUMP_TIMER_MIN);
        }

        // If player leaves detect range, return to idle
        if (this.distToTarget() > this.detectRange * 1.5) {
          this.vx = 0;
          this.fsm.transition('idle');
        }
      },
    });

    // --- hit: brief knockback, then resume fleeing ---
    this.fsm.addState({
      name: 'hit',
      update: (dt) => this.stateHitUpdate(dt),
    });

    // --- death: no-op (fade handled by Enemy base class) ---
    this.fsm.addState({
      name: 'death',
      enter: () => {
        // Fire subdual callback so the owning scene can mark innocent.isSubdued
        this.onSubdued?.();
      },
      update: () => {},
    });

    // attack and cooldown states are required by EnemyState type but never used
    this.fsm.addState({ name: 'attack',   update: () => {} });
    this.fsm.addState({ name: 'cooldown', update: () => {} });
  }
}
