import { Enemy } from './Enemy';

const SKELETON_ATTACK_FRAMES = 10;
const FRAME_MS = 1000 / 60;

export class Skeleton extends Enemy {
  private attackTimer = 0;
  private attackActive = false;

  constructor() {
    super({
      width: 16,
      height: 24,
      color: 0xcc3333,       // red
      hp: 40,
      atk: 8,
      def: 3,
      detectRange: 160,       // px
      attackRange: 18,        // px — close enough to touch player
      moveSpeed: 60,          // px/s (slow)
      attackCooldown: 1200,   // ms
    });
    this.jumpTiles = 6;
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
}
