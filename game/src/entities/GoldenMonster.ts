import { Enemy } from './Enemy';
import { isSolid } from '@core/Physics';
import type { Rarity } from '@data/weapons';

const TILE_SIZE = 16;
const ATTACK_FRAMES = 10;
const FRAME_MS = 1000 / 60;
const DETECT_CONFIRM_MS = 1000;
const PATROL_SPEED_MULT = 0.5;
const LOSE_TARGET_MS = 1500;

/** Rarity weights by difficulty tier */
const RARITY_WEIGHTS: Record<string, [Rarity, number][]> = {
  low: [['normal', 70], ['magic', 25], ['rare', 5]],
  mid: [['normal', 30], ['magic', 40], ['rare', 25], ['legendary', 5]],
  high: [['magic', 20], ['rare', 40], ['legendary', 30], ['ancient', 10]],
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
  private spawnX = 0;
  private patrolDir = 1;
  private patrolRangePx = 4 * TILE_SIZE;
  private detectTimer = 0;
  private loseTargetTimer = 0;

  /** The rarity of the portal this monster will drop */
  readonly portalRarity: Rarity;

  /** Callback when this monster dies — WorldScene uses this to spawn a portal */
  onDeathCallback: ((x: number, y: number, rarity: Rarity) => void) | null = null;

  constructor(difficulty: 'low' | 'mid' | 'high', level = 1) {
    super({
      width: 18,
      height: 26,
      color: 0xffd700,
      hp: 1, atk: 1, def: 0,
      detectRange: 200, attackRange: 20,
      moveSpeed: 90, attackCooldown: 1000,
    });
    this.applyStats('GoldenMonster', level);

    this.portalRarity = pickRarity(difficulty);
  }

  protected setupStates(): void {
    // ── Idle: spawn grace, then → Patrol ──
    this.fsm.addState({
      name: 'idle',
      enter: () => { this.vx = 0; this.spawnX = this.x; },
      update: () => {
        this.vx = 0;
        if (this.distToTarget() <= this.detectRange) {
          this.fsm.transition('detect');
          return;
        }
        this.fsm.transition('patrol');
      },
    });

    // ── Patrol: wander within patrol range, reverse at edge ──
    this.fsm.addState({
      name: 'patrol',
      enter: () => { if (this.spawnX === 0) this.spawnX = this.x; },
      update: () => {
        if (this.distToTarget() <= this.detectRange) {
          this.fsm.transition('detect');
          return;
        }
        const patrolSpeed = this.moveSpeed * PATROL_SPEED_MULT;
        this.vx = this.patrolDir * patrolSpeed;

        if (this.x > this.spawnX + this.patrolRangePx) this.patrolDir = -1;
        if (this.x < this.spawnX - this.patrolRangePx) this.patrolDir = 1;

        const feetCol = Math.floor((this.x + this.width / 2 + this.patrolDir * 8) / TILE_SIZE);
        const feetRow = Math.floor((this.y + this.height) / TILE_SIZE);
        const belowTile = this.roomData[feetRow]?.[feetCol] ?? 0;
        if (!isSolid(belowTile) && belowTile !== 3) {
          this.patrolDir *= -1;
          this.vx = this.patrolDir * patrolSpeed;
        }
      },
    });

    // ── Detect: brief pause before chasing ──
    this.fsm.addState({
      name: 'detect',
      enter: () => { this.vx = 0; this.detectTimer = DETECT_CONFIRM_MS; },
      update: (dt) => {
        this.vx = 0;
        this.detectTimer -= dt;
        if (this.distToTarget() > this.detectRange) {
          this.fsm.transition('patrol');
          return;
        }
        if (this.detectTimer <= 0) {
          this.fsm.transition('chase');
        }
      },
    });

    // ── Chase: move toward player ──
    this.fsm.addState({
      name: 'chase',
      enter: () => { this.loseTargetTimer = LOSE_TARGET_MS; },
      update: (dt) => {
        const dist = this.distToTarget();
        if (dist > this.detectRange * 1.5) {
          this.loseTargetTimer -= dt;
          if (this.loseTargetTimer <= 0) {
            this.fsm.transition('patrol');
            return;
          }
        } else {
          this.loseTargetTimer = LOSE_TARGET_MS;
        }
        this.moveTowardTarget(this.moveSpeed);
      },
    });

    // ── Attack ──
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

    // ── Cooldown ──
    this.fsm.addState({
      name: 'cooldown',
      update: () => {
        this.vx = 0;
        if (this.cooldownTimer <= 0) {
          this.fsm.transition('chase');
        }
      },
    });

    // ── Hit / Death ──
    this.fsm.addState({ name: 'hit', update: (dt) => this.stateHitUpdate(dt) });
    this.fsm.addState({ name: 'death', update: () => {} });
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
