import { Graphics } from 'pixi.js';
import { Enemy } from './Enemy';
import { Projectile } from './Projectile';

const PROJECTILE_SPEED = 120; // px/s

export class Ghost extends Enemy {
  private shootTimer = 0;
  private hasShot = false;
  private glowSprite: Graphics;
  /** Spawned projectiles — scene must read and manage these */
  pendingProjectiles: Projectile[] = [];

  constructor(level = 1) {
    super({
      width: 14,
      height: 18,
      color: 0xaabbff,
      hp: 1, atk: 1, def: 0,
      detectRange: 240, attackRange: 200,
      moveSpeed: 40, attackCooldown: 1800,
    });
    this.applyStats('Ghost', level);

    // Outer glow aura
    this.glowSprite = new Graphics();
    this.glowSprite.rect(-3, -3, 20, 24).fill({ color: 0xaabbff, alpha: 0.25 });
    this.container.addChildAt(this.glowSprite, 0);
  }

  // GDD §4.2 movement params
  private spawnX = 0;
  private spawnY = 0;
  private patrolDir = 1;
  private patrolRangePx = 5 * 16; // 5 tiles
  private detectTimer = 0;
  private loseTargetTimer = 0;
  private static readonly DETECT_CONFIRM_MS = 350;  // brief pause when spotting player
  private static readonly LOSE_TARGET_MS = 2000;
  private static readonly KEEP_DIST_MIN = 4 * 16;   // 4 tiles min
  private static readonly KEEP_DIST_MAX = 6 * 16;   // 6 tiles max

  protected setupStates(): void {
    // ── Idle → Patrol ──
    this.fsm.addState({
      name: 'idle',
      enter: () => { this.vx = 0; this.vy = 0; this.spawnX = this.x; this.spawnY = this.y; },
      update: () => {
        this.vx = 0; this.vy = 0;
        if (this.distToTarget() <= this.detectRange) {
          this.fsm.transition('detect');
          return;
        }
        this.fsm.transition('patrol');
      },
    });

    // ── Patrol: floating wander ──
    this.fsm.addState({
      name: 'patrol',
      enter: () => { if (this.spawnX === 0) { this.spawnX = this.x; this.spawnY = this.y; } },
      update: () => {
        if (this.distToTarget() <= this.detectRange) {
          this.fsm.transition('detect');
          return;
        }
        const speed = this.moveSpeed * 0.6;
        this.vx = this.patrolDir * speed;
        this.vy = 0;
        if (this.x > this.spawnX + this.patrolRangePx) this.patrolDir = -1;
        if (this.x < this.spawnX - this.patrolRangePx) this.patrolDir = 1;
      },
    });

    // ── Detect: brief pause (150ms) ──
    this.fsm.addState({
      name: 'detect',
      enter: () => { this.vx = 0; this.vy = 0; this.detectTimer = Ghost.DETECT_CONFIRM_MS; },
      update: (dt) => {
        this.vx = 0; this.vy = 0;
        this.detectTimer -= dt;
        if (this.distToTarget() > this.detectRange) {
          this.fsm.transition('patrol');
          return;
        }
        if (this.detectTimer <= 0) {
          this.fsm.transition('retreat');
        }
      },
    });

    // ── Chase: unused for Ghost, but kept for state machine fallback ──
    this.fsm.addState({
      name: 'chase',
      update: () => { this.fsm.transition('retreat'); },
    });

    // ── Retreat: maintain distance (GDD: keep_distance_min..max) ──
    this.fsm.addState({
      name: 'retreat',
      enter: () => { this.loseTargetTimer = Ghost.LOSE_TARGET_MS; },
      update: (dt) => {
        const dist = this.distToTarget();
        if (dist > this.detectRange * 1.5) {
          this.loseTargetTimer -= dt;
          if (this.loseTargetTimer <= 0) {
            this.fsm.transition('patrol');
            return;
          }
        } else {
          this.loseTargetTimer = Ghost.LOSE_TARGET_MS;
        }

        const hDist = this.horizontalDistToTarget();
        if (hDist < Ghost.KEEP_DIST_MIN) {
          this.moveAwayFromTarget(this.moveSpeed);
        } else if (hDist > Ghost.KEEP_DIST_MAX) {
          this.moveTowardTarget(this.moveSpeed * 0.6);
        } else {
          this.vx = 0;
        }
        // Vertical: gently float toward player Y
        if (this.target) {
          const dy = (this.target.y + this.target.height / 2) - (this.y + this.height / 2);
          this.vy = Math.sign(dy) * Math.min(Math.abs(dy), this.moveSpeed * 0.4);
        }

        // Ready to shoot?
        if (hDist <= this.attackRange && this.cooldownTimer <= 0) {
          this.fsm.transition('attack');
        }
      },
    });

    // ── Attack: wind-up (Tell 500ms) then shoot ──
    this.fsm.addState({
      name: 'attack',
      enter: () => {
        this.shootTimer = 500; // GDD: tell_duration_ms
        this.hasShot = false;
        this.vx = 0; this.vy = 0;
      },
      update: (dt) => {
        this.shootTimer -= dt;
        if (this.shootTimer <= 0 && !this.hasShot) {
          this.shoot();
          this.hasShot = true;
          this.cooldownTimer = this.attackCooldown;
          this.fsm.transition('cooldown');
        }
      },
    });

    // ── Cooldown ──
    this.fsm.addState({
      name: 'cooldown',
      update: () => {
        this.vx = 0; this.vy = 0;
        if (this.cooldownTimer <= 0) {
          this.fsm.transition('retreat');
        }
      },
    });

    // ── Hit / Death ──
    this.fsm.addState({ name: 'hit', update: (dt) => this.stateHitUpdate(dt) });
    this.fsm.addState({ name: 'death', update: () => {} });
  }

  private shoot(): void {
    if (!this.target) return;
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;
    const dir = this.target.x > this.x ? 1 : -1;

    const proj = new Projectile(
      cx - 4, cy - 4,
      dir * PROJECTILE_SPEED,
      0,
      this.atk,
    );
    this.pendingProjectiles.push(proj);
  }

  private moveAwayFromTarget(speed: number): void {
    if (!this.target) return;
    const dir = this.target.x > this.x ? -1 : 1;
    this.vx = dir * speed;
  }

  /** Ghost doesn't use melee — always returns false */
  isAttackActive(): boolean {
    return false;
  }

  // Flying: delegates physics to base class (no gravity, solid wall collision
  // only, platforms/air pass-through). Adds Ghost-specific visual effects.
  update(dt: number): void {
    super.update(dt);
    if (!this.alive) return;

    // Gentle vertical bob (cosmetic, on top of physics)
    this.y += Math.sin(Date.now() * 0.003) * 0.3;

    // Ghostly pulsing visibility
    const pulse = 0.55 + 0.35 * Math.sin(Date.now() * 0.004);
    this.container.alpha = pulse;
    this.glowSprite.alpha = 0.15 + 0.2 * Math.sin(Date.now() * 0.003);
  }
}
