import { Assets, Sprite, Texture } from 'pixi.js';
import { Enemy } from './Enemy';
import { Projectile } from './Projectile';
import { OrangeGlowFilter } from '@effects/OrangeGlowFilter';
import { assetPath } from '@core/AssetLoader';

const PROJECTILE_SPEED = 120; // px/s

const GHOST_ATLAS_PATH = 'assets/characters/ghost_01_atlas.png';

// ── Glow pulse — base ×2 of the previous setting, modulated 0.4..1.0× over
//    a slow 2.1s period for an "ember breathing" feel on the orange parts.
const GHOST_GLOW_BASE_INTENSITY = 4.0;
const GHOST_GLOW_PULSE_FREQ = 0.003;     // rad/ms — period ≈ 2094ms
const GHOST_GLOW_PULSE_LO = 0.4;
const GHOST_GLOW_PULSE_HI = 1.0;

export class Ghost extends Enemy {
  private shootTimer = 0;
  private hasShot = false;
  /** Atlas sprite — single 16×32 frame, no animation. Null until loaded. */
  private ghostSprite: Sprite | null = null;
  /** Glow filter applied to the atlas sprite — kept as a field so update()
   *  can modulate its intensity each frame for the slow pulse. */
  private orangeGlow: OrangeGlowFilter | null = null;
  /** Spawned projectiles — WorldProjectileRuntime drains and manages these. */
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

    // Sprite (16×32) extends well above the 14×18 collision — push HP bar up.
    this.hpBarOffsetY = -16;

    // Hide the base Enemy placeholder rect immediately — atlas takes over.
    this.sprite.visible = false;

    void this.loadGhostSprite();
  }

  /**
   * Loads ghost_01_atlas.png (16×32, single frame). Anchored bottom-center
   * so the visual body extends upward — fits a "floating" ghost over the
   * 14×18 collision box. Hit flash overlays this sprite via mainSprite.
   */
  private async loadGhostSprite(): Promise<void> {
    try {
      const tex = await Assets.load<Texture>(assetPath(GHOST_ATLAS_PATH));
      if (this.container.destroyed) return;
      tex.source.scaleMode = 'nearest';
      const s = new Sprite(tex);
      s.anchor.set(0.5, 1);
      s.x = this.width / 2;
      s.y = this.height;
      // Strong glow — chromatic mask gates it to orange pixels (eyes + booster).
      // Doubled intensity baseline; update() modulates it for a slow pulse.
      this.orangeGlow = new OrangeGlowFilter({
        color: 0xFF7000,
        radius: 12,
        intensity: GHOST_GLOW_BASE_INTENSITY,
        coreBoost: 2.0,
      });
      s.filters = [this.orangeGlow];
      this.container.addChildAt(s, 0);
      this.ghostSprite = s;
      this.mainSprite = s;  // Enemy.render hit flash uses this
      this.sprite.visible = false;
    } catch {
      // Load failed → keep base Graphics placeholder visible.
    }
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
        if (this.distToTarget() <= this.detectRange && this.hasLineOfSightToTarget()) {
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
        if (this.distToTarget() <= this.detectRange && this.hasLineOfSightToTarget()) {
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
        if (this.distToTarget() > this.detectRange || !this.hasLineOfSightToTarget()) {
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
        if (hDist <= this.attackRange && this.cooldownTimer <= 0 && this.hasLineOfSightToTarget()) {
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
    if (!this.hasLineOfSightToTarget()) return;
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

    // Facing — base Enemy.update locks facing to chaseDir during attack/cooldown/etc,
    // but Ghost skips the 'chase' state so chaseDir never updates. Override
    // explicitly: patrol uses patrolDir, every other state tracks the player.
    const fsmState = this.fsm.currentState;
    if (fsmState === 'patrol') {
      this.facingRight = this.patrolDir > 0;
    } else if (this.target) {
      // detect / retreat / attack / cooldown / hit — always face the player.
      this.facingRight = this.target.x > this.x;
    }
    // Mirror the atlas sprite around its anchor (0.5, 1).
    if (this.ghostSprite) {
      this.ghostSprite.scale.x = this.facingRight ? 1 : -1;
    }

    // Gentle vertical bob (cosmetic, on top of physics)
    this.y += Math.sin(Date.now() * 0.003) * 0.3;

    // Slow ember-breathing pulse on the orange glow (eyes + booster).
    if (this.orangeGlow) {
      const t = Date.now() * GHOST_GLOW_PULSE_FREQ;
      const phase = (Math.sin(t) + 1) * 0.5; // 0..1
      const factor = GHOST_GLOW_PULSE_LO + (GHOST_GLOW_PULSE_HI - GHOST_GLOW_PULSE_LO) * phase;
      this.orangeGlow.setIntensity(GHOST_GLOW_BASE_INTENSITY * factor);
    }
  }
}
