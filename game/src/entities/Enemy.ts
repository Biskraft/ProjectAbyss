import { Graphics } from 'pixi.js';
import { Entity } from './Entity';
import { resolveX, resolveY } from '@core/Physics';
import { StateMachine } from '@utils/StateMachine';
import type { CombatEntity } from '@combat/HitManager';

const GRAVITY = 980;
const MAX_FALL_SPEED = 576;

export type EnemyState = 'idle' | 'chase' | 'attack' | 'cooldown' | 'hit' | 'death';

export abstract class Enemy<S extends string = EnemyState> extends Entity implements CombatEntity {
  fsm: StateMachine<S>;
  protected sprite: Graphics;

  // Stats
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  facingRight = false;
  alive = true;

  // Physics
  protected grounded = false;

  // AI
  protected detectRange: number;
  protected attackRange: number;
  protected moveSpeed: number;
  protected attackCooldown: number;
  protected cooldownTimer = 0;

  // Super armor — if true, hits don't interrupt actions (no hitstun/knockback)
  superArmor = false;

  // Target reference
  target: CombatEntity | null = null;
  roomData: number[][] = [];

  // Hit
  private _hitstunTimer = 0;

  // HP bar
  private hpBarContainer: Graphics;
  private hpBarVisible = false;
  private hpBarTimer = 0;
  private readonly HP_BAR_SHOW_DURATION = 3000; // 3s

  // Death
  private deathTimer = 0;
  private readonly DEATH_FADE = 500;

  // Sakurai: Flash overlay for hit feedback
  private flashOverlay: Graphics | null = null;

  constructor(config: {
    width: number; height: number; color: number;
    hp: number; atk: number; def: number;
    detectRange: number; attackRange: number;
    moveSpeed: number; attackCooldown: number;
  }) {
    super();
    this.width = config.width;
    this.height = config.height;
    this.hp = config.hp;
    this.maxHp = config.hp;
    this.atk = config.atk;
    this.def = config.def;
    this.detectRange = config.detectRange;
    this.attackRange = config.attackRange;
    this.moveSpeed = config.moveSpeed;
    this.attackCooldown = config.attackCooldown;

    this.sprite = new Graphics();
    this.sprite.rect(0, 0, this.width, this.height).fill(config.color);
    this.container.addChild(this.sprite);

    // HP bar above head
    this.hpBarContainer = new Graphics();
    this.hpBarContainer.visible = false;
    this.container.addChild(this.hpBarContainer);

    this.fsm = new StateMachine<S>();
    this.setupStates();
    this.fsm.transition('idle' as S);
  }

  protected abstract setupStates(): void;

  update(dt: number): void {
    if (!this.alive) {
      this.deathTimer += dt;
      this.sprite.alpha = Math.max(0, 1 - this.deathTimer / this.DEATH_FADE);
      return;
    }

    this.savePrevPosition();
    this.updateInvincibility(dt);
    const dtSec = dt / 1000;

    // HP bar timer
    if (this.hpBarTimer > 0) {
      this.hpBarTimer -= dt;
      if (this.hpBarTimer <= 0) {
        this.hpBarVisible = false;
        this.hpBarContainer.visible = false;
      }
    }

    if (this.cooldownTimer > 0) this.cooldownTimer -= dt;

    this.fsm.update(dt);

    // Gravity
    this.vy += GRAVITY * dtSec;
    if (this.vy > MAX_FALL_SPEED) this.vy = MAX_FALL_SPEED;

    // Collision
    if (this.roomData.length > 0) {
      const rx = resolveX(this.x, this.y, this.width, this.height, this.vx * dtSec, this.roomData);
      this.x = rx.x;
      if (rx.collided) this.vx = 0;

      const ry = resolveY(this.x, this.y, this.width, this.height, this.vy * dtSec, this.roomData);
      this.y = ry.y;
      this.grounded = ry.grounded;
      if (ry.collided) {
        if (this.vy > 0) this.vy = 0;
        if (this.vy < 0) this.vy = 0;
      }
    }

    // Facing
    if (this.target) {
      this.facingRight = this.target.x > this.x;
    }
  }

  render(alpha: number): void {
    if (!this.container.destroyed) {
      super.render(alpha);
      this.sprite.scale.x = this.facingRight ? 1 : -1;
      this.sprite.x = this.facingRight ? 0 : this.width;

      // Sakurai: White flash overlay on hit (emphasize impact moment)
      if (this.flashTimer > 0) {
        if (!this.flashOverlay) {
          this.flashOverlay = new Graphics();
          this.container.addChild(this.flashOverlay);
        }
        this.flashOverlay.clear();
        this.flashOverlay.rect(0, 0, this.width, this.height)
          .fill({ color: 0xffffff, alpha: Math.min(0.8, this.flashTimer / 40) });
        this.flashOverlay.visible = true;
      } else if (this.flashOverlay) {
        this.flashOverlay.visible = false;
      }
    }
  }

  // --- CombatEntity ---

  onHit(knockbackX: number, knockbackY: number, hitstun: number): void {
    if (!this.alive) return;

    if (!this.superArmor) {
      this.vx = knockbackX;
      this.vy = knockbackY;
      this._hitstunTimer = hitstun;
      this.fsm.transition('hit' as S);
    }

    // Show HP bar on hit
    this.hpBarVisible = true;
    this.hpBarTimer = this.HP_BAR_SHOW_DURATION;
    this.hpBarContainer.visible = true;
    this.updateHpBar();
  }

  onDeath(): void {
    this.alive = false;
    this.deathTimer = 0;
    this.vx = 0;
    this.fsm.transition('death' as S);
  }

  get shouldRemove(): boolean {
    return !this.alive && this.deathTimer >= this.DEATH_FADE;
  }

  // --- Helpers ---

  protected distToTarget(): number {
    if (!this.target) return Infinity;
    const dx = (this.target.x + this.target.width / 2) - (this.x + this.width / 2);
    const dy = (this.target.y + this.target.height / 2) - (this.y + this.height / 2);
    return Math.sqrt(dx * dx + dy * dy);
  }

  protected horizontalDistToTarget(): number {
    if (!this.target) return Infinity;
    return Math.abs((this.target.x + this.target.width / 2) - (this.x + this.width / 2));
  }

  protected moveTowardTarget(speed: number): void {
    if (!this.target) return;
    const dir = this.target.x > this.x ? 1 : -1;
    this.vx = dir * speed;
  }

  private updateHpBar(): void {
    this.hpBarContainer.clear();
    const barW = this.width + 4;
    const barH = 3;
    const barX = (this.width - barW) / 2;
    const barY = -6;

    // Background
    this.hpBarContainer.rect(barX, barY, barW, barH).fill(0x333333);
    // HP fill
    const ratio = Math.max(0, this.hp / this.maxHp);
    const color = ratio > 0.5 ? 0x22cc22 : ratio > 0.25 ? 0xcccc22 : 0xcc2222;
    this.hpBarContainer.rect(barX, barY, barW * ratio, barH).fill(color);
  }

  protected stateHitUpdate(dt: number): void {
    this._hitstunTimer -= dt;
    this.vx *= 0.9;
    if (this._hitstunTimer <= 0) {
      this.fsm.transition('idle' as S);
    }
  }
}
