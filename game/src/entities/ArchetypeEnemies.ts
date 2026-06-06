import { Graphics } from 'pixi.js';
import { Enemy } from './Enemy';
import { Projectile } from './Projectile';

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
        this.moveTowardTarget(this.moveSpeed);
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

  constructor(level = 1) {
    super({ width: 22, height: 24, color: 0x6f7d84, hp: 1, atk: 1, def: 0, detectRange: 160, attackRange: 22, moveSpeed: 22, attackCooldown: 1600 });
    this.applyStats('Bulwark', level);
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
      },
    });
    this.fsm.addState({
      name: 'chase',
      enter: () => { this.guardActive = true; },
      update: () => {
        this.guardActive = true;
        if (!this.target || this.distToTarget() > this.detectRange * 1.4) {
          this.fsm.transition('patrol');
          return;
        }
        this.facingRight = this.target.x >= this.x;
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
        this.telegraphTimer = 500;
        this.vulnerableTimer = 1500;
        this.vx = 0;
      },
      update: (dt) => {
        this.vx = 0;
        if (this.target) this.facingRight = this.target.x >= this.x;

        if (this.telegraphTimer > 0) {
          this.guardActive = true;
          this.telegraphTimer -= dt;
          this.sprite.alpha = this.telegraphTimer % 120 < 60 ? 1 : 0.75;
          return;
        }

        this.guardActive = false;
        this.vulnerableTimer -= dt;
        this.sprite.alpha = this.vulnerableTimer % 180 < 90 ? 1 : 0.65;
        if (this.vulnerableTimer <= 0) {
          this.sprite.alpha = 1;
          this.fsm.transition('attack');
        }
      },
      exit: () => { this.sprite.alpha = 1; },
    });
    this.fsm.addState({
      name: 'attack',
      enter: () => {
        this.guardActive = false;
        this.attackTimer = 260;
        this.attackActive = true;
        if (this.target) this.facingRight = this.target.x >= this.x;
      },
      update: (dt) => {
        this.attackTimer -= dt;
        const dir = this.facingRight ? 1 : -1;
        this.vx = dir * this.moveSpeed * 2.1;
        this.attackActive = this.attackTimer > 70;
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
      enter: () => {
        this.guardActive = true;
        this.vx = 0;
      },
      update: () => {
        this.guardActive = true;
        if (this.target) this.facingRight = this.target.x >= this.x;
        if (this.cooldownTimer <= 0) this.fsm.transition('chase');
      },
    });
    this.fsm.addState({ name: 'hit', update: (dt) => this.stateHitUpdate(dt) });
    this.fsm.addState({ name: 'death', update: () => {} });
  }

  override update(dt: number): void {
    super.update(dt);
    if (this.shieldDrawnFacingRight !== this.facingRight || this.shieldDrawnGuarding !== this.guardActive) this.redrawShield();
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
    const shieldFacingRight = !this.facingRight;
    const hitFront = (shieldFacingRight && dirX < 0) || (!shieldFacingRight && dirX > 0);
    if (hitFront) {
      this.blockFlashTimer = 180;
      return 0;
    }
    return damage;
  }

  private redrawShield(): void {
    this.shieldDrawnFacingRight = this.facingRight;
    this.shieldDrawnGuarding = this.guardActive;
    this.sprite.clear();
    this.sprite.rect(3, 0, 16, 24).fill(0x6f7d84);
    const shieldFacingRight = !this.facingRight;
    if (this.guardActive && shieldFacingRight) {
      this.sprite.rect(14, 1, 9, 22).fill(0xaab7bd);
      this.sprite.rect(18, 4, 2, 15).fill(0xd8e1e5);
    } else if (this.guardActive) {
      this.sprite.rect(-1, 1, 9, 22).fill(0xaab7bd);
      this.sprite.rect(2, 4, 2, 15).fill(0xd8e1e5);
    } else if (shieldFacingRight) {
      this.sprite.rect(11, 16, 10, 6).fill(0xaab7bd);
      this.sprite.rect(14, 18, 5, 2).fill(0xd8e1e5);
    } else {
      this.sprite.rect(1, 16, 10, 6).fill(0xaab7bd);
      this.sprite.rect(3, 18, 5, 2).fill(0xd8e1e5);
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
        const dir = this.target.x < this.x ? -1 : 1;
        const weave = Math.sin(this.skitterPhase) * this.moveSpeed * 0.55;
        this.vx = dir * this.moveSpeed * 1.15 + weave;
        this.facingRight = this.vx >= 0;
        if (this.grounded && Math.abs(this.target.y - this.y) > TILE * 0.5) {
          this.vy = -210;
        }
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
      name: 'attack',
      enter: () => {
        this.strikeTimer = 260;
        this.attackActive = true;
        if (this.target) this.strikeDir = this.target.x < this.x ? -1 : 1;
        this.facingRight = this.strikeDir > 0;
      },
      update: (dt) => {
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
        if (this.distToTarget() <= this.detectRange && this.cooldownTimer <= 0) this.fsm.transition('attack');
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
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const len = Math.max(1, Math.hypot(dx, dy));
    this.pendingProjectiles.push(new Projectile(this.x + 4, this.y + 4, dx / len * 150, dy / len * 150, this.atk));
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
        if (this.distToTarget() <= this.detectRange) {
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
        if (dist <= this.attackRange && this.cooldownTimer <= 0) {
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
