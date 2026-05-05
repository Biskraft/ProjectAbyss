/**
 * MemoryShardNPC.ts
 *
 * A Forgotten Memory Shard that wanders the dungeon corridors and must be
 * recalled (defeated) by the player to convert it from forgotten (50% effect)
 * to recalled (100% effect).
 *
 * AI behaviour: flee from the player. Jumps on a random 2–3 s timer when
 * grounded. Never attacks.
 *
 * Design ref: System_ItemWorld_Core.md — Memory Shard System
 *             System_ItemNarrative_MonsterPool.md — MemoryShardNPC
 */

import { Enemy } from './Enemy';
import type { Innocent } from '@data/memoryShards';
import { GlowFilter } from '@effects/GlowFilter';

/** Forgotten 단편의 노란 눈빛 — pixijs-references P1 GlowFilter 적용 후보. */
const SHARD_GLOW_COLOR = 0xffdd44;

/** Jump velocity applied when flee-jumping (px/s). */
const FLEE_JUMP_VY = -320;

/** Minimum ms between jump attempts. */
const JUMP_TIMER_MIN = 2000;

/** Maximum ms between jump attempts. */
const JUMP_TIMER_MAX = 3000;

/**
 * 공중 / 착지 직후 flee 방향 잠금 시간.
 *
 * 점프 중 plyer 가 npc 의 x 를 통과하면 매 프레임 `dir = target.x > this.x` 가
 * 부호 반전 → vx 가 60Hz 로 ±moveSpeed 사이를 오가며 좌우로 떨려 보인다
 * (사용자 피드백 2026-05-05). 같은 패턴 차단을 chase 에 적용한 base
 * `CHASE_TURN_COOLDOWN_MS` 와 정합 — 공중에선 lock, 착지 직후에도 짧은
 * cooldown 동안 잠가 둔다.
 */
const FLEE_TURN_COOLDOWN_MS = 250;

export class MemoryShardNPC extends Enemy {
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
  /** flee 방향 (1=오른쪽, -1=왼쪽). 매 프레임 재계산하지 않고 cooldown 으로 갱신. */
  private fleeDir: 1 | -1 = 1;
  /** 다음 flee 방향 갱신까지 남은 시간 (ms). 공중 + 착지 직후 떨림 차단. */
  private fleeTurnCooldownMs = 0;

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

    // GPU glow — Forgotten Memory Shard 의 노란 발광 (DEC-036 / pixijs-references P1).
    // Enemy.sprite 는 protected Graphics — subclass 에서 filter 를 부착해 단편을 강조.
    this.sprite.filters = [new GlowFilter({
      color: SHARD_GLOW_COLOR,
      radius: 8,
      intensity: 1.1,
      coreBoost: 0.3,
    })];
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
      enter: () => {
        // 첫 진입 시 즉시 dir 결정 — cooldown 0 으로 idle→chase 전환 직후 플레이어
        // 로부터 즉각 멀어진다.
        if (this.target) {
          this.fleeDir = this.target.x > this.x ? -1 : 1;
        }
        this.fleeTurnCooldownMs = 0;
      },
      update: (dt) => {
        if (!this.target) return;

        // Flee dir 갱신 — 공중에선 잠그고 (점프 중 좌우 떨림 차단), 착지 직후에도
        // FLEE_TURN_COOLDOWN_MS 동안 잠근다 (사용자 피드백 2026-05-05).
        if (this.fleeTurnCooldownMs > 0) {
          this.fleeTurnCooldownMs = Math.max(0, this.fleeTurnCooldownMs - dt);
        }
        if (this.grounded && this.fleeTurnCooldownMs <= 0) {
          const wantDir: 1 | -1 = this.target.x > this.x ? -1 : 1;
          if (wantDir !== this.fleeDir) {
            this.fleeDir = wantDir;
            this.fleeTurnCooldownMs = FLEE_TURN_COOLDOWN_MS;
          }
        }
        this.vx = this.fleeDir * this.moveSpeed;

        // Jump timer — escape pits and obstacles. 이륙 시 cooldown 을 부여해
        // 점프 도중 dir 이 갱신되지 않도록 한다 (실제로는 grounded 가드로
        // 충분하지만 guard 가 풀리는 frame 사이 race 를 방지).
        this.jumpTimer -= dt;
        if (this.jumpTimer <= 0 && this.grounded) {
          this.vy = FLEE_JUMP_VY;
          this.jumpTimer = JUMP_TIMER_MIN + Math.random() * (JUMP_TIMER_MAX - JUMP_TIMER_MIN);
          this.fleeTurnCooldownMs = FLEE_TURN_COOLDOWN_MS;
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
