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

  constructor() {
    super({
      width: 14,
      height: 18,
      color: 0xaabbff,       // bright ghostly blue
      hp: 25,
      atk: 6,
      def: 1,
      detectRange: 240,       // long sight
      attackRange: 200,       // shoots from far
      moveSpeed: 40,          // slow drift
      attackCooldown: 1800,   // ms between shots
    });

    // Outer glow aura
    this.glowSprite = new Graphics();
    this.glowSprite.rect(-3, -3, 20, 24).fill({ color: 0xaabbff, alpha: 0.25 });
    this.container.addChildAt(this.glowSprite, 0);
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

    // Ghost retreats to maintain distance, doesn't rush in
    this.fsm.addState({
      name: 'chase',
      update: () => {
        const dist = this.horizontalDistToTarget();
        if (dist > this.detectRange * 1.5) {
          this.fsm.transition('idle');
          return;
        }

        // Keep distance ~120px from player
        const preferredDist = 120;
        if (dist < preferredDist - 20) {
          // Too close — retreat
          this.moveAwayFromTarget(this.moveSpeed);
        } else if (dist > preferredDist + 40) {
          // Too far — approach slowly
          this.moveTowardTarget(this.moveSpeed * 0.6);
        } else {
          this.vx = 0;
        }

        // Ready to shoot?
        if (dist <= this.attackRange && this.cooldownTimer <= 0) {
          this.fsm.transition('attack');
        }
      },
    });

    this.fsm.addState({
      name: 'attack',
      enter: () => {
        this.shootTimer = 400; // wind-up before shooting
        this.hasShot = false;
        this.vx = 0;
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

  private shoot(): void {
    if (!this.target) return;
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;
    const tx = this.target.x + this.target.width / 2;
    const ty = this.target.y + this.target.height / 2;
    const dx = tx - cx;
    const dy = ty - cy;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    const proj = new Projectile(
      cx - 4, cy - 4,
      (dx / dist) * PROJECTILE_SPEED,
      (dy / dist) * PROJECTILE_SPEED,
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

  // Override: Ghost ignores gravity and terrain (floats through walls)
  update(dt: number): void {
    if (!this.alive) {
      // Death fade handled by parent, but we need to update the timer
      super.update(dt);
      return;
    }

    this.savePrevPosition();
    this.updateInvincibility(dt);
    const dtSec = dt / 1000;

    if (this.cooldownTimer > 0) this.cooldownTimer -= dt;

    this.fsm.update(dt);

    // No gravity, no terrain collision — ghost floats
    this.x += this.vx * dtSec;
    // Gentle vertical bob
    this.y += Math.sin(Date.now() * 0.003) * 0.3;

    // Facing
    if (this.target) {
      this.facingRight = this.target.x > this.x;
    }

    // Ghostly pulsing visibility
    const pulse = 0.55 + 0.35 * Math.sin(Date.now() * 0.004);
    this.container.alpha = pulse;
    this.glowSprite.alpha = 0.15 + 0.2 * Math.sin(Date.now() * 0.003);
  }
}
