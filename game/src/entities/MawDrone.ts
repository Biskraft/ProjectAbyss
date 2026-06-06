import { Graphics } from 'pixi.js';
import { Enemy } from './Enemy';

const PATROL_RANGE_PX = 8 * 16;
const PATROL_SPEED_MULT = 0.45;
const DETECT_CONFIRM_MS = 300;
const ATTACK_TELL_MS = 300;
const ATTACK_ACTIVE_MS = 180;
const LOSE_TARGET_MS = 1000;
const BODY_COLOR = 0x8aa0a8;
const EYE_COLOR = 0xffc15a;
const FIN_COLOR = 0x566872;

export class MawDrone extends Enemy {
  private spawnX = 0;
  private spawnY = 0;
  private patrolDir = 1;
  private detectTimer = 0;
  private loseTargetTimer = 0;
  private attackTimer = 0;
  private attackActive = false;
  private body: Graphics | null = null;

  constructor(level = 1) {
    super({
      width: 22,
      height: 18,
      color: BODY_COLOR,
      hp: 1,
      atk: 1,
      def: 0,
      detectRange: 180,
      attackRange: 20,
      moveSpeed: 52,
      attackCooldown: 1000,
    });
    this.applyStats('MawDrone', level);
    this.sprite.visible = false;
    this.buildBody();
  }

  protected setupStates(): void {
    this.fsm.addState({
      name: 'idle',
      enter: () => {
        this.vx = 0;
        this.vy = 0;
        this.spawnX = this.x;
        this.spawnY = this.y;
      },
      update: () => {
        this.vx = 0;
        this.vy = 0;
        if (this.distToTarget() <= this.detectRange) {
          this.fsm.transition('detect');
          return;
        }
        this.fsm.transition('patrol');
      },
    });

    this.fsm.addState({
      name: 'patrol',
      enter: () => {
        if (this.spawnX === 0) {
          this.spawnX = this.x;
          this.spawnY = this.y;
        }
      },
      update: () => {
        if (this.distToTarget() <= this.detectRange) {
          this.fsm.transition('detect');
          return;
        }

        this.vx = this.patrolDir * this.moveSpeed * PATROL_SPEED_MULT;
        this.vy = Math.sin(Date.now() * 0.004) * 10;

        if (this.x > this.spawnX + PATROL_RANGE_PX) this.patrolDir = -1;
        if (this.x < this.spawnX - PATROL_RANGE_PX) this.patrolDir = 1;
      },
    });

    this.fsm.addState({
      name: 'detect',
      enter: () => {
        this.vx = 0;
        this.vy = 0;
        this.detectTimer = DETECT_CONFIRM_MS;
      },
      update: (dt) => {
        this.vx = 0;
        this.vy = 0;
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

    this.fsm.addState({
      name: 'chase',
      enter: () => {
        this.loseTargetTimer = LOSE_TARGET_MS;
      },
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

        if (dist <= this.attackRange && this.cooldownTimer <= 0) {
          this.fsm.transition('attack');
        }
      },
    });

    this.fsm.addState({
      name: 'attack',
      enter: () => {
        this.attackTimer = ATTACK_TELL_MS + ATTACK_ACTIVE_MS;
        this.attackActive = false;
        this.vx = 0;
        this.vy = 0;
      },
      update: (dt) => {
        this.attackTimer -= dt;
        this.vx = 0;
        this.vy = 0;
        this.attackActive = this.attackTimer <= ATTACK_ACTIVE_MS && this.attackTimer > 0;
        if (this.attackTimer <= 0) {
          this.attackActive = false;
          this.cooldownTimer = this.attackCooldown;
          this.fsm.transition('cooldown');
        }
      },
      exit: () => {
        this.attackActive = false;
      },
    });

    this.fsm.addState({
      name: 'cooldown',
      update: () => {
        this.vx = 0;
        this.vy = 0;
        if (this.cooldownTimer <= 0) {
          this.fsm.transition('chase');
        }
      },
    });

    this.fsm.addState({ name: 'hit', update: (dt) => this.stateHitUpdate(dt) });
    this.fsm.addState({ name: 'death', update: () => {} });
  }

  override update(dt: number): void {
    super.update(dt);
    if (!this.alive) return;

    if (this.fsm.currentState === 'patrol') {
      this.facingRight = this.patrolDir > 0;
    } else if (this.target) {
      this.facingRight = this.target.x > this.x;
    }

    if (this.body) {
      this.body.scale.x = this.facingRight ? 1 : -1;
      this.body.alpha = this.fsm.currentState === 'attack' && !this.attackActive ? 0.65 : 1;
    }
  }

  isAttackActive(): boolean {
    return this.attackActive;
  }

  private buildBody(): void {
    const body = new Graphics();
    body.ellipse(0, 0, 11, 8).fill(BODY_COLOR);
    body.circle(6, -1, 2).fill(EYE_COLOR);
    body.moveTo(-10, -4).lineTo(-17, -8).lineTo(-12, 2).closePath().fill(FIN_COLOR);
    body.moveTo(-10, 4).lineTo(-17, 8).lineTo(-12, -2).closePath().fill(FIN_COLOR);
    body.x = this.width / 2;
    body.y = this.height / 2;
    this.container.addChildAt(body, 0);
    this.body = body;
  }
}
