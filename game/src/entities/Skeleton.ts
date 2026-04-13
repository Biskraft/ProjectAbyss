import { Enemy } from './Enemy';
import { isSolid } from '@core/Physics';

const TILE_SIZE = 16;
const SKELETON_ATTACK_FRAMES = 10;
const FRAME_MS = 1000 / 60;
const DETECT_CONFIRM_MS = 200;  // GDD §4.1: detect_confirm_ms
const PATROL_SPEED_MULT = 0.5;  // patrol_speed / chase_speed ratio
const LOSE_TARGET_MS = 1500;    // GDD §4.1: lose_target_delay_ms

export class Skeleton extends Enemy {
  private attackTimer = 0;
  private attackActive = false;
  // Patrol state
  private spawnX = 0;
  private patrolDir = 1;
  private patrolRangePx = 4 * TILE_SIZE; // 4 tiles
  // Detect state
  private detectTimer = 0;
  // Lose target timer (Chase → Patrol fallback)
  private loseTargetTimer = 0;

  constructor(level = 1) {
    super({
      width: 16,
      height: 24,
      color: 0xcc3333,
      hp: 1, atk: 1, def: 0,
      detectRange: 160, attackRange: 18,
      moveSpeed: 60, attackCooldown: 1200,
    });
    this.applyStats('Skeleton', level);
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
        // Check for player detection
        if (this.distToTarget() <= this.detectRange) {
          this.fsm.transition('detect');
          return;
        }
        // Patrol movement
        const patrolSpeed = this.moveSpeed * PATROL_SPEED_MULT;
        this.vx = this.patrolDir * patrolSpeed;

        // Reverse at patrol range boundary
        if (this.x > this.spawnX + this.patrolRangePx) this.patrolDir = -1;
        if (this.x < this.spawnX - this.patrolRangePx) this.patrolDir = 1;

        // Reverse at platform edge (ground enemies don't fall during patrol)
        const feetCol = Math.floor((this.x + this.width / 2 + this.patrolDir * 8) / TILE_SIZE);
        const feetRow = Math.floor((this.y + this.height) / TILE_SIZE);
        const belowTile = this.roomData[feetRow]?.[feetCol] ?? 0;
        if (!isSolid(belowTile) && belowTile !== 3) { // no floor ahead
          this.patrolDir *= -1;
          this.vx = this.patrolDir * patrolSpeed;
        }
      },
    });

    // ── Detect: brief pause before chasing (GDD: 200ms confirm) ──
    this.fsm.addState({
      name: 'detect',
      enter: () => { this.vx = 0; this.detectTimer = DETECT_CONFIRM_MS; },
      update: (dt) => {
        this.vx = 0;
        this.detectTimer -= dt;
        // Player left detection range during confirm
        if (this.distToTarget() > this.detectRange) {
          this.fsm.transition('patrol');
          return;
        }
        if (this.detectTimer <= 0) {
          this.fsm.transition('chase');
        }
      },
    });

    // ── Chase: move toward player, body contact = damage ──
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
        this.attackTimer = SKELETON_ATTACK_FRAMES * FRAME_MS;
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
}
