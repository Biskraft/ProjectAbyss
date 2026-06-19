import { Graphics } from 'pixi.js';
import { getTile, isSolid, TILE_SIZE } from '@core/Physics';
import { Enemy } from './Enemy';
import { Projectile } from './Projectile';
import { Debug } from '@core/Debug';

const TILE = 16;

function drawDiamond(g: Graphics, color: number, w: number, h: number): void {
  g.moveTo(w / 2, 0).lineTo(w, h / 2).lineTo(w / 2, h).lineTo(0, h / 2).closePath().fill(color);
}

abstract class SimpleMeleeEnemy extends Enemy {
  protected spawnX = 0;
  protected patrolDir = 1;
  protected detectTimer = 250;
  protected attackTimer = 0;
  protected attackActive = false;
  protected readonly patrolRangePx = 4 * TILE;
  protected readonly tellMs = 300;
  protected readonly activeMs = 180;

  protected addCommonStates(): void {
    this.fsm.addState({
      name: 'idle',
      enter: () => { this.vx = 0; this.spawnX = this.x; },
      update: () => {
        if (this.distToTarget() <= this.detectRange) this.fsm.transition('detect');
        else this.fsm.transition('patrol');
      },
    });
    this.fsm.addState({
      name: 'patrol',
      enter: () => { if (this.spawnX === 0) this.spawnX = this.x; },
      update: () => {
        if (this.distToTarget() <= this.detectRange) {
          this.fsm.transition('detect');
          return;
        }
        this.vx = this.patrolDir * this.moveSpeed * 0.45;
        if (this.x > this.spawnX + this.patrolRangePx) this.patrolDir = -1;
        if (this.x < this.spawnX - this.patrolRangePx) this.patrolDir = 1;
      },
    });
    this.fsm.addState({
      name: 'detect',
      enter: () => { this.vx = 0; this.detectTimer = 250; },
      update: (dt) => {
        this.vx = 0;
        this.detectTimer -= dt;
        if (this.distToTarget() > this.detectRange) {
          this.fsm.transition('patrol');
        } else if (this.detectTimer <= 0) {
          this.fsm.transition('chase');
        }
      },
    });
    this.fsm.addState({
      name: 'chase',
      update: () => {
        const dist = this.distToTarget();
        if (dist <= this.attackRange && this.cooldownTimer <= 0) {
          this.fsm.transition('attack');
          return;
        }
        const target = this.target;
        if (!target) return;
        const moveDir = target.x + target.width / 2 >= this.x + this.width / 2 ? 1 : -1;
        this.vx = moveDir * this.moveSpeed;
      },
    });
    this.fsm.addState({
      name: 'attack',
      enter: () => {
        this.attackTimer = this.tellMs + this.activeMs;
        this.attackActive = false;
        this.vx = 0;
      },
      update: (dt) => {
        this.attackTimer -= dt;
        this.vx = 0;
        this.attackActive = this.attackTimer <= this.activeMs && this.attackTimer > 0;
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
        if (this.cooldownTimer <= 0) this.fsm.transition('chase');
      },
    });
    this.fsm.addState({ name: 'hit', update: (dt) => this.stateHitUpdate(dt) });
    this.fsm.addState({ name: 'death', update: () => {} });
  }

  override update(dt: number): void {
    super.update(dt);
    if (!this.alive) return;
    if (this.fsm.currentState === 'patrol') this.facingRight = this.patrolDir > 0;
  }

  isAttackActive(): boolean {
    return this.attackActive;
  }
}

export class Bulwark extends SimpleMeleeEnemy {
  private shieldDrawnFacingRight: boolean | null = null;
  private shieldDrawnGuarding: boolean | null = null;
  private blockFlashTimer = 0;
  private guardActive = false;
  private vulnerableTimer = 0;
  private telegraphTimer = 0;
  private activeAttackTimer = 0;
  private guardFacingRight = false;
  private turnTimer = 0;
  private pendingFacingRight: boolean | null = null;
  private readonly attackBox = new Graphics();

  constructor(level = 1) {
    super({ width: 22, height: 24, color: 0x6f7d84, hp: 1, atk: 1, def: 0, detectRange: 160, attackRange: 22, moveSpeed: 22, attackCooldown: 1600 });
    this.applyStats('Bulwark', level);
    this.attackBox.visible = false;
    this.container.addChild(this.attackBox);
    this.redrawShield();
  }

  protected setupStates(): void {
    this.fsm.addState({
      name: 'idle',
      enter: () => {
        this.guardActive = false;
        this.vx = 0;
        this.spawnX = this.x;
      },
      update: () => this.fsm.transition('patrol'),
    });
    this.fsm.addState({
      name: 'patrol',
      update: () => {
        this.guardActive = false;
        if (this.distToTarget() <= this.detectRange) {
          this.fsm.transition('chase');
          return;
        }
        this.vx = this.patrolDir * this.moveSpeed;
        if (this.x > this.spawnX + this.patrolRangePx) this.patrolDir = -1;
        if (this.x < this.spawnX - this.patrolRangePx) this.patrolDir = 1;
        this.facingRight = this.patrolDir > 0;
        this.guardFacingRight = this.facingRight;
        this.pendingFacingRight = null;
        this.turnTimer = 0;
      },
    });
    this.fsm.addState({
      name: 'chase',
      enter: () => { this.guardActive = true; },
      update: (dt) => {
        this.guardActive = true;
        if (!this.target || this.distToTarget() > this.detectRange * 1.4) {
          this.fsm.transition('patrol');
          return;
        }
        this.updateCombatFacing(this.target.x + this.target.width / 2 >= this.x + this.width / 2, dt);
        if (this.distToTarget() <= this.attackRange && this.cooldownTimer <= 0) {
          this.fsm.transition('detect');
          return;
        }
        this.moveTowardTarget(this.moveSpeed);
      },
    });
    this.fsm.addState({
      name: 'detect',
      enter: () => {
        this.guardActive = true;
        this.telegraphTimer = 250;
        this.activeAttackTimer = 0;
        this.vulnerableTimer = 0;
        this.attackActive = false;
        this.vx = 0;
      },
      update: (dt) => {
        this.vx = 0;
        if (this.target) this.updateCombatFacing(this.target.x + this.target.width / 2 >= this.x + this.width / 2, dt);

        if (this.telegraphTimer > 0) {
          this.guardActive = true;
          this.telegraphTimer -= dt;
          this.sprite.alpha = this.telegraphTimer % 120 < 60 ? 1 : 0.75;
          return;
        }

        if (this.activeAttackTimer <= 0 && this.vulnerableTimer <= 0) {
          this.guardActive = false;
          this.attackActive = true;
          this.activeAttackTimer = 260;
        }

        if (this.activeAttackTimer > 0) {
          this.guardActive = false;
          this.activeAttackTimer -= dt;
          this.attackActive = this.activeAttackTimer > 0;
          if (this.activeAttackTimer <= 0) {
            this.attackActive = false;
            this.vulnerableTimer = 1500;
          }
          return;
        }

        this.guardActive = false;
        this.vulnerableTimer -= dt;
        this.sprite.alpha = this.vulnerableTimer % 180 < 90 ? 1 : 0.65;
        if (this.vulnerableTimer <= 0) {
          this.sprite.alpha = 1;
          this.cooldownTimer = this.attackCooldown;
          this.fsm.transition('cooldown');
        }
      },
      exit: () => {
        this.sprite.alpha = 1;
        this.attackActive = false;
      },
    });
    this.fsm.addState({
      name: 'cooldown',
      enter: () => {
        this.guardActive = true;
        this.vx = 0;
      },
      update: (dt) => {
        this.guardActive = true;
        if (this.target) this.updateCombatFacing(this.target.x + this.target.width / 2 >= this.x + this.width / 2, dt);
        if (this.cooldownTimer <= 0) this.fsm.transition('chase');
      },
    });
    this.fsm.addState({ name: 'hit', update: (dt) => this.stateHitUpdate(dt) });
    this.fsm.addState({ name: 'death', update: () => {} });
  }

  override update(dt: number): void {
    super.update(dt);
    this.facingRight = this.guardFacingRight;
    if (this.shieldDrawnFacingRight !== this.guardFacingRight || this.shieldDrawnGuarding !== this.guardActive) this.redrawShield();
    this.updateAttackBox();
    if (this.blockFlashTimer > 0) {
      this.blockFlashTimer -= dt;
      this.sprite.tint = this.blockFlashTimer % 80 < 40 ? 0x9fd6ff : 0xffffff;
      if (this.blockFlashTimer <= 0) this.sprite.tint = 0xffffff;
    }
  }

  modifyIncomingHitDamage(damage: number, dirX: number): number {
    if (!this.guardActive) {
      return damage;
    }
    const shieldFacingRight = this.guardFacingRight;
    const hitFront = (shieldFacingRight && dirX < 0) || (!shieldFacingRight && dirX > 0);
    if (hitFront) {
      this.blockFlashTimer = 180;
      return 0;
    }
    return damage;
  }

  override getAttackAABB(): { x: number; y: number; width: number; height: number } | null {
    if (!this.attackActive) return null;
    return {
      x: this.guardFacingRight ? this.x + this.width - 2 : this.x - 38,
      y: this.y,
      width: 40,
      height: 32,
    };
  }

  private redrawShield(): void {
    this.shieldDrawnFacingRight = this.guardFacingRight;
    this.shieldDrawnGuarding = this.guardActive;
    this.sprite.clear();
    this.sprite.rect(3, 0, 16, 24).fill(0x6f7d84);
    if (this.guardActive) {
      this.sprite.rect(14, 1, 9, 22).fill(0xaab7bd);
      this.sprite.rect(18, 4, 2, 15).fill(0xd8e1e5);
    } else {
      this.sprite.rect(11, 16, 10, 6).fill(0xaab7bd);
      this.sprite.rect(14, 18, 5, 2).fill(0xd8e1e5);
    }
  }

  private updateAttackBox(): void {
    this.attackBox.clear();
    if (!this.attackActive) {
      this.attackBox.visible = false;
      return;
    }
    this.attackBox.visible = true;
    const x = this.guardFacingRight ? this.width - 2 : -38;
    this.attackBox
      .rect(x, 0, 40, 32)
      .fill({ color: 0xffb347, alpha: 0.18 })
      .stroke({ color: 0xffd166, alpha: 0.9, width: 1 });
    const slashX = this.guardFacingRight ? x + 28 : x + 12;
    this.attackBox
      .moveTo(slashX - 14, 5)
      .lineTo(slashX + 14, 27)
      .stroke({ color: 0xffffff, alpha: 0.7, width: 2 });
  }

  private updateCombatFacing(wantsFacingRight: boolean, dt: number): void {
    if (wantsFacingRight === this.guardFacingRight) {
      this.pendingFacingRight = null;
      this.turnTimer = 0;
      return;
    }
    if (this.pendingFacingRight !== wantsFacingRight) {
      this.pendingFacingRight = wantsFacingRight;
      this.turnTimer = 1000;
    }
    this.turnTimer -= dt;
    if (this.turnTimer <= 0 && this.pendingFacingRight !== null) {
      this.guardFacingRight = this.pendingFacingRight;
      this.facingRight = this.guardFacingRight;
      this.pendingFacingRight = null;
      this.turnTimer = 0;
    }
  }
}

export class CinderImp extends SimpleMeleeEnemy {
  private skitterPhase = Math.random() * Math.PI * 2;
  private leapTimer = 0;
  private leapDir = 1;
  private scatterTimer = 0;

  constructor(level = 1) {
    super({ width: 12, height: 12, color: 0xff7040, hp: 1, atk: 1, def: 0, detectRange: 200, attackRange: 20, moveSpeed: 70, attackCooldown: 520 });
    this.applyStats('CinderImp', level);
    this.sprite.clear();
    this.sprite.circle(6, 7, 5).fill(0xff7040);
    this.sprite.circle(8, 4, 1).fill(0xfff0a0);
    this.sprite.circle(4, 4, 1).fill(0xfff0a0);
  }

  protected setupStates(): void {
    this.fsm.addState({
      name: 'idle',
      enter: () => { this.spawnX = this.x; },
      update: () => this.fsm.transition('patrol'),
    });
    this.fsm.addState({
      name: 'patrol',
      update: (dt) => {
        this.skitterPhase += dt * 0.018;
        if (this.distToTarget() <= this.detectRange) {
          this.fsm.transition('chase');
          return;
        }
        this.vx = Math.cos(this.skitterPhase) * this.moveSpeed * 0.45;
      },
    });
    this.fsm.addState({
      name: 'chase',
      update: (dt) => {
        if (!this.target) {
          this.fsm.transition('patrol');
          return;
        }
        this.skitterPhase += dt * 0.025;
        const dist = this.distToTarget();
        if (dist <= this.attackRange && this.cooldownTimer <= 0) {
          this.fsm.transition('attack');
          return;
        }
        this.moveTowardTarget(this.moveSpeed * 1.15);
      },
    });
    this.fsm.addState({
      name: 'attack',
      enter: () => {
        this.leapTimer = 180;
        this.attackActive = true;
        this.leapDir = this.target && this.target.x < this.x ? -1 : 1;
        this.vx = this.leapDir * this.moveSpeed * 1.9;
        this.vy = -120;
        this.facingRight = this.leapDir > 0;
      },
      update: (dt) => {
        this.leapTimer -= dt;
        this.vx = this.leapDir * this.moveSpeed * 1.9;
        this.attackActive = this.leapTimer > 40;
        if (this.leapTimer <= 0) {
          this.attackActive = false;
          this.cooldownTimer = this.attackCooldown;
          this.fsm.transition('scatter');
        }
      },
      exit: () => { this.attackActive = false; },
    });
    this.fsm.addState({
      name: 'scatter',
      enter: () => {
        this.scatterTimer = 260;
        const away = this.target && this.target.x < this.x ? 1 : -1;
        this.vx = away * this.moveSpeed * 1.25;
      },
      update: (dt) => {
        this.scatterTimer -= dt;
        if (this.scatterTimer <= 0) this.fsm.transition('cooldown');
      },
    });
    this.fsm.addState({
      name: 'cooldown',
      update: () => {
        if (this.cooldownTimer <= 0) this.fsm.transition('chase');
      },
    });
    this.fsm.addState({ name: 'hit', update: (dt) => this.stateHitUpdate(dt) });
    this.fsm.addState({ name: 'death', update: () => {} });
  }
}

export class Lurker extends SimpleMeleeEnemy {
  private hidden = true;
  private ambushSpent = false;
  private revealTimer = 0;
  private strikeTimer = 0;
  private strikeDir = 1;

  constructor(level = 1) {
    super({ width: 16, height: 20, color: 0x465244, hp: 1, atk: 1, def: 0, detectRange: 60, attackRange: 20, moveSpeed: 45, attackCooldown: 2000 });
    this.applyStats('Lurker', level);
    this.sprite.alpha = 0.35;
  }

  protected setupStates(): void {
    this.fsm.addState({
      name: 'idle',
      enter: () => {
        this.vx = 0;
        if (!this.ambushSpent) {
          this.hidden = true;
          this.sprite.alpha = 0.35;
        }
      },
      update: () => {
        if (this.ambushSpent) this.fsm.transition('chase');
        else if (this.distToTarget() <= this.detectRange) this.fsm.transition('detect');
      },
    });
    this.fsm.addState({
      name: 'patrol',
      update: () => {
        this.vx = 0;
        if (this.ambushSpent) this.fsm.transition('chase');
        else if (this.distToTarget() <= this.detectRange) this.fsm.transition('detect');
      },
    });
    this.fsm.addState({
      name: 'detect',
      enter: () => {
        this.hidden = false;
        this.sprite.alpha = 1;
        this.revealTimer = 120;
        this.vx = 0;
        if (this.target) {
          this.strikeDir = this.target.x < this.x ? -1 : 1;
          this.facingRight = this.strikeDir > 0;
        }
      },
      update: (dt) => {
        this.vx = 0;
        this.revealTimer -= dt;
        this.sprite.alpha = this.revealTimer % 60 < 30 ? 1 : 0.45;
        if (this.revealTimer <= 0) this.fsm.transition('attack');
      },
      exit: () => { this.sprite.alpha = 1; },
    });
    this.fsm.addState({
      name: 'chase',
      update: () => {
        this.hidden = false;
        this.sprite.alpha = 1;
        const dist = this.distToTarget();
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
        if (this.ambushSpent) {
          this.attackTimer = this.tellMs + this.activeMs;
          this.attackActive = false;
          this.vx = 0;
          return;
        }
        this.strikeTimer = 260;
        this.attackActive = true;
        if (this.target) this.strikeDir = this.target.x < this.x ? -1 : 1;
        this.facingRight = this.strikeDir > 0;
      },
      update: (dt) => {
        if (this.ambushSpent) {
          this.attackTimer -= dt;
          this.vx = 0;
          this.attackActive = this.attackTimer <= this.activeMs && this.attackTimer > 0;
          if (this.attackTimer <= 0) {
            this.attackActive = false;
            this.cooldownTimer = this.attackCooldown;
            this.fsm.transition('cooldown');
          }
          return;
        }
        this.strikeTimer -= dt;
        this.vx = this.strikeDir * this.moveSpeed * 3.4;
        this.attackActive = this.strikeTimer > 60;
        if (this.strikeTimer <= 0) {
          this.attackActive = false;
          this.ambushSpent = true;
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
        if (this.cooldownTimer <= 0) this.fsm.transition(this.ambushSpent ? 'chase' : 'patrol');
      },
    });
    this.fsm.addState({ name: 'hit', update: (dt) => this.stateHitUpdate(dt) });
    this.fsm.addState({ name: 'death', update: () => {} });
  }

  override update(dt: number): void {
    super.update(dt);
    if (this.hidden && this.fsm.currentState !== 'idle' && this.fsm.currentState !== 'patrol') this.hidden = false;
  }
}

export class SparkBat extends Enemy {
  private spawnX = 0;
  private spawnY = 0;
  private phase = Math.random() * Math.PI * 2;
  private diveTimer = 0;
  private cooldown = 0;
  private attackActive = false;
  private diveDirX = 0;
  private diveDirY = 1;

  constructor(level = 1) {
    super({ width: 16, height: 16, color: 0xffd166, hp: 1, atk: 1, def: 0, detectRange: 180, attackRange: 24, moveSpeed: 50, attackCooldown: 1500 });
    this.applyStats('SparkBat', level);
    this.sprite.clear();
    drawDiamond(this.sprite, 0xffd166, 16, 16);
  }

  protected setupStates(): void {
    this.fsm.addState({
      name: 'idle',
      enter: () => { this.spawnX = this.x; this.spawnY = this.y; },
      update: () => this.fsm.transition('patrol'),
    });
    this.fsm.addState({
      name: 'patrol',
      update: (dt) => {
        this.phase += dt * 0.004;
        this.vx = Math.cos(this.phase) * this.moveSpeed;
        this.vy = Math.sin(this.phase * 2) * this.moveSpeed * 0.45;
        if (this.distToTarget() <= this.detectRange && this.cooldown <= 0) this.fsm.transition('detect');
      },
    });
    this.fsm.addState({
      name: 'detect',
      enter: () => {
        this.vx = 0;
        this.vy = 0;
        this.diveTimer = 350;
      },
      update: (dt) => {
        this.diveTimer -= dt;
        if (this.diveTimer <= 0) this.fsm.transition('attack');
      },
    });
    this.fsm.addState({
      name: 'attack',
      enter: () => {
        const dx = this.target ? (this.target.x - this.x) : 0;
        const dy = this.target ? (this.target.y - this.y) : 1;
        const len = Math.max(1, Math.hypot(dx, dy));
        this.diveDirX = dx / len;
        this.diveDirY = dy / len;
        this.diveTimer = 450;
        this.attackActive = true;
      },
      update: (dt) => {
        this.diveTimer -= dt;
        this.vx = this.diveDirX * this.moveSpeed * 2.4;
        this.vy = this.diveDirY * this.moveSpeed * 2.4;
        if (this.diveTimer <= 0) {
          this.attackActive = false;
          this.cooldown = this.attackCooldown;
          this.fsm.transition('cooldown');
        }
      },
      exit: () => { this.attackActive = false; },
    });
    this.fsm.addState({
      name: 'cooldown',
      update: (dt) => {
        this.cooldown -= dt;
        const hoverY = this.target ? this.target.y - 48 : this.spawnY;
        const hoverX = this.target ? this.target.x : this.spawnX;
        const dy = hoverY - this.y;
        const dx = hoverX - this.x;
        const maxSpeed = this.moveSpeed * 0.9;
        this.vx = Math.max(-maxSpeed, Math.min(maxSpeed, dx * 1.4));
        this.vy = Math.max(-maxSpeed, Math.min(maxSpeed, dy * 1.8));
        if (this.cooldown <= 0) this.fsm.transition('patrol');
      },
    });
    this.fsm.addState({ name: 'hit', update: (dt) => this.stateHitUpdate(dt) });
    this.fsm.addState({ name: 'death', update: () => {} });
  }

  isAttackActive(): boolean { return this.attackActive; }
}

export class Sentry extends Enemy {
  private fireTimer = 0;
  private hasFired = false;
  pendingProjectiles: Projectile[] = [];

  constructor(level = 1) {
    super({ width: 16, height: 16, color: 0x90a4ae, hp: 1, atk: 1, def: 0, detectRange: 320, attackRange: 280, moveSpeed: 0, attackCooldown: 1800 });
    this.applyStats('Sentry', level);
  }

  protected setupStates(): void {
    this.fsm.addState({
      name: 'idle',
      update: () => {
        this.vx = 0;
        if (this.distToTarget() <= this.detectRange && this.cooldownTimer <= 0 && this.hasLineOfSightToTarget()) this.fsm.transition('attack');
      },
    });
    this.fsm.addState({
      name: 'attack',
      enter: () => { this.fireTimer = 300; this.hasFired = false; },
      update: (dt) => {
        this.fireTimer -= dt;
        if (this.fireTimer <= 0 && !this.hasFired) {
          this.fire();
          this.hasFired = true;
          this.cooldownTimer = this.attackCooldown;
          this.fsm.transition('cooldown');
        }
      },
    });
    this.fsm.addState({ name: 'cooldown', update: () => { if (this.cooldownTimer <= 0) this.fsm.transition('idle'); } });
    this.fsm.addState({ name: 'hit', update: (dt) => this.stateHitUpdate(dt) });
    this.fsm.addState({ name: 'death', update: () => {} });
  }

  private fire(): void {
    if (!this.target) return;
    if (!this.hasLineOfSightToTarget()) return;
    const startX = this.x + this.width / 2;
    const startY = this.y + this.height / 2;
    const targetX = this.target.x + this.target.width / 2;
    const targetY = this.target.y + this.target.height / 2;
    const dx = targetX - startX;
    const dy = targetY - startY;
    const len = Math.max(1, Math.hypot(dx, dy));
    this.pendingProjectiles.push(new Projectile(startX - 4, startY - 4, dx / len * 150, dy / len * 150, this.atk));
  }

  isAttackActive(): boolean { return false; }
}

class LobberBombProjectile extends Projectile {
  private elapsedMs = 0;
  private explosionMs = 140;
  private exploded = false;
  private readonly startX: number;
  private readonly startY: number;
  private readonly targetX: number;
  private readonly targetY: number;
  private readonly travelMs: number;
  private readonly blast = new Graphics();

  constructor(startX: number, startY: number, targetX: number, targetY: number, atk: number) {
    super(startX - 4, startY - 4, 0, 0, atk, 5000);
    this.startX = startX;
    this.startY = startY;
    this.targetX = targetX;
    this.targetY = targetY;
    this.travelMs = 760;
    this.container.addChild(this.blast);
  }

  override update(dt: number): void {
    if (!this.alive) return;

    if (this.exploded) {
      this.explosionMs -= dt;
      this.blast.alpha = Math.max(0, this.explosionMs / 140);
      if (this.explosionMs <= 0) {
        this.alive = false;
      }
      this.container.x = Math.round(this.x);
      this.container.y = Math.round(this.y);
      return;
    }

    this.elapsedMs += dt;
    const t = Math.min(1, this.elapsedMs / this.travelMs);
    const centerX = this.startX + (this.targetX - this.startX) * t;
    const centerY = this.startY + (this.targetY - this.startY) * t - Math.sin(t * Math.PI) * 48;
    this.x = centerX - 4;
    this.y = centerY - 4;
    this.vx = (this.targetX - this.startX) / (this.travelMs / 1000);
    this.vy = (this.targetY - this.startY) / (this.travelMs / 1000);

    if (t >= 1) {
      this.exploded = true;
      this.width = 48;
      this.height = 32;
      this.x = this.targetX - this.width / 2;
      this.y = this.targetY - this.height / 2;
      this.vx = 0;
      this.vy = 0;
      this.blast.clear();
      this.blast.ellipse(this.width / 2, this.height / 2, this.width / 2, this.height / 2)
        .fill({ color: 0xff9b32, alpha: 0.32 });
      this.blast.ellipse(this.width / 2, this.height / 2, this.width / 3, this.height / 3)
        .stroke({ color: 0xffd166, alpha: 0.9, width: 2 });
    }

    this.container.x = Math.round(this.x);
    this.container.y = Math.round(this.y);
  }
}

export class Lobber extends Enemy {
  private spawnX = 0;
  private patrolDir = 1;
  private aimTimer = 0;
  private markerPulse = 0;
  private targetX = 0;
  private targetY = 0;
  private readonly aimMarker = new Graphics();
  private readonly debugArc = new Graphics();
  private readonly minRange = 64;
  pendingProjectiles: Projectile[] = [];

  constructor(level = 1) {
    super({ width: 20, height: 20, color: 0x9b7653, hp: 1, atk: 1, def: 0, detectRange: 260, attackRange: 220, moveSpeed: 25, attackCooldown: 2200 });
    this.applyStats('Lobber', level);
    this.sprite.clear();
    this.sprite.rect(0, 0, 20, 20).fill(0x9b7653);
    this.sprite.rect(4, 3, 12, 7).fill(0xc49a6c);
    this.sprite.circle(10, 12, 4).fill(0x38251c);
    this.aimMarker.visible = false;
    this.container.addChild(this.aimMarker);
    this.container.addChild(this.debugArc);
  }

  protected setupStates(): void {
    this.fsm.addState({
      name: 'idle',
      enter: () => { this.spawnX = this.x; },
      update: () => {
        if (this.distToTarget() <= this.detectRange) this.fsm.transition('chase');
        else this.fsm.transition('patrol');
      },
    });
    this.fsm.addState({
      name: 'patrol',
      enter: () => { if (this.spawnX === 0) this.spawnX = this.x; },
      update: () => {
        if (this.distToTarget() <= this.detectRange && this.hasLineOfSightToTarget()) {
          this.fsm.transition('chase');
          return;
        }
        this.vx = this.patrolDir * this.moveSpeed * 0.35;
        if (this.x > this.spawnX + 48) this.patrolDir = -1;
        if (this.x < this.spawnX - 48) this.patrolDir = 1;
      },
    });
    this.fsm.addState({
      name: 'chase',
      update: () => {
        const dist = this.distToTarget();
        if (dist < this.minRange) {
          this.fsm.transition('retreat');
          return;
        }
        if (dist <= this.attackRange && this.cooldownTimer <= 0 && this.hasLineOfSightToTarget()) {
          this.fsm.transition('attack');
          return;
        }
        this.moveTowardTarget(this.moveSpeed * 0.65);
      },
    });
    this.fsm.addState({
      name: 'retreat',
      update: () => {
        this.aimMarker.visible = false;
        if (!this.target) {
          this.fsm.transition('patrol');
          return;
        }
        const dir = this.target.x < this.x ? 1 : -1;
        this.vx = dir * this.moveSpeed * 1.2;
        this.facingRight = dir > 0;
        if (this.distToTarget() > this.minRange * 1.45) this.fsm.transition('chase');
      },
    });
    this.fsm.addState({
      name: 'attack',
      enter: () => {
        this.vx = 0;
        this.aimTimer = 500;
        this.lockTargetPoint();
        this.drawAimMarker();
        this.aimMarker.visible = true;
      },
      update: (dt) => {
        this.vx = 0;
        this.aimTimer -= dt;
        this.markerPulse += dt;
        this.drawAimMarker();
        if (this.distToTarget() < this.minRange * 0.8) {
          this.aimMarker.visible = false;
          this.fsm.transition('retreat');
          return;
        }
        if (this.aimTimer <= 0) {
          this.fireBomb();
          this.aimMarker.visible = false;
          this.cooldownTimer = this.attackCooldown;
          this.fsm.transition('cooldown');
        }
      },
      exit: () => { this.aimMarker.visible = false; },
    });
    this.fsm.addState({
      name: 'cooldown',
      update: () => {
        this.vx = 0;
        if (this.cooldownTimer <= 0) this.fsm.transition('chase');
      },
    });
    this.fsm.addState({ name: 'hit', update: (dt) => this.stateHitUpdate(dt) });
    this.fsm.addState({ name: 'death', update: () => {} });
  }

  override update(dt: number): void {
    super.update(dt);
    if (!this.alive) return;
    if (this.fsm.currentState === 'patrol') this.facingRight = this.patrolDir > 0;
    this.renderDebugArc();
  }

  private lockTargetPoint(): void {
    if (!this.target) {
      this.targetX = this.x + this.width / 2;
      this.targetY = this.y + this.height;
      return;
    }
    this.targetX = this.target.x + this.target.width / 2;
    this.targetY = this.target.y + this.target.height;
    this.facingRight = this.targetX >= this.x;
  }

  private drawAimMarker(): void {
    const localX = this.targetX - this.x;
    const localY = this.targetY - this.y;
    const pulse = 1 + Math.sin(this.markerPulse * 0.03) * 0.15;
    this.aimMarker.clear();
    this.aimMarker.ellipse(localX, localY, 18 * pulse, 7 * pulse)
      .stroke({ color: 0xffc247, alpha: 0.95, width: 2 });
    this.aimMarker.moveTo(localX - 24, localY).lineTo(localX + 24, localY)
      .stroke({ color: 0xff6f3c, alpha: 0.7, width: 1 });
    this.aimMarker.moveTo(localX, localY - 12).lineTo(localX, localY + 12)
      .stroke({ color: 0xff6f3c, alpha: 0.7, width: 1 });
  }

  private fireBomb(): void {
    const startX = this.x + this.width / 2;
    const startY = this.y + 4;
    this.pendingProjectiles.push(new LobberBombProjectile(startX, startY, this.targetX, this.targetY, this.atk));
  }

  private renderDebugArc(): void {
    this.debugArc.clear();
    if (!Debug.infoVisible || !this.alive || !this.target || !this.aimMarker.visible) return;
    const startX = this.width / 2;
    const startY = 4;
    const targetX = this.targetX - this.x;
    const targetY = this.targetY - this.y;
    this.debugArc.circle(startX, startY, 2).fill({ color: 0x9b5cff, alpha: 0.95 });
    this.debugArc.circle(targetX, targetY, 2).fill({ color: 0xffc247, alpha: 0.95 });
    let prevX = startX;
    let prevY = startY;
    for (let i = 1; i <= 24; i++) {
      const t = i / 24;
      const x = startX + (targetX - startX) * t;
      const y = startY + (targetY - startY) * t - Math.sin(t * Math.PI) * 48;
      this.debugArc
        .moveTo(prevX, prevY)
        .lineTo(x, y)
        .stroke({ color: 0x9b5cff, alpha: 0.85, width: 1 });
      prevX = x;
      prevY = y;
    }
  }
}

export class Conduit extends Enemy {
  private castTimer = 0;
  private pulse = 0;
  private hasSummoned = false;
  private summonsIssued = 0;
  private readonly summonLevel: number;
  pendingProjectiles: Projectile[] = [];
  pendingSummons: Enemy<string>[] = [];

  constructor(level = 1) {
    super({ width: 16, height: 20, color: 0x7fb7be, hp: 1, atk: 1, def: 0, detectRange: 260, attackRange: 0, moveSpeed: 30, attackCooldown: 3000 });
    this.summonLevel = level;
    this.applyStats('Conduit', level);
    this.sprite.clear();
    this.sprite.rect(3, 0, 10, 20).fill(0x7fb7be);
    this.sprite.circle(8, 6, 5).fill(0xb8f3ff);
  }

  protected setupStates(): void {
    this.fsm.addState({
      name: 'idle',
      update: () => {
        const dist = this.distToTarget();
        if (dist < 64) this.fsm.transition('retreat');
        else if (dist <= this.detectRange && this.cooldownTimer <= 0) this.fsm.transition('attack');
      },
    });
    this.fsm.addState({
      name: 'attack',
      enter: () => {
        this.castTimer = 720;
        this.hasSummoned = false;
        this.vx = 0;
      },
      update: (dt) => {
        this.castTimer -= dt;
        this.pulse += dt;
        this.vx = 0;
        this.sprite.alpha = 0.55 + Math.sin(this.pulse * 0.04) * 0.35;
        this.sprite.scale.set(1 + Math.sin(this.pulse * 0.035) * 0.08);
        if (this.castTimer <= 120 && !this.hasSummoned) {
          this.summonCinderImps();
          this.hasSummoned = true;
        }
        if (this.castTimer <= 0) {
          this.cooldownTimer = this.attackCooldown;
          this.sprite.alpha = 1;
          this.sprite.scale.set(1);
          this.fsm.transition('cooldown');
        }
      },
      exit: () => {
        this.sprite.alpha = 1;
        this.sprite.scale.set(1);
      },
    });
    this.fsm.addState({
      name: 'retreat',
      update: () => {
        if (!this.target) {
          this.fsm.transition('idle');
          return;
        }
        const dir = this.target.x < this.x ? 1 : -1;
        this.vx = dir * this.moveSpeed * 1.4;
        this.facingRight = dir > 0;
        if (this.distToTarget() > 96) this.fsm.transition('idle');
      },
    });
    this.fsm.addState({
      name: 'cooldown',
      update: () => {
        this.vx = 0;
        if (this.cooldownTimer <= 0) this.fsm.transition('idle');
      },
    });
    this.fsm.addState({ name: 'hit', update: (dt) => this.stateHitUpdate(dt) });
    this.fsm.addState({ name: 'death', update: () => {} });
  }

  private summonCinderImps(): void {
    if (!this.target || this.summonsIssued >= 6) return;
    const count = Math.min(2, 6 - this.summonsIssued);
    for (let i = 0; i < count; i++) {
      const imp = new CinderImp(this.summonLevel);
      const side = i % 2 === 0 ? -1 : 1;
      imp.x = this.x + this.width / 2 - imp.width / 2 + side * (18 + i * 4);
      imp.y = this.y + this.height - imp.height;
      imp.prevX = imp.x;
      imp.prevY = imp.y;
      imp.bindSpawnContext(this.roomData, this.target);
      this.pendingSummons.push(imp);
      this.summonsIssued++;
    }
  }

  isAttackActive(): boolean { return false; }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function targetCenter(target: { x: number; y: number; width: number; height: number }): { x: number; y: number } {
  return { x: target.x + target.width / 2, y: target.y + target.height / 2 };
}

function fireStraightProjectile(
  owner: Enemy<string>,
  target: { x: number; y: number; width: number; height: number },
  pending: Projectile[],
  speed: number,
  lifetime = 3200,
): void {
  const startX = owner.x + owner.width / 2;
  const startY = owner.y + owner.height / 2;
  const tc = targetCenter(target);
  const dx = tc.x - startX;
  const dy = tc.y - startY;
  const len = Math.max(1, Math.hypot(dx, dy));
  pending.push(new Projectile(startX - 4, startY - 4, dx / len * speed, dy / len * speed, owner.atk, lifetime));
}

class AreaPulseProjectile extends Projectile {
  private elapsedMs = 0;
  private readonly totalMs: number;
  private readonly ring = new Graphics();

  constructor(centerX: number, centerY: number, radiusX: number, radiusY: number, atk: number, totalMs = 620) {
    super(centerX - radiusX, centerY - radiusY, 0, 0, atk, totalMs + 80);
    this.width = radiusX * 2;
    this.height = radiusY * 2;
    this.totalMs = totalMs;
    this.container.addChild(this.ring);
  }

  override update(dt: number): void {
    if (!this.alive) return;
    this.elapsedMs += dt;
    const t = clamp(this.elapsedMs / this.totalMs, 0, 1);
    const pulse = 0.55 + t * 0.45;
    this.ring.clear();
    this.ring
      .ellipse(this.width / 2, this.height / 2, this.width / 2 * pulse, this.height / 2 * pulse)
      .fill({ color: 0x60d394, alpha: 0.2 + 0.18 * (1 - t) })
      .stroke({ color: 0xb8ffd6, alpha: 0.9 * (1 - t), width: 2 });
    if (this.elapsedMs >= this.totalMs) this.alive = false;
    this.container.x = Math.round(this.x);
    this.container.y = Math.round(this.y);
  }
}

class FloorTrapProjectile extends Projectile {
  private readonly baseAtk: number;
  private readonly trapWidth = 64;
  private readonly trapHeight = 10;
  private readonly startX: number;
  private readonly startY: number;
  private readonly targetX: number;
  private readonly targetY: number;
  private travelMs = 520;
  private elapsedMs = 0;
  private armMs = 900;
  private liveMs = 4200;
  private landed = false;
  private readonly marker = new Graphics();

  constructor(startX: number, startY: number, centerX: number, floorY: number, atk: number) {
    super(startX - 4, startY - 4, 0, 0, 0, 6400);
    this.baseAtk = atk;
    this.startX = startX;
    this.startY = startY;
    this.targetX = centerX;
    this.targetY = floorY;
    this.width = 0;
    this.height = 0;
    this.container.addChild(this.marker);
  }

  override canHitPlayer(): boolean {
    return this.landed && this.armMs <= 0;
  }

  override update(dt: number): void {
    if (!this.alive) return;

    if (!this.landed) {
      this.elapsedMs += dt;
      const t = clamp(this.elapsedMs / this.travelMs, 0, 1);
      const centerX = this.startX + (this.targetX - this.startX) * t;
      const centerY = this.startY + (this.targetY - this.startY) * t - Math.sin(t * Math.PI) * 38;
      this.x = centerX - 4;
      this.y = centerY - 4;
      this.vx = (this.targetX - this.startX) / (this.travelMs / 1000);
      this.vy = (this.targetY - this.startY) / (this.travelMs / 1000);
      this.drawFlyingTrap();
      if (t < 1) {
        this.container.x = Math.round(this.x);
        this.container.y = Math.round(this.y);
        return;
      }
      this.landed = true;
      this.x = this.targetX - this.trapWidth / 2;
      this.y = this.targetY - this.trapHeight;
      this.vx = 0;
      this.vy = 0;
    }

    this.armMs -= dt;
    const armed = this.armMs <= 0;
    this.atk = armed ? this.baseAtk : 0;
    this.width = armed ? this.trapWidth : 0;
    this.height = armed ? this.trapHeight : 0;
    if (armed) this.liveMs -= dt;
    this.drawGroundTrap(armed);
    if (this.liveMs <= 0) this.alive = false;
    this.container.x = Math.round(this.x);
    this.container.y = Math.round(this.y);
  }

  private drawFlyingTrap(): void {
    this.marker.clear();
    this.marker
      .circle(4, 4, 4)
      .fill({ color: 0xffc247, alpha: 0.8 })
      .stroke({ color: 0xffffff, alpha: 0.9, width: 1 });
  }

  private drawGroundTrap(armed: boolean): void {
    const pulse = 0.75 + Math.sin(Date.now() * 0.018) * 0.2;
    this.marker.clear();
    this.marker
      .rect(0, 1, this.trapWidth, this.trapHeight)
      .fill({ color: armed ? 0xff2d2d : 0xffc247, alpha: armed ? 0.34 * pulse : 0.26 })
      .stroke({ color: armed ? 0xfff0a3 : 0xffc247, alpha: 0.95, width: 2 });
    for (let x = 6; x < this.trapWidth; x += 10) {
      const spikeH = armed ? 9 : 5;
      this.marker
        .moveTo(x - 4, this.trapHeight)
        .lineTo(x, this.trapHeight - spikeH)
        .lineTo(x + 4, this.trapHeight)
        .stroke({ color: armed ? 0xfff0a3 : 0xffc247, alpha: armed ? 1 : 0.75, width: 1 });
    }
    if (!armed) {
      const fillW = this.trapWidth * clamp(1 - this.armMs / 900, 0, 1);
      this.marker.rect(0, 0, fillW, 2).fill({ color: 0xffffff, alpha: 0.85 });
    }
  }
}

class ExplosionProjectile extends Projectile {
  private elapsedMs = 0;
  private readonly totalMs: number;
  private readonly blast = new Graphics();

  constructor(centerX: number, centerY: number, radius: number, atk: number, totalMs = 180) {
    super(centerX - radius, centerY - radius, 0, 0, atk, totalMs + 80);
    this.width = radius * 2;
    this.height = radius * 2;
    this.totalMs = totalMs;
    this.container.addChild(this.blast);
  }

  override update(dt: number): void {
    if (!this.alive) return;
    this.elapsedMs += dt;
    const t = clamp(this.elapsedMs / this.totalMs, 0, 1);
    this.blast.clear();
    this.blast
      .circle(this.width / 2, this.height / 2, this.width / 2 * (0.65 + t * 0.35))
      .fill({ color: 0xff5c57, alpha: 0.34 * (1 - t * 0.55) })
      .stroke({ color: 0xfff0a3, alpha: 0.95 * (1 - t), width: 2 });
    if (this.elapsedMs >= this.totalMs) this.alive = false;
    this.container.x = Math.round(this.x);
    this.container.y = Math.round(this.y);
  }
}

abstract class BSeriesEnemy extends Enemy {
  protected faceTarget(): void {
    if (!this.target) return;
    this.facingRight = this.target.x + this.target.width / 2 >= this.x + this.width / 2;
  }

  protected steerFlyingTo(targetX: number, targetY: number, speed: number, stiffness = 2.2): void {
    const dx = targetX - (this.x + this.width / 2);
    const dy = targetY - (this.y + this.height / 2);
    this.vx = clamp(dx * stiffness, -speed, speed);
    this.vy = clamp(dy * stiffness, -speed, speed);
    if (Math.abs(this.vx) > 2) this.facingRight = this.vx > 0;
  }
}

export class B07_Gunner extends BSeriesEnemy {
  private fireTimer = 0;
  private hasFired = false;
  private readonly minRange = 84;
  pendingProjectiles: Projectile[] = [];

  constructor(level = 1) {
    super({ width: 18, height: 20, color: 0x78909c, hp: 1, atk: 1, def: 0, detectRange: 280, attackRange: 200, moveSpeed: 30, attackCooldown: 1800 });
    this.applyStats('B07_Gunner', level);
    this.sprite.clear();
    this.sprite.rect(2, 2, 14, 18).fill(0x78909c);
    this.sprite.rect(10, 7, 12, 4).fill(0xd7e3e8);
  }

  protected setupStates(): void {
    this.fsm.addState({ name: 'idle', update: () => this.fsm.transition('chase') });
    this.fsm.addState({
      name: 'chase',
      update: () => {
        if (!this.target) return;
        const dist = this.distToTarget();
        this.faceTarget();
        if (dist < this.minRange) {
          const dir = this.target.x < this.x ? 1 : -1;
          this.vx = dir * this.moveSpeed * 1.35;
          this.facingRight = dir > 0;
          return;
        }
        if (dist <= this.attackRange && this.cooldownTimer <= 0 && this.hasLineOfSightToTarget()) {
          this.fsm.transition('attack');
          return;
        }
        this.moveTowardTarget(this.moveSpeed);
      },
    });
    this.fsm.addState({
      name: 'attack',
      enter: () => {
        this.fireTimer = 360;
        this.hasFired = false;
        this.vx = 0;
      },
      update: (dt) => {
        this.vx = 0;
        this.faceTarget();
        this.fireTimer -= dt;
        this.sprite.alpha = this.fireTimer % 110 < 55 ? 1 : 0.68;
        if (this.fireTimer <= 0 && !this.hasFired) {
          if (this.target && this.hasLineOfSightToTarget()) fireStraightProjectile(this, this.target, this.pendingProjectiles, 175);
          this.hasFired = true;
          this.cooldownTimer = this.attackCooldown;
          this.sprite.alpha = 1;
          this.fsm.transition('cooldown');
        }
      },
      exit: () => { this.sprite.alpha = 1; },
    });
    this.fsm.addState({ name: 'cooldown', update: () => { if (this.cooldownTimer <= 0) this.fsm.transition('chase'); } });
    this.fsm.addState({ name: 'hit', update: (dt) => this.stateHitUpdate(dt) });
    this.fsm.addState({ name: 'death', update: () => {} });
  }
}

export class B20_Flit extends BSeriesEnemy {
  private phase = Math.random() * Math.PI * 2;
  private attackTimer = 0;
  private cooldown = 0;
  private attackActive = false;
  private dirX = 0;
  private dirY = 1;

  constructor(level = 1) {
    super({ width: 14, height: 14, color: 0xffe066, hp: 1, atk: 1, def: 0, detectRange: 180, attackRange: 18, moveSpeed: 58, attackCooldown: 1000 });
    this.applyStats('B20_Flit', level);
    this.sprite.clear();
    drawDiamond(this.sprite, 0xffe066, 14, 14);
    this.sprite.circle(7, 7, 3).fill(0xffffff);
  }

  protected setupStates(): void {
    this.fsm.addState({ name: 'idle', update: () => this.fsm.transition('patrol') });
    this.fsm.addState({
      name: 'patrol',
      update: (dt) => {
        this.phase += dt * 0.006;
        if (this.target && this.distToTarget() <= this.detectRange && this.cooldown <= 0) {
          this.fsm.transition('detect');
          return;
        }
        this.vx = Math.cos(this.phase) * this.moveSpeed * 0.8;
        this.vy = Math.sin(this.phase * 1.7) * this.moveSpeed * 0.45;
      },
    });
    this.fsm.addState({
      name: 'detect',
      enter: () => { this.attackTimer = 220; this.vx = 0; this.vy = 0; },
      update: (dt) => {
        this.attackTimer -= dt;
        this.faceTarget();
        this.sprite.alpha = this.attackTimer % 90 < 45 ? 1 : 0.72;
        if (this.attackTimer <= 0) this.fsm.transition('attack');
      },
      exit: () => { this.sprite.alpha = 1; },
    });
    this.fsm.addState({
      name: 'attack',
      enter: () => {
        const tx = this.target ? this.target.x + this.target.width / 2 : this.x;
        const ty = this.target ? this.target.y + this.target.height / 2 : this.y + 1;
        const dx = tx - (this.x + this.width / 2);
        const dy = ty - (this.y + this.height / 2);
        const len = Math.max(1, Math.hypot(dx, dy));
        this.dirX = dx / len;
        this.dirY = dy / len;
        this.attackTimer = 620;
        this.attackActive = true;
      },
      update: (dt) => {
        this.attackTimer -= dt;
        this.vx = this.dirX * this.moveSpeed * 2.6;
        this.vy = this.dirY * this.moveSpeed * 2.6;
        if (this.attackTimer <= 0) {
          this.attackActive = false;
          this.cooldown = this.attackCooldown;
          this.fsm.transition('cooldown');
        }
      },
      exit: () => { this.attackActive = false; },
    });
    this.fsm.addState({
      name: 'cooldown',
      update: (dt) => {
        this.cooldown -= dt;
        if (this.target) {
          const tc = targetCenter(this.target);
          this.steerFlyingTo(tc.x, tc.y - 36, this.moveSpeed);
        }
        if (this.cooldown <= 0) this.fsm.transition('patrol');
      },
    });
    this.fsm.addState({ name: 'hit', update: (dt) => this.stateHitUpdate(dt) });
    this.fsm.addState({ name: 'death', update: () => {} });
  }

  isAttackActive(): boolean { return this.attackActive; }
}

export class B24_Gunship extends BSeriesEnemy {
  private aimMs = 0;
  private fired = false;
  pendingProjectiles: Projectile[] = [];

  constructor(level = 1) {
    super({ width: 26, height: 18, color: 0x8fb3ff, hp: 1, atk: 1, def: 0, detectRange: 320, attackRange: 260, moveSpeed: 35, attackCooldown: 2000 });
    this.applyStats('B24_Gunship', level);
    this.sprite.clear();
    this.sprite.rect(2, 4, 22, 10).fill(0x8fb3ff);
    this.sprite.rect(7, 1, 12, 16).fill(0xc9ddff);
    this.sprite.circle(23, 9, 3).fill(0xfff0a3);
  }

  protected setupStates(): void {
    this.fsm.addState({ name: 'idle', update: () => this.fsm.transition('patrol') });
    this.fsm.addState({
      name: 'patrol',
      update: () => {
        if (!this.target) return;
        const tc = targetCenter(this.target);
        const side = this.x + this.width / 2 < tc.x ? -1 : 1;
        this.steerFlyingTo(tc.x + side * 112, tc.y - 84, this.moveSpeed);
        if (this.distToTarget() <= this.attackRange && this.cooldownTimer <= 0 && this.hasLineOfSightToTarget()) this.fsm.transition('attack');
      },
    });
    this.fsm.addState({
      name: 'attack',
      enter: () => { this.aimMs = 520; this.fired = false; this.vx = 0; this.vy = 0; },
      update: (dt) => {
        this.aimMs -= dt;
        this.faceTarget();
        this.sprite.tint = this.aimMs % 130 < 65 ? 0xffffff : 0xffd166;
        if (this.aimMs <= 0 && !this.fired) {
          if (this.target && this.hasLineOfSightToTarget()) fireStraightProjectile(this, this.target, this.pendingProjectiles, 185);
          this.fired = true;
          this.cooldownTimer = this.attackCooldown;
          this.sprite.tint = 0xffffff;
          this.fsm.transition('cooldown');
        }
      },
      exit: () => { this.sprite.tint = 0xffffff; },
    });
    this.fsm.addState({ name: 'cooldown', update: () => { if (this.cooldownTimer <= 0) this.fsm.transition('patrol'); } });
    this.fsm.addState({ name: 'hit', update: (dt) => this.stateHitUpdate(dt) });
    this.fsm.addState({ name: 'death', update: () => {} });
  }
}

export class B25_AirBomber extends BSeriesEnemy {
  private bombTimer = 0;
  private markerPulse = 0;
  private targetX = 0;
  private targetY = 0;
  private readonly aimMarker = new Graphics();
  pendingProjectiles: Projectile[] = [];

  constructor(level = 1) {
    super({ width: 22, height: 18, color: 0xd49a6a, hp: 1, atk: 1, def: 0, detectRange: 260, attackRange: 220, moveSpeed: 40, attackCooldown: 2200 });
    this.applyStats('B25_AirBomber', level);
    this.sprite.clear();
    this.sprite.rect(2, 3, 18, 12).fill(0xd49a6a);
    this.sprite.circle(11, 15, 4).fill(0xffc247);
    this.aimMarker.visible = false;
    this.container.addChild(this.aimMarker);
  }

  protected setupStates(): void {
    this.fsm.addState({ name: 'idle', update: () => this.fsm.transition('patrol') });
    this.fsm.addState({
      name: 'patrol',
      update: () => {
        if (!this.target) return;
        const tc = targetCenter(this.target);
        this.steerFlyingTo(tc.x, tc.y - 74, this.moveSpeed);
        if (this.distToTarget() <= this.attackRange && this.cooldownTimer <= 0) this.fsm.transition('attack');
      },
    });
    this.fsm.addState({
      name: 'attack',
      enter: () => {
        this.lockTargetPoint();
        this.bombTimer = 620;
        this.markerPulse = 0;
        this.aimMarker.visible = true;
        this.vx = 0;
        this.vy = 0;
      },
      update: (dt) => {
        this.bombTimer -= dt;
        this.markerPulse += dt;
        this.drawMarker();
        if (this.bombTimer <= 0) {
          this.pendingProjectiles.push(new LobberBombProjectile(this.x + this.width / 2, this.y + this.height, this.targetX, this.targetY, this.atk));
          this.aimMarker.visible = false;
          this.cooldownTimer = this.attackCooldown;
          this.fsm.transition('cooldown');
        }
      },
      exit: () => { this.aimMarker.visible = false; },
    });
    this.fsm.addState({ name: 'cooldown', update: () => { if (this.cooldownTimer <= 0) this.fsm.transition('patrol'); } });
    this.fsm.addState({ name: 'hit', update: (dt) => this.stateHitUpdate(dt) });
    this.fsm.addState({ name: 'death', update: () => {} });
  }

  private lockTargetPoint(): void {
    if (!this.target) return;
    this.targetX = this.target.x + this.target.width / 2;
    this.targetY = this.target.y + this.target.height;
  }

  private drawMarker(): void {
    const localX = this.targetX - this.x;
    const localY = this.targetY - this.y;
    const pulse = 1 + Math.sin(this.markerPulse * 0.025) * 0.14;
    this.aimMarker.clear();
    this.aimMarker.ellipse(localX, localY, 20 * pulse, 8 * pulse)
      .stroke({ color: 0xff6f3c, alpha: 0.95, width: 2 });
  }
}

export class B27_Carrier extends BSeriesEnemy {
  private castMs = 0;
  private hasSummoned = false;
  private summonsIssued = 0;
  private readonly summonLevel: number;
  pendingSummons: Enemy<string>[] = [];

  constructor(level = 1) {
    super({ width: 24, height: 20, color: 0x9adbcf, hp: 1, atk: 1, def: 0, detectRange: 260, attackRange: 0, moveSpeed: 35, attackCooldown: 3000 });
    this.summonLevel = level;
    this.applyStats('B27_Carrier', level);
    this.sprite.clear();
    this.sprite.rect(3, 4, 18, 12).fill(0x9adbcf);
    this.sprite.circle(12, 10, 7).stroke({ color: 0xe6fff9, width: 2 });
  }

  protected setupStates(): void {
    this.fsm.addState({ name: 'idle', update: () => this.fsm.transition('patrol') });
    this.fsm.addState({
      name: 'patrol',
      update: () => {
        if (!this.target) return;
        const tc = targetCenter(this.target);
        const dist = this.distToTarget();
        const retreat = dist < 120;
        this.steerFlyingTo(tc.x + (this.x < tc.x ? -130 : 130), tc.y - 80, retreat ? this.moveSpeed * 1.25 : this.moveSpeed);
        if (dist <= this.detectRange && this.cooldownTimer <= 0) this.fsm.transition('attack');
      },
    });
    this.fsm.addState({
      name: 'attack',
      enter: () => { this.castMs = 760; this.hasSummoned = false; this.vx = 0; this.vy = 0; },
      update: (dt) => {
        this.castMs -= dt;
        this.sprite.scale.set(1 + Math.sin(Date.now() * 0.03) * 0.08);
        if (this.castMs <= 160 && !this.hasSummoned) {
          this.summonFlits();
          this.hasSummoned = true;
        }
        if (this.castMs <= 0) {
          this.sprite.scale.set(1);
          this.cooldownTimer = this.attackCooldown;
          this.fsm.transition('cooldown');
        }
      },
      exit: () => { this.sprite.scale.set(1); },
    });
    this.fsm.addState({ name: 'cooldown', update: () => { if (this.cooldownTimer <= 0) this.fsm.transition('patrol'); } });
    this.fsm.addState({ name: 'hit', update: (dt) => this.stateHitUpdate(dt) });
    this.fsm.addState({ name: 'death', update: () => {} });
  }

  private summonFlits(): void {
    if (!this.target || this.summonsIssued >= 6) return;
    const count = Math.min(2, 6 - this.summonsIssued);
    for (let i = 0; i < count; i++) {
      const flit = new B20_Flit(this.summonLevel);
      const side = i % 2 === 0 ? -1 : 1;
      flit.x = this.x + this.width / 2 - flit.width / 2 + side * 18;
      flit.y = this.y + this.height / 2 - flit.height / 2;
      flit.prevX = flit.x;
      flit.prevY = flit.y;
      flit.bindSpawnContext(this.roomData, this.target);
      this.pendingSummons.push(flit);
      this.summonsIssued++;
    }
  }
}

export class B35_Bunker extends BSeriesEnemy {
  private attackMs = 0;
  private activeMs = 0;
  private attackActive = false;
  private readonly box = new Graphics();

  constructor(level = 1) {
    super({ width: 24, height: 24, color: 0x6f7d84, hp: 1, atk: 1, def: 0, detectRange: 160, attackRange: 22, moveSpeed: 0, attackCooldown: 1800 });
    this.applyStats('B35_Bunker', level);
    this.sprite.clear();
    this.sprite.rect(1, 2, 22, 20).fill(0x526066);
    this.sprite.rect(15, 1, 7, 22).fill(0xc3ccd1);
    this.container.addChild(this.box);
  }

  protected setupStates(): void {
    this.fsm.addState({
      name: 'idle',
      update: () => {
        this.vx = 0;
        if (this.target) this.faceTarget();
        if (this.distToTarget() <= this.detectRange && this.cooldownTimer <= 0) this.fsm.transition('attack');
      },
    });
    this.fsm.addState({
      name: 'attack',
      enter: () => { this.attackMs = 360; this.activeMs = 0; this.attackActive = false; },
      update: (dt) => {
        this.vx = 0;
        this.faceTarget();
        if (this.attackMs > 0) {
          this.attackMs -= dt;
          this.sprite.tint = this.attackMs % 120 < 60 ? 0xffffff : 0xffd166;
          return;
        }
        if (this.activeMs <= 0) {
          this.activeMs = 220;
          this.attackActive = true;
        }
        this.activeMs -= dt;
        if (this.activeMs <= 0) {
          this.attackActive = false;
          this.sprite.tint = 0xffffff;
          this.cooldownTimer = this.attackCooldown;
          this.fsm.transition('cooldown');
        }
      },
      exit: () => { this.attackActive = false; this.sprite.tint = 0xffffff; },
    });
    this.fsm.addState({ name: 'cooldown', update: () => { this.vx = 0; if (this.cooldownTimer <= 0) this.fsm.transition('idle'); } });
    this.fsm.addState({ name: 'hit', update: (dt) => this.stateHitUpdate(dt) });
    this.fsm.addState({ name: 'death', update: () => {} });
  }

  override update(dt: number): void {
    super.update(dt);
    this.drawAttackBox();
  }

  modifyIncomingHitDamage(damage: number, dirX: number): number {
    const frontHit = (this.facingRight && dirX < 0) || (!this.facingRight && dirX > 0);
    return frontHit ? 0 : damage;
  }

  override getAttackAABB(): { x: number; y: number; width: number; height: number } | null {
    if (!this.attackActive) return null;
    return { x: this.facingRight ? this.x + this.width - 2 : this.x - 34, y: this.y + 2, width: 36, height: 28 };
  }

  isAttackActive(): boolean { return this.attackActive; }

  private drawAttackBox(): void {
    this.box.clear();
    if (!this.attackActive) return;
    const x = this.facingRight ? this.width - 2 : -34;
    this.box.rect(x, 2, 36, 28)
      .fill({ color: 0xffb347, alpha: 0.18 })
      .stroke({ color: 0xffd166, alpha: 0.9, width: 1 });
  }
}

export class B37_Totem extends BSeriesEnemy {
  private castMs = 0;
  private hasSummoned = false;
  private summonsIssued = 0;
  private readonly summonLevel: number;
  pendingSummons: Enemy<string>[] = [];

  constructor(level = 1) {
    super({ width: 20, height: 28, color: 0x80cbc4, hp: 1, atk: 1, def: 0, detectRange: 280, attackRange: 0, moveSpeed: 0, attackCooldown: 3200 });
    this.summonLevel = level;
    this.applyStats('B37_Totem', level);
    this.sprite.clear();
    this.sprite.rect(3, 0, 14, 28).fill(0x5d8f89);
    this.sprite.circle(10, 8, 5).fill(0xb8fff2);
  }

  protected setupStates(): void {
    this.fsm.addState({
      name: 'idle',
      update: () => {
        this.vx = 0;
        if (this.target) this.faceTarget();
        if (this.distToTarget() <= this.detectRange && this.cooldownTimer <= 0) this.fsm.transition('attack');
      },
    });
    this.fsm.addState({
      name: 'attack',
      enter: () => { this.castMs = 820; this.hasSummoned = false; },
      update: (dt) => {
        this.castMs -= dt;
        this.vx = 0;
        this.sprite.alpha = 0.62 + Math.sin(Date.now() * 0.025) * 0.3;
        if (this.castMs <= 180 && !this.hasSummoned) {
          this.summonSwarmers();
          this.hasSummoned = true;
        }
        if (this.castMs <= 0) {
          this.sprite.alpha = 1;
          this.cooldownTimer = this.attackCooldown;
          this.fsm.transition('cooldown');
        }
      },
      exit: () => { this.sprite.alpha = 1; },
    });
    this.fsm.addState({ name: 'cooldown', update: () => { this.vx = 0; if (this.cooldownTimer <= 0) this.fsm.transition('idle'); } });
    this.fsm.addState({ name: 'hit', update: (dt) => this.stateHitUpdate(dt) });
    this.fsm.addState({ name: 'death', update: () => {} });
  }

  private summonSwarmers(): void {
    if (!this.target || this.summonsIssued >= 8) return;
    const count = Math.min(2, 8 - this.summonsIssued);
    for (let i = 0; i < count; i++) {
      const imp = new CinderImp(this.summonLevel);
      const side = i % 2 === 0 ? -1 : 1;
      imp.x = this.x + this.width / 2 - imp.width / 2 + side * 20;
      imp.y = this.y + this.height - imp.height;
      imp.prevX = imp.x;
      imp.prevY = imp.y;
      imp.bindSpawnContext(this.roomData, this.target);
      this.pendingSummons.push(imp);
      this.summonsIssued++;
    }
  }
}

export class B39_Emitter extends BSeriesEnemy {
  private castMs = 0;
  private fired = false;
  pendingProjectiles: Projectile[] = [];

  constructor(level = 1) {
    super({ width: 22, height: 22, color: 0x6bd7a8, hp: 1, atk: 1, def: 0, detectRange: 260, attackRange: 48, moveSpeed: 0, attackCooldown: 1500 });
    this.applyStats('B39_Emitter', level);
    this.sprite.clear();
    this.sprite.circle(11, 11, 10).fill(0x2f8f69);
    this.sprite.circle(11, 11, 5).fill(0xb8ffd6);
  }

  protected setupStates(): void {
    this.fsm.addState({
      name: 'idle',
      update: () => {
        this.vx = 0;
        if (this.distToTarget() <= this.detectRange && this.cooldownTimer <= 0) this.fsm.transition('attack');
      },
    });
    this.fsm.addState({
      name: 'attack',
      enter: () => { this.castMs = 420; this.fired = false; },
      update: (dt) => {
        this.castMs -= dt;
        this.sprite.scale.set(1 + Math.sin(Date.now() * 0.05) * 0.06);
        if (this.castMs <= 0 && !this.fired) {
          this.pendingProjectiles.push(new AreaPulseProjectile(this.x + this.width / 2, this.y + this.height / 2, 96, 68, this.atk));
          this.fired = true;
          this.cooldownTimer = this.attackCooldown;
          this.fsm.transition('cooldown');
        }
      },
      exit: () => { this.sprite.scale.set(1); },
    });
    this.fsm.addState({ name: 'cooldown', update: () => { this.vx = 0; if (this.cooldownTimer <= 0) this.fsm.transition('idle'); } });
    this.fsm.addState({ name: 'hit', update: (dt) => this.stateHitUpdate(dt) });
    this.fsm.addState({ name: 'death', update: () => {} });
  }
}

export class B45_HiddenSniper extends BSeriesEnemy {
  private aimMs = 0;
  private fired = false;
  private repositionMs = 0;
  pendingProjectiles: Projectile[] = [];

  constructor(level = 1) {
    super({ width: 18, height: 20, color: 0x6b7280, hp: 1, atk: 1, def: 0, detectRange: 300, attackRange: 280, moveSpeed: 40, attackCooldown: 2200 });
    this.applyStats('B45_HiddenSniper', level);
    this.sprite.clear();
    this.sprite.rect(2, 2, 14, 18).fill(0x4b5563);
    this.sprite.rect(9, 6, 14, 3).fill(0xd1d5db);
  }

  protected setupStates(): void {
    this.fsm.addState({ name: 'idle', enter: () => { this.sprite.alpha = 0.28; }, update: () => this.fsm.transition('patrol') });
    this.fsm.addState({
      name: 'patrol',
      update: () => {
        this.sprite.alpha = 0.28;
        if (!this.target) return;
        if (this.distToTarget() <= this.detectRange && this.hasLineOfSightToTarget() && this.cooldownTimer <= 0) {
          this.fsm.transition('attack');
          return;
        }
        this.moveTowardTarget(this.moveSpeed * 0.55);
      },
    });
    this.fsm.addState({
      name: 'attack',
      enter: () => { this.aimMs = 760; this.fired = false; this.vx = 0; this.sprite.alpha = 1; },
      update: (dt) => {
        this.aimMs -= dt;
        this.vx = 0;
        this.faceTarget();
        this.sprite.tint = this.aimMs % 160 < 80 ? 0xffffff : 0xff5c57;
        if (this.aimMs <= 0 && !this.fired) {
          if (this.target && this.hasLineOfSightToTarget()) fireStraightProjectile(this, this.target, this.pendingProjectiles, 240, 3600);
          this.fired = true;
          this.repositionMs = 620;
          this.cooldownTimer = this.attackCooldown;
          this.sprite.tint = 0xffffff;
          this.fsm.transition('retreat');
        }
      },
      exit: () => { this.sprite.tint = 0xffffff; },
    });
    this.fsm.addState({
      name: 'retreat',
      update: (dt) => {
        if (!this.target) return;
        this.repositionMs -= dt;
        const dir = this.target.x < this.x ? 1 : -1;
        this.vx = dir * this.moveSpeed;
        this.facingRight = dir > 0;
        this.sprite.alpha = 0.45;
        if (this.repositionMs <= 0) this.fsm.transition('cooldown');
      },
    });
    this.fsm.addState({ name: 'cooldown', update: () => { this.vx = 0; this.sprite.alpha = 0.28; if (this.cooldownTimer <= 0) this.fsm.transition('patrol'); } });
    this.fsm.addState({ name: 'hit', update: (dt) => this.stateHitUpdate(dt) });
    this.fsm.addState({ name: 'death', update: () => {} });
  }
}

export class B46_TrapLayer extends BSeriesEnemy {
  private placeMs = 0;
  private trapPlaced = false;
  pendingProjectiles: Projectile[] = [];

  constructor(level = 1) {
    super({ width: 16, height: 18, color: 0x56616f, hp: 1, atk: 1, def: 0, detectRange: 80, attackRange: 0, moveSpeed: 45, attackCooldown: 2000 });
    this.applyStats('B46_TrapLayer', level);
    this.sprite.clear();
    this.sprite.rect(2, 2, 12, 16).fill(0x56616f);
    this.sprite.rect(4, 14, 8, 3).fill(0xffc247);
  }

  protected setupStates(): void {
    this.fsm.addState({ name: 'idle', enter: () => { this.sprite.alpha = 1; }, update: () => this.fsm.transition('patrol') });
    this.fsm.addState({
      name: 'patrol',
      update: () => {
        this.sprite.alpha = 1;
        if (this.target && this.distToTarget() <= this.detectRange && this.cooldownTimer <= 0 && this.hasLineOfSightToTarget()) {
          this.fsm.transition('attack');
          return;
        }
        this.moveTowardTarget(this.moveSpeed * 0.55);
      },
    });
    this.fsm.addState({
      name: 'attack',
      enter: () => { this.placeMs = 420; this.trapPlaced = false; this.vx = 0; this.sprite.alpha = 1; },
      update: (dt) => {
        this.placeMs -= dt;
        this.vx = 0;
        this.sprite.tint = this.placeMs % 120 < 60 ? 0xffffff : 0xffc247;
        if (this.placeMs <= 0 && !this.trapPlaced) {
          const centerX = this.target ? this.target.x + this.target.width / 2 : this.x + this.width / 2;
          const startY = this.target ? this.target.y + this.target.height : this.y + this.height;
          const floorY = this.findTrapFloorY(centerX, startY);
          if (floorY !== null) {
            this.pendingProjectiles.push(new FloorTrapProjectile(
              this.x + this.width / 2,
              this.y + 4,
              centerX,
              floorY,
              this.atk,
            ));
          }
          this.trapPlaced = true;
          this.cooldownTimer = this.attackCooldown;
          this.fsm.transition('retreat');
        }
      },
      exit: () => { this.sprite.tint = 0xffffff; },
    });
    this.fsm.addState({
      name: 'retreat',
      update: () => {
        if (!this.target) return;
        const dir = this.target.x < this.x ? 1 : -1;
        this.vx = dir * this.moveSpeed * 1.2;
        this.facingRight = dir > 0;
        this.sprite.alpha = 1;
        if (this.distToTarget() > this.detectRange * 1.6) this.fsm.transition('cooldown');
      },
    });
    this.fsm.addState({ name: 'cooldown', update: () => { if (this.cooldownTimer <= 0) this.fsm.transition('patrol'); } });
    this.fsm.addState({ name: 'hit', update: (dt) => this.stateHitUpdate(dt) });
    this.fsm.addState({ name: 'death', update: () => {} });
  }

  private findTrapFloorY(centerX: number, startY: number): number | null {
    if (this.roomData.length === 0) return startY;
    const col = Math.floor(centerX / TILE_SIZE);
    const startRow = Math.max(0, Math.floor(startY / TILE_SIZE));
    const maxRow = Math.min(this.roomData.length - 1, startRow + 10);
    for (let row = startRow; row <= maxRow; row++) {
      if (isSolid(getTile(this.roomData, col, row))) return row * TILE_SIZE;
    }
    return null;
  }
}

export class B50_CeilingDropling extends BSeriesEnemy {
  private spawnX = 0;
  private spawnY = 0;
  private patrolDir: 1 | -1 = 1;
  private waitMs = 0;
  private dropMs = 0;
  private returnMs = 0;
  private attackActive = false;

  constructor(level = 1) {
    super({ width: 14, height: 16, color: 0x7f8c8d, hp: 1, atk: 1, def: 0, detectRange: 160, attackRange: 18, moveSpeed: 40, attackCooldown: 1100 });
    this.applyStats('B50_CeilingDropling', level);
    this.setSurfaceAttachment('ceiling');
    this.sprite.clear();
    drawDiamond(this.sprite, 0x7f8c8d, 14, 16);
    this.sprite.rect(5, 0, 4, 5).fill(0xd7e3e8);
  }

  protected setupStates(): void {
    this.fsm.addState({
      name: 'idle',
      enter: () => {
        this.spawnX = this.x;
        this.spawnY = this.y;
        this.movementType = 'surface';
        this.setSurfaceAttachment('ceiling');
      },
      update: () => this.fsm.transition('patrol'),
    });
    this.fsm.addState({
      name: 'patrol',
      update: () => {
        this.movementType = 'surface';
        this.setSurfaceAttachment('ceiling');
        this.vx = this.patrolDir * this.moveSpeed;
        this.vy = 0;
        if (this.x > this.spawnX + 72) this.patrolDir = -1;
        if (this.x < this.spawnX - 72) this.patrolDir = 1;
        this.facingRight = this.patrolDir > 0;
        if (!this.target) return;
        const tc = targetCenter(this.target);
        if (Math.abs((this.x + this.width / 2) - tc.x) < 24 && this.distToTarget() <= this.detectRange && this.cooldownTimer <= 0) {
          this.fsm.transition('detect');
        }
      },
    });
    this.fsm.addState({
      name: 'detect',
      enter: () => { this.waitMs = 420; this.vx = 0; this.vy = 0; },
      update: (dt) => {
        this.waitMs -= dt;
        this.sprite.alpha = this.waitMs % 120 < 60 ? 1 : 0.62;
        if (this.waitMs <= 0) this.fsm.transition('attack');
      },
      exit: () => { this.sprite.alpha = 1; },
    });
    this.fsm.addState({
      name: 'attack',
      enter: () => {
        this.movementType = 'flying';
        this.dropMs = 620;
        this.attackActive = true;
      },
      update: (dt) => {
        this.dropMs -= dt;
        this.vx = 0;
        this.vy = this.moveSpeed * 3.1;
        if (this.dropMs <= 0 || (this.target && this.y > this.target.y + this.target.height + 20)) {
          this.attackActive = false;
          this.cooldownTimer = this.attackCooldown;
          this.fsm.transition('cooldown');
        }
      },
      exit: () => { this.attackActive = false; },
    });
    this.fsm.addState({
      name: 'cooldown',
      enter: () => {
        this.returnMs = 900;
        this.movementType = 'flying';
      },
      update: (dt) => {
        this.returnMs -= dt;
        const targetX = this.spawnX + this.width / 2;
        const targetY = this.spawnY + this.height / 2;
        this.steerFlyingTo(targetX, targetY, this.moveSpeed * 1.4);
        if (this.cooldownTimer <= 0 && (this.returnMs <= 0 || Math.hypot(targetX - (this.x + this.width / 2), targetY - (this.y + this.height / 2)) < 10)) {
          this.movementType = 'surface';
          this.setSurfaceAttachment('ceiling');
          this.fsm.transition('patrol');
        }
      },
    });
    this.fsm.addState({ name: 'hit', update: (dt) => this.stateHitUpdate(dt) });
    this.fsm.addState({ name: 'death', update: () => {} });
  }

  isAttackActive(): boolean { return this.attackActive; }
}

export class B52_WallGun extends BSeriesEnemy {
  private aimMs = 0;
  private fired = false;
  pendingProjectiles: Projectile[] = [];

  constructor(level = 1) {
    super({ width: 22, height: 18, color: 0x90a4ae, hp: 1, atk: 1, def: 0, detectRange: 300, attackRange: 220, moveSpeed: 0, attackCooldown: 1900 });
    this.applyStats('B52_WallGun', level);
    this.setSurfaceAttachment('ceiling');
    this.sprite.clear();
    this.sprite.rect(1, 2, 20, 14).fill(0x607d8b);
    this.sprite.rect(10, 7, 15, 4).fill(0xd7e3e8);
  }

  protected setupStates(): void {
    this.fsm.addState({
      name: 'idle',
      enter: () => {
        this.movementType = 'surface';
        this.chooseNearestSurfaceAttachment();
      },
      update: () => {
        this.movementType = 'surface';
        this.vx = 0;
        this.vy = 0;
        if (!this.target) return;
        this.faceTarget();
        if (this.distToTarget() <= this.attackRange && this.cooldownTimer <= 0 && this.hasLineOfSightToTarget()) this.fsm.transition('attack');
      },
    });
    this.fsm.addState({
      name: 'attack',
      enter: () => { this.aimMs = 420; this.fired = false; },
      update: (dt) => {
        this.aimMs -= dt;
        this.vx = 0;
        this.vy = 0;
        this.faceTarget();
        this.sprite.tint = this.aimMs % 120 < 60 ? 0xffffff : 0xffd166;
        if (this.aimMs <= 0 && !this.fired) {
          if (this.target && this.hasLineOfSightToTarget()) fireStraightProjectile(this, this.target, this.pendingProjectiles, 190);
          this.fired = true;
          this.cooldownTimer = this.attackCooldown;
          this.fsm.transition('cooldown');
        }
      },
      exit: () => { this.sprite.tint = 0xffffff; },
    });
    this.fsm.addState({ name: 'cooldown', update: () => { this.vx = 0; this.vy = 0; if (this.cooldownTimer <= 0) this.fsm.transition('idle'); } });
    this.fsm.addState({ name: 'hit', update: (dt) => this.stateHitUpdate(dt) });
    this.fsm.addState({ name: 'death', update: () => {} });
  }
}

export class B53_Kamikaze extends BSeriesEnemy {
  private warnMs = 0;
  private exploded = false;
  private cleanupMs = 120;
  pendingProjectiles: Projectile[] = [];

  constructor(level = 1) {
    super({ width: 16, height: 18, color: 0xff6b4a, hp: 1, atk: 1, def: 0, detectRange: 200, attackRange: 36, moveSpeed: 60, attackCooldown: 0 });
    this.applyStats('B53_Kamikaze', level);
    this.sprite.clear();
    this.sprite.rect(2, 2, 12, 16).fill(0xff6b4a);
    this.sprite.circle(8, 8, 5).fill(0xfff0a3);
  }

  protected setupStates(): void {
    this.fsm.addState({ name: 'idle', update: () => this.fsm.transition('chase') });
    this.fsm.addState({
      name: 'chase',
      update: () => {
        if (!this.target) return;
        this.faceTarget();
        const dist = this.distToTarget();
        if (dist <= this.attackRange) {
          this.fsm.transition('attack');
          return;
        }
        const speedBoost = dist < this.detectRange * 0.5 ? 1.45 : 1;
        this.moveTowardTarget(this.moveSpeed * speedBoost);
        this.sprite.tint = dist < this.detectRange * 0.5 ? 0xfff0a3 : 0xffffff;
      },
    });
    this.fsm.addState({
      name: 'attack',
      enter: () => {
        this.warnMs = 840;
        this.exploded = false;
        this.cleanupMs = 120;
        this.vx = 0;
        this.superArmor = true;
      },
      update: (dt) => {
        this.vx = 0;
        this.warnMs -= dt;
        this.sprite.alpha = this.warnMs % 90 < 45 ? 1 : 0.45;
        if (this.warnMs <= 0 && !this.exploded) {
          this.pendingProjectiles.push(new ExplosionProjectile(this.x + this.width / 2, this.y + this.height / 2, 72, this.atk));
          this.exploded = true;
        }
        if (this.exploded) {
          this.cleanupMs -= dt;
          if (this.cleanupMs <= 0) super.onDeath();
        }
      },
      exit: () => {
        this.sprite.alpha = 1;
        this.sprite.tint = 0xffffff;
      },
    });
    this.fsm.addState({ name: 'hit', update: (dt) => this.stateHitUpdate(dt) });
    this.fsm.addState({ name: 'death', update: () => {} });
  }
}

abstract class DelayedDeathBSeriesEnemy extends BSeriesEnemy {
  protected deathDelayMs = 300;
  protected deathCleanupMs = 140;
  protected deathTriggered = false;
  protected deathResolved = false;
  protected deathTimerMs = 0;
  protected cleanupTimerMs = 0;

  override onDeath(): void {
    if (this.deathTriggered) return;
    this.deathTriggered = true;
    this.deathResolved = false;
    this.deathTimerMs = this.deathDelayMs;
    this.cleanupTimerMs = this.deathCleanupMs;
    this.hp = 1;
    this.vx = 0;
    this.vy = 0;
    this.superArmor = true;
    this.fsm.transition('death');
  }

  protected updateDelayedDeath(dt: number): void {
    this.vx = 0;
    this.deathTimerMs -= dt;
    this.sprite.alpha = this.deathTimerMs % 120 < 60 ? 1 : 0.5;
    this.sprite.tint = 0xff5c57;
    if (this.deathTimerMs <= 0 && !this.deathResolved) {
      this.resolveDelayedDeath();
      this.deathResolved = true;
    }
    if (this.deathResolved) {
      this.cleanupTimerMs -= dt;
      if (this.cleanupTimerMs <= 0) super.onDeath();
    }
  }

  protected abstract resolveDelayedDeath(): void;
}

export class B54_Volatile extends DelayedDeathBSeriesEnemy {
  private attackMs = 0;
  private activeMs = 0;
  private attackActive = false;
  pendingProjectiles: Projectile[] = [];

  constructor(level = 1) {
    super({ width: 18, height: 20, color: 0xd85a43, hp: 1, atk: 1, def: 0, detectRange: 180, attackRange: 40, moveSpeed: 40, attackCooldown: 1100 });
    this.applyStats('B54_Volatile', level);
    this.deathDelayMs = 600;
    this.sprite.clear();
    this.sprite.rect(2, 2, 14, 18).fill(0xd85a43);
    this.sprite.circle(9, 8, 5).fill(0xffc247);
  }

  protected setupStates(): void {
    this.fsm.addState({ name: 'idle', update: () => this.fsm.transition('chase') });
    this.fsm.addState({
      name: 'chase',
      update: () => {
        if (this.distToTarget() <= this.attackRange && this.cooldownTimer <= 0) {
          this.fsm.transition('attack');
          return;
        }
        this.moveTowardTarget(this.moveSpeed);
      },
    });
    this.fsm.addState({
      name: 'attack',
      enter: () => { this.attackMs = 260; this.activeMs = 0; this.attackActive = false; this.vx = 0; },
      update: (dt) => {
        this.attackMs -= dt;
        this.vx = 0;
        if (this.attackMs > 0) {
          this.sprite.tint = this.attackMs % 100 < 50 ? 0xffffff : 0xffc247;
          return;
        }
        if (this.activeMs <= 0) {
          this.activeMs = 180;
          this.attackActive = true;
        }
        this.activeMs -= dt;
        if (this.activeMs <= 0) {
          this.attackActive = false;
          this.cooldownTimer = this.attackCooldown;
          this.sprite.tint = 0xffffff;
          this.fsm.transition('cooldown');
        }
      },
      exit: () => { this.attackActive = false; this.sprite.tint = 0xffffff; },
    });
    this.fsm.addState({ name: 'cooldown', update: () => { if (this.cooldownTimer <= 0) this.fsm.transition('chase'); } });
    this.fsm.addState({ name: 'hit', update: (dt) => this.stateHitUpdate(dt) });
    this.fsm.addState({ name: 'death', update: (dt) => this.updateDelayedDeath(dt) });
  }

  override getAttackAABB(): { x: number; y: number; width: number; height: number } | null {
    if (!this.attackActive) return null;
    return { x: this.facingRight ? this.x + this.width - 2 : this.x - 24, y: this.y + 2, width: 26, height: 22 };
  }

  isAttackActive(): boolean { return this.attackActive; }

  protected resolveDelayedDeath(): void {
    this.pendingProjectiles.push(new ExplosionProjectile(this.x + this.width / 2, this.y + this.height / 2, 80, this.atk));
  }
}

export class B55_Brood extends DelayedDeathBSeriesEnemy {
  private attackMs = 0;
  private activeMs = 0;
  private attackActive = false;
  private readonly summonLevel: number;
  pendingSummons: Enemy<string>[] = [];

  constructor(level = 1) {
    super({ width: 22, height: 22, color: 0x8f6f5a, hp: 1, atk: 1, def: 0, detectRange: 180, attackRange: 20, moveSpeed: 35, attackCooldown: 1300 });
    this.summonLevel = level;
    this.deathDelayMs = 180;
    this.applyStats('B55_Brood', level);
    this.sprite.clear();
    this.sprite.rect(2, 4, 18, 16).fill(0x8f6f5a);
    this.sprite.circle(7, 9, 4).fill(0xc9a36a);
    this.sprite.circle(15, 11, 4).fill(0xc9a36a);
  }

  protected setupStates(): void {
    this.fsm.addState({ name: 'idle', update: () => this.fsm.transition('chase') });
    this.fsm.addState({
      name: 'chase',
      update: () => {
        if (this.distToTarget() <= this.attackRange && this.cooldownTimer <= 0) {
          this.fsm.transition('attack');
          return;
        }
        this.moveTowardTarget(this.moveSpeed);
      },
    });
    this.fsm.addState({
      name: 'attack',
      enter: () => { this.attackMs = 260; this.activeMs = 0; this.attackActive = false; this.vx = 0; },
      update: (dt) => {
        this.attackMs -= dt;
        this.vx = 0;
        if (this.attackMs > 0) return;
        if (this.activeMs <= 0) {
          this.activeMs = 180;
          this.attackActive = true;
        }
        this.activeMs -= dt;
        if (this.activeMs <= 0) {
          this.attackActive = false;
          this.cooldownTimer = this.attackCooldown;
          this.fsm.transition('cooldown');
        }
      },
      exit: () => { this.attackActive = false; },
    });
    this.fsm.addState({ name: 'cooldown', update: () => { if (this.cooldownTimer <= 0) this.fsm.transition('chase'); } });
    this.fsm.addState({ name: 'hit', update: (dt) => this.stateHitUpdate(dt) });
    this.fsm.addState({ name: 'death', update: (dt) => this.updateDelayedDeath(dt) });
  }

  override getAttackAABB(): { x: number; y: number; width: number; height: number } | null {
    if (!this.attackActive) return null;
    return { x: this.facingRight ? this.x + this.width - 2 : this.x - 20, y: this.y + 4, width: 22, height: 18 };
  }

  isAttackActive(): boolean { return this.attackActive; }

  protected resolveDelayedDeath(): void {
    this.spawnBroodlings(3);
  }

  protected spawnBroodlings(count: number): void {
    if (!this.target) return;
    for (let i = 0; i < count; i++) {
      const imp = new CinderImp(this.summonLevel);
      const side = i % 2 === 0 ? -1 : 1;
      imp.x = this.x + this.width / 2 - imp.width / 2 + side * (14 + i * 4);
      imp.y = this.y + this.height - imp.height;
      imp.prevX = imp.x;
      imp.prevY = imp.y;
      imp.bindSpawnContext(this.roomData, this.target);
      this.pendingSummons.push(imp);
    }
  }
}

export class B56_Rupture extends B55_Brood {
  pendingProjectiles: Projectile[] = [];

  constructor(level = 1) {
    super(level);
    this.applyStats('B56_Rupture', level);
    this.deathDelayMs = 800;
    this.sprite.clear();
    this.sprite.rect(1, 2, 24, 24).fill(0x7a4b40);
    this.sprite.circle(8, 11, 5).fill(0xff8a5c);
    this.sprite.circle(18, 13, 5).fill(0xffc247);
    this.width = 26;
    this.height = 26;
  }

  protected override resolveDelayedDeath(): void {
    this.pendingProjectiles.push(new ExplosionProjectile(this.x + this.width / 2, this.y + this.height / 2, 88, this.atk));
    this.spawnBroodlings(3);
  }
}

export class B57_AirKamikaze extends BSeriesEnemy {
  private warnMs = 0;
  private exploded = false;
  private cleanupMs = 120;
  pendingProjectiles: Projectile[] = [];

  constructor(level = 1) {
    super({ width: 16, height: 16, color: 0xff7a4a, hp: 1, atk: 1, def: 0, detectRange: 220, attackRange: 36, moveSpeed: 70, attackCooldown: 0 });
    this.applyStats('B57_AirKamikaze', level);
    this.sprite.clear();
    drawDiamond(this.sprite, 0xff7a4a, 16, 16);
    this.sprite.circle(8, 8, 4).fill(0xfff0a3);
  }

  protected setupStates(): void {
    this.fsm.addState({ name: 'idle', update: () => this.fsm.transition('chase') });
    this.fsm.addState({
      name: 'chase',
      update: () => {
        if (!this.target) return;
        this.faceTarget();
        const dist = this.distToTarget();
        if (dist <= this.attackRange) {
          this.fsm.transition('attack');
          return;
        }
        const tc = targetCenter(this.target);
        const speedBoost = dist < this.detectRange * 0.45 ? 1.55 : 1;
        this.steerFlyingTo(tc.x, tc.y, this.moveSpeed * speedBoost, 3);
        this.sprite.tint = dist < this.detectRange * 0.45 ? 0xfff0a3 : 0xffffff;
      },
    });
    this.fsm.addState({
      name: 'attack',
      enter: () => {
        this.warnMs = 520;
        this.exploded = false;
        this.cleanupMs = 120;
        this.vx = 0;
        this.vy = 0;
        this.superArmor = true;
      },
      update: (dt) => {
        this.vx = 0;
        this.vy = 0;
        this.warnMs -= dt;
        this.sprite.alpha = this.warnMs % 80 < 40 ? 1 : 0.42;
        if (this.warnMs <= 0 && !this.exploded) {
          this.pendingProjectiles.push(new ExplosionProjectile(this.x + this.width / 2, this.y + this.height / 2, 72, this.atk));
          this.exploded = true;
        }
        if (this.exploded) {
          this.cleanupMs -= dt;
          if (this.cleanupMs <= 0) super.onDeath();
        }
      },
      exit: () => {
        this.sprite.alpha = 1;
        this.sprite.tint = 0xffffff;
      },
    });
    this.fsm.addState({ name: 'hit', update: (dt) => this.stateHitUpdate(dt) });
    this.fsm.addState({ name: 'death', update: () => {} });
  }
}

export class B58_AirBrood extends DelayedDeathBSeriesEnemy {
  private phase = Math.random() * Math.PI * 2;
  private attackMs = 0;
  private activeMs = 0;
  private attackActive = false;
  private readonly summonLevel: number;
  pendingSummons: Enemy<string>[] = [];

  constructor(level = 1) {
    super({ width: 22, height: 18, color: 0x9aa6d8, hp: 1, atk: 1, def: 0, detectRange: 200, attackRange: 18, moveSpeed: 45, attackCooldown: 1400 });
    this.summonLevel = level;
    this.deathDelayMs = 260;
    this.applyStats('B58_AirBrood', level);
    this.sprite.clear();
    this.sprite.rect(2, 4, 18, 10).fill(0x9aa6d8);
    this.sprite.circle(7, 9, 4).fill(0xdce6ff);
    this.sprite.circle(15, 9, 4).fill(0xdce6ff);
  }

  protected setupStates(): void {
    this.fsm.addState({ name: 'idle', update: () => this.fsm.transition('chase') });
    this.fsm.addState({
      name: 'chase',
      update: (dt) => {
        if (!this.target) return;
        this.phase += dt * 0.005;
        const dist = this.distToTarget();
        if (dist <= this.attackRange && this.cooldownTimer <= 0) {
          this.fsm.transition('attack');
          return;
        }
        const tc = targetCenter(this.target);
        this.steerFlyingTo(tc.x + Math.cos(this.phase) * 26, tc.y - 28 + Math.sin(this.phase) * 16, this.moveSpeed, 2.4);
      },
    });
    this.fsm.addState({
      name: 'attack',
      enter: () => {
        this.attackMs = 240;
        this.activeMs = 0;
        this.attackActive = false;
        this.vx = 0;
        this.vy = 0;
      },
      update: (dt) => {
        this.attackMs -= dt;
        this.vx = 0;
        this.vy = 0;
        if (this.attackMs > 0) return;
        if (this.activeMs <= 0) {
          this.activeMs = 170;
          this.attackActive = true;
        }
        this.activeMs -= dt;
        if (this.activeMs <= 0) {
          this.attackActive = false;
          this.cooldownTimer = this.attackCooldown;
          this.fsm.transition('cooldown');
        }
      },
      exit: () => { this.attackActive = false; },
    });
    this.fsm.addState({ name: 'cooldown', update: () => { if (this.cooldownTimer <= 0) this.fsm.transition('chase'); } });
    this.fsm.addState({ name: 'hit', update: (dt) => this.stateHitUpdate(dt) });
    this.fsm.addState({ name: 'death', update: (dt) => this.updateDelayedDeath(dt) });
  }

  override getAttackAABB(): { x: number; y: number; width: number; height: number } | null {
    if (!this.attackActive) return null;
    return { x: this.x - 2, y: this.y - 2, width: this.width + 4, height: this.height + 4 };
  }

  isAttackActive(): boolean { return this.attackActive; }

  protected resolveDelayedDeath(): void {
    if (!this.target) return;
    for (let i = 0; i < 3; i++) {
      const flit = new B20_Flit(this.summonLevel);
      const angle = -Math.PI / 2 + (i - 1) * 0.65;
      flit.x = this.x + this.width / 2 - flit.width / 2 + Math.cos(angle) * 18;
      flit.y = this.y + this.height / 2 - flit.height / 2 + Math.sin(angle) * 12;
      flit.prevX = flit.x;
      flit.prevY = flit.y;
      flit.bindSpawnContext(this.roomData, this.target);
      this.pendingSummons.push(flit);
    }
  }
}

