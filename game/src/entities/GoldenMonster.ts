import { Enemy } from './Enemy';
import type { Rarity } from '@data/weapons';

const ATTACK_FRAMES = 8;
const FRAME_MS = 1000 / 60;

/** Rarity weights by difficulty tier */
const RARITY_WEIGHTS: Record<string, [Rarity, number][]> = {
  low: [['common', 70], ['uncommon', 25], ['rare', 5]],
  mid: [['common', 30], ['uncommon', 40], ['rare', 25], ['legendary', 5]],
  high: [['uncommon', 20], ['rare', 40], ['legendary', 30], ['mythic', 10]],
};

function pickRarity(difficulty: 'low' | 'mid' | 'high'): Rarity {
  const weights = RARITY_WEIGHTS[difficulty];
  const total = weights.reduce((s, [, w]) => s + w, 0);
  let roll = Math.random() * total;
  for (const [rarity, weight] of weights) {
    roll -= weight;
    if (roll <= 0) return rarity;
  }
  return weights[weights.length - 1][0];
}

export function getDifficultyTier(distanceFromStart: number): 'low' | 'mid' | 'high' {
  if (distanceFromStart <= 2) return 'low';
  if (distanceFromStart <= 5) return 'mid';
  return 'high';
}

export class GoldenMonster extends Enemy {
  private attackTimer = 0;
  private attackActive = false;

  /** The rarity of the portal this monster will drop */
  readonly portalRarity: Rarity;

  /** Callback when this monster dies — WorldScene uses this to spawn a portal */
  onDeathCallback: ((x: number, y: number, rarity: Rarity) => void) | null = null;

  constructor(difficulty: 'low' | 'mid' | 'high') {
    super({
      width: 18,
      height: 26,
      color: 0xffd700,       // gold
      hp: 80,                // 2x normal skeleton
      atk: 12,
      def: 5,
      detectRange: 200,
      attackRange: 20,        // close enough to touch player
      moveSpeed: 90,         // 1.5x faster
      attackCooldown: 1000,
    });

    this.portalRarity = pickRarity(difficulty);
  }

  protected setupStates(): void {
    this.fsm.addState({
      name: 'idle',
      update: () => {
        this.vx = 0;
        if (this.distToTarget() <= this.detectRange) {
          this.fsm.transition('chase');
        }
      },
    });

    this.fsm.addState({
      name: 'chase',
      update: () => {
        const dist = this.horizontalDistToTarget();
        if (dist > this.detectRange * 1.5) {
          this.fsm.transition('idle');
          return;
        }
        if (dist <= this.attackRange && this.cooldownTimer <= 0) {
          this.fsm.transition('attack');
          return;
        }
        this.moveTowardTarget(this.moveSpeed);
      },
    });

    this.fsm.addState({
      name: 'attack',
      enter: () => {
        this.attackTimer = ATTACK_FRAMES * FRAME_MS;
        this.attackActive = true;
        this.vx = 0;
      },
      update: (dt) => {
        this.attackTimer -= dt;
        if (this.attackTimer <= 0) {
          this.attackActive = false;
          this.cooldownTimer = this.attackCooldown;
          this.fsm.transition('cooldown');
        }
      },
      exit: () => { this.attackActive = false; },
    });

    this.fsm.addState({
      name: 'cooldown',
      update: () => {
        this.vx = 0;
        if (this.cooldownTimer <= 0) {
          this.fsm.transition('chase');
        }
      },
    });

    this.fsm.addState({
      name: 'hit',
      update: (dt) => this.stateHitUpdate(dt),
    });

    this.fsm.addState({
      name: 'death',
      update: () => {},
    });
  }

  isAttackActive(): boolean {
    return this.attackActive;
  }

  onDeath(): void {
    super.onDeath();
    if (this.onDeathCallback) {
      this.onDeathCallback(this.x + this.width / 2, this.y, this.portalRarity);
    }
  }
}
