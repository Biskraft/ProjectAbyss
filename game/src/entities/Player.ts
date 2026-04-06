import { Graphics } from 'pixi.js';
import { Entity } from './Entity';
import { GameAction } from '@core/InputManager';
import { resolveX, resolveY, isInWater, isSolid } from '@core/Physics';
import { StateMachine } from '@utils/StateMachine';
import { COMBO_STEPS, COMBO_WINDOW, COMBO3_END_LAG } from '@combat/CombatData';
import type { CombatEntity } from '@combat/HitManager';
import type { Game } from '../Game';

// GDD System_3C_Character.md (SSoT)
const MOVE_SPEED = 144;           // px/s
const ACCEL_FRAMES = 4;           // frames to reach max speed
const GRAVITY = 980;              // px/s²
const MAX_FALL_SPEED = 576;       // px/s
const JUMP_HEIGHT = 119;          // px (~7.5 tiles, 1.5x)
const COYOTE_TIME = 150;          // ms
const JUMP_BUFFER = 250;          // ms
const DASH_DISTANCE = 96;         // px (6 tiles)
const DASH_DURATION = 150;        // ms
const DASH_GROUND_DELAY = 500;    // ms (ground dash recharge)
const ATTACK_MOVE_MULT = 0.8;     // 80% speed during attack
const BARE_HAND_ATK = 5;

// Wall Jump / Wall Slide (GDD System_3C_Character.md)
const WALL_SLIDE_SPEED = 60;         // px/s (slow descent on wall)
const WALL_JUMP_VX = 180;            // px/s horizontal kick-off
const WALL_JUMP_VY = -Math.sqrt(2 * GRAVITY * 64); // ~80% of normal jump
const WALL_JUMP_COOLDOWN = 200;      // ms before next wall interaction
const WALL_CHECK_DIST = 2;           // px to check for wall adjacency

// Derived: jump velocity from v² = 2*g*h => v = sqrt(2*g*h)
const JUMP_VELOCITY = -Math.sqrt(2 * GRAVITY * JUMP_HEIGHT); // negative = upward

const FRAME_MS = 1000 / 60;

export type PlayerState = 'idle' | 'run' | 'jump' | 'fall' | 'dash' | 'dive' | 'surge_charge' | 'surge_fly' | 'attack' | 'hit' | 'death';

export class Player extends Entity implements CombatEntity {
  private game: Game;
  private sprite: Graphics;
  private attackSprite: Graphics;
  fsm: StateMachine<PlayerState>;

  // Stats
  hp = 100;
  maxHp = 100;
  atk = 10 + BARE_HAND_ATK; // STR(Lv1) + bare hand
  def = 5;                   // VIT(10) * 0.5
  facingRight = true;

  // Collision box (70% of visual size)
  collisionW = 9;
  collisionH = 16;

  // Water
  inWater = false;

  // Drop-through one-way platforms (down + jump)
  dropThroughTimer = 0;
  private static readonly DROP_THROUGH_MS = 150;

  // Abilities (unlocked by relic pickups)
  abilities = {
    dash: false,
    diveAttack: false,
    surge: false,
    wallJump: false,
    doubleJump: false,
  };

  // Surge (Counter-Current Surge)
  private static readonly SURGE_CHARGE_MS = 200;  // 0.2s charge
  private static readonly SURGE_SPEED = 700;       // px/s upward (~2.5x double jump)
  private static readonly SURGE_DURATION = 350;    // ms of upward flight
  private surgeChargeTimer = 0;
  private surgeFlyTimer = 0;
  private surgeDirX = 0; // 0 = straight up, ±1 = diagonal off wall
  /** True during surge flight — scene can check for contact damage. */
  surgeActive = false;

  // Dive attack
  private diveStartY = 0;
  /** True on the frame dive attack lands — scene checks this for effects. */
  diveLanded = false;
  /** Fall distance of the last dive landing (px). */
  diveFallDistance = 0;

  // Last safe ground position (for spike hazard respawn)
  lastSafeX = 0;
  lastSafeY = 0;

  // Double jump
  private doubleJumpAvailable = false;

  // Wall slide / wall jump
  private touchingWallDir = 0;      // -1 left wall, +1 right wall, 0 none
  private wallSliding = false;
  private wallJumpCooldown = 0;     // ms remaining

  // Physics
  private grounded = false;

  // Coyote time & jump buffer
  private coyoteTimer = 0;
  private jumpBufferTimer = 0;
  private wasGrounded = false;

  // Dash
  private dashTimer = 0;
  private dashDirX = 0;
  private airDashAvailable = true;
  private groundDashAvailable = true;
  private groundDashDelayTimer = 0;

  // Death
  isDead = false;
  private deathTimer = 0;

  // Invincibility
  invincible = false;

  // Attack / combo
  comboIndex = 0;          // 0=1타, 1=2타, 2=3타
  attackTimer = 0;          // current attack frame timer (ms)
  comboWindowTimer = 0;     // time left to input next combo (ms)
  endLagTimer = 0;          // 3타 end lag (ms)
  attackQueued = false;     // next attack input buffered
  hitList = new Set<CombatEntity>();
  private attackActive = false;

  // Room data reference for collision
  roomData: number[][] = [];

  constructor(game: Game) {
    super();
    this.game = game;
    this.width = 14;
    this.height = 24;

    // Collision box is 70% of visual size (tighter feel in tile-based levels)
    this.collisionW = Math.floor(this.width * 0.7);   // 9px
    this.collisionH = Math.floor(this.height * 0.7);  // 16px

    // Placeholder sprite
    this.sprite = new Graphics();
    this.sprite.rect(0, 0, this.width, this.height).fill(0x2ecc71);
    this.container.addChild(this.sprite);

    // Attack hitbox visual (hidden by default)
    this.attackSprite = new Graphics();
    this.attackSprite.visible = false;
    this.container.addChild(this.attackSprite);

    // State machine
    this.fsm = new StateMachine<PlayerState>();
    this.setupStates();
    this.fsm.transition('fall');
  }

  private setupStates(): void {
    this.fsm.addState({
      name: 'idle',
      update: (dt) => this.stateIdle(dt),
    });
    this.fsm.addState({
      name: 'run',
      update: (dt) => this.stateRun(dt),
    });
    this.fsm.addState({
      name: 'jump',
      enter: () => { this.vy = JUMP_VELOCITY; this.grounded = false; },
      update: (dt) => this.stateAir(dt),
    });
    this.fsm.addState({
      name: 'fall',
      update: (dt) => this.stateAir(dt),
    });
    this.fsm.addState({
      name: 'dash',
      enter: () => this.startDash(),
      update: (dt) => this.stateDash(dt),
    });
    this.fsm.addState({
      name: 'dive',
      enter: () => this.startDive(),
      update: () => this.stateDive(),
    });
    this.fsm.addState({
      name: 'surge_charge',
      enter: () => this.startSurgeCharge(),
      update: (dt) => this.stateSurgeCharge(dt),
      exit: () => { this.vx = 0; },
    });
    this.fsm.addState({
      name: 'surge_fly',
      enter: () => this.startSurgeFly(),
      update: (dt) => this.stateSurgeFly(dt),
      exit: () => { this.surgeActive = false; },
    });
    this.fsm.addState({
      name: 'attack',
      enter: () => this.startAttack(),
      update: (dt) => this.stateAttack(dt),
      exit: () => this.endAttack(),
    });
    this.fsm.addState({
      name: 'hit',
      enter: () => this.startHit(),
      update: (dt) => this.stateHit(dt),
    });
    this.fsm.addState({
      name: 'death',
      enter: () => { this.vx = 0; this.deathTimer = 0; this.isDead = true; },
      update: (dt) => {
        this.deathTimer += dt;
        this.sprite.alpha = Math.max(0.2, 1 - this.deathTimer / 800);
      },
    });
  }

  update(dt: number): void {
    this.savePrevPosition();
    this.diveLanded = false; // reset each frame — scene reads this flag
    this.updateInvincibility(dt);
    const dtSec = dt / 1000;

    // Timers
    if (this.groundDashDelayTimer > 0) this.groundDashDelayTimer -= dt;
    if (this.jumpBufferTimer > 0) this.jumpBufferTimer -= dt;
    if (this.comboWindowTimer > 0) this.comboWindowTimer -= dt;
    if (this.endLagTimer > 0) this.endLagTimer -= dt;

    // Coyote time: track when we leave ground
    if (this.wasGrounded && !this.grounded && this.fsm.currentState !== 'jump') {
      this.coyoteTimer = COYOTE_TIME;
    }
    if (this.coyoteTimer > 0) this.coyoteTimer -= dt;

    // Reset air dash on landing + track last safe ground
    if (this.grounded && !this.wasGrounded) {
      this.airDashAvailable = true;
      this.doubleJumpAvailable = true;
    }
    if (this.grounded && this.hp > 0) {
      this.lastSafeX = this.x;
      this.lastSafeY = this.y;
    }
    // Recharge ground dash after delay
    if (this.grounded && this.groundDashDelayTimer <= 0) {
      this.groundDashAvailable = true;
    }

    this.wasGrounded = this.grounded;

    // Jump buffer: register press
    if (this.game.input.isJustPressed(GameAction.JUMP)) {
      // Down + Jump = drop through one-way platform (no jump)
      if (this.grounded && this.game.input.isDown(GameAction.LOOK_DOWN)) {
        this.dropThroughTimer = Player.DROP_THROUGH_MS;
        this.y += 2;
        this.grounded = false;
        this.coyoteTimer = 0;       // prevent coyote jump after drop
        this.jumpBufferTimer = 0;   // consume the input — don't also jump
        return;                     // skip all other jump/attack processing this frame
      }
      // Wall Jump: touching wall + jump → kick off opposite direction
      else if (this.wallSliding && this.touchingWallDir !== 0) {
        this.vx = -this.touchingWallDir * WALL_JUMP_VX;
        this.vy = WALL_JUMP_VY;
        this.facingRight = this.touchingWallDir < 0; // face away from wall
        this.wallJumpCooldown = WALL_JUMP_COOLDOWN;
        this.wallSliding = false;
        this.touchingWallDir = 0;
        this.fsm.transition('jump');
      }
      // Double Jump: in air + no coyote + ability unlocked + not used yet
      else if (!this.grounded && this.coyoteTimer <= 0 && this.abilities.doubleJump && this.doubleJumpAvailable) {
        this.vy = JUMP_VELOCITY * 0.85;
        this.doubleJumpAvailable = false;
        this.fsm.transition('jump');
      } else {
        this.jumpBufferTimer = JUMP_BUFFER;
      }
    }

    // Tick drop-through timer
    if (this.dropThroughTimer > 0) this.dropThroughTimer -= dt;

    const state = this.fsm.currentState;

    // Surge input — ↑ + C on ground or wall
    if (this.abilities.surge && this.game.input.isJustPressed(GameAction.DASH) &&
        this.game.input.isDown(GameAction.LOOK_UP) &&
        (this.grounded || this.wallSliding) &&
        state !== 'surge_charge' && state !== 'surge_fly' && state !== 'hit' && state !== 'death') {
      this.fsm.transition('surge_charge');
      return;
    }

    // Dash input (requires dash ability, available from most states, cancels 3타 end lag)
    if (this.abilities.dash && this.game.input.isJustPressed(GameAction.DASH) &&
        state !== 'dash' && state !== 'surge_charge' && state !== 'surge_fly' && state !== 'hit' && state !== 'death') {
      const canDash = this.grounded ? this.groundDashAvailable : this.airDashAvailable;
      if (canDash) {
        this.endLagTimer = 0;
        this.fsm.transition('dash');
        return;
      }
    }

    // Dive attack input — air + ↓ + X
    if (this.abilities.diveAttack && !this.grounded &&
        this.game.input.isDown(GameAction.LOOK_DOWN) &&
        this.game.input.isJustPressed(GameAction.ATTACK) &&
        state !== 'dive' && state !== 'dash' && state !== 'hit' && state !== 'death') {
      this.fsm.transition('dive');
      return;
    }

    // Attack input
    if (this.game.input.isJustPressed(GameAction.ATTACK) &&
        state !== 'dive' && state !== 'dash' && state !== 'hit' && state !== 'death') {
      if (state === 'attack') {
        // Queue next combo hit
        this.attackQueued = true;
      } else if (this.endLagTimer > 0) {
        // In end lag, no new attack
      } else if (this.comboWindowTimer > 0 && this.comboIndex < 3) {
        // Continue combo
        this.fsm.transition('attack');
        return;
      } else {
        // Start new combo
        this.comboIndex = 0;
        this.fsm.transition('attack');
        return;
      }
    }

    // Combo window expired → reset combo
    if (state !== 'attack' && this.comboWindowTimer <= 0 && this.endLagTimer <= 0) {
      this.comboIndex = 0;
    }

    // End lag finished → return to normal state
    if (state !== 'attack' && state !== 'hit' && state !== 'death' && state !== 'dash' && state !== 'dive' && this.endLagTimer > 0) {
      // Still in end lag, don't transition
    }

    // Run FSM
    this.fsm.update(dt);

    // Water detection
    this.inWater = isInWater(this.x, this.y, this.width, this.height, this.roomData);
    const waterMult = this.inWater ? 0.5 : 1.0; // slow everything in water

    // Apply gravity (except during dash/dive/surge) — reduced in water
    if (state !== 'dash' && state !== 'dive' && state !== 'surge_fly' && state !== 'surge_charge') {
      this.vy += GRAVITY * waterMult * dtSec;
      const maxFall = this.inWater ? MAX_FALL_SPEED * 0.4 : MAX_FALL_SPEED;
      if (this.vy > maxFall) this.vy = maxFall;
    }

    // Slow horizontal movement in water
    const moveX = this.vx * waterMult * dtSec;
    const moveY = this.vy * dtSec;
    const colOffX = (this.width - this.collisionW) / 2;   // center horizontally
    const colOffY = this.height - this.collisionH;         // anchor at feet

    const rx = resolveX(this.x + colOffX, this.y + colOffY, this.collisionW, this.collisionH, moveX, this.roomData);
    this.x = rx.x - colOffX;
    if (rx.collided) this.vx = 0;

    const ry = resolveY(this.x + colOffX, this.y + colOffY, this.collisionW, this.collisionH, moveY, this.roomData, this.dropThroughTimer > 0);
    this.y = ry.y - colOffY;
    this.grounded = ry.grounded;
    if (ry.collided) {
      if (this.vy > 0) this.vy = 0;
      if (this.vy < 0) this.vy = 0;
    }

    // Wall detection (for wall slide/jump) — check tiles adjacent to player sides
    this.touchingWallDir = 0;
    this.wallSliding = false;
    if (this.wallJumpCooldown > 0) this.wallJumpCooldown -= dt;
    if (!this.grounded && this.abilities.wallJump && this.wallJumpCooldown <= 0) {
      const TILE = 16;
      const midRow = Math.floor((this.y + colOffY + this.collisionH / 2) / TILE);
      const leftCol = Math.floor((this.x + colOffX - WALL_CHECK_DIST) / TILE);
      const rightCol = Math.floor((this.x + colOffX + this.collisionW + WALL_CHECK_DIST) / TILE);
      const leftSolid = isSolid(this.roomData[midRow]?.[leftCol] ?? 1);
      const rightSolid = isSolid(this.roomData[midRow]?.[rightCol] ?? 1);

      if (leftSolid && this.game.input.isDown(GameAction.MOVE_LEFT)) {
        this.touchingWallDir = -1;
      } else if (rightSolid && this.game.input.isDown(GameAction.MOVE_RIGHT)) {
        this.touchingWallDir = 1;
      }

      // Wall slide: slow descent when touching wall and falling
      if (this.touchingWallDir !== 0 && this.vy > 0) {
        this.vy = WALL_SLIDE_SPEED;
        this.wallSliding = true;
      }
    }

    // State transitions based on grounded
    if (state === 'jump' || state === 'fall') {
      if (this.grounded) {
        this.fsm.transition(Math.abs(this.vx) > 10 ? 'run' : 'idle');
      } else if (state === 'jump' && this.vy > 0) {
        this.fsm.transition('fall');
      }
    }

    // Facing direction: input takes priority, then velocity
    if (state !== 'attack' && state !== 'hit') {
      const input = this.game.input;
      if (input.isDown(GameAction.MOVE_RIGHT)) this.facingRight = true;
      else if (input.isDown(GameAction.MOVE_LEFT)) this.facingRight = false;
      else if (this.vx > 10) this.facingRight = true;
      else if (this.vx < -10) this.facingRight = false;
    }

    // Update camera facing
    this.game.camera.facingDirection = this.facingRight ? 1 : -1;
  }

  // --- CombatEntity interface ---

  onHit(knockbackX: number, knockbackY: number, hitstun: number): void {
    this.vx = knockbackX;
    this.vy = knockbackY;
    this._hitstunDuration = hitstun;
    this.fsm.transition('hit');
  }

  onDeath(): void {
    this.fsm.transition('death');
  }

  respawn(): void {
    this.isDead = false;
    this.deathTimer = 0;
    this.hp = this.maxHp;
    this.invincible = true;
    this.invincibleTimer = 1000;
    this.sprite.alpha = 1;
    this.vx = 0;
    this.vy = 0;
    this.fsm.transition('fall');
  }

  // --- Ground states ---

  private applyHorizontalInput(dt: number, speedMult = 1): void {
    const dtSec = dt / 1000;
    const input = this.game.input;
    const accelRate = MOVE_SPEED / (ACCEL_FRAMES / 60);
    const targetSpeed = MOVE_SPEED * speedMult;

    let inputX = 0;
    if (input.isDown(GameAction.MOVE_LEFT)) inputX -= 1;
    if (input.isDown(GameAction.MOVE_RIGHT)) inputX += 1;

    if (inputX !== 0) {
      const target = inputX * targetSpeed;
      const diff = target - this.vx;
      const accel = Math.sign(diff) * Math.min(Math.abs(diff), accelRate * dtSec);
      this.vx += accel;
    } else {
      const decel = accelRate * dtSec;
      if (Math.abs(this.vx) < decel) {
        this.vx = 0;
      } else {
        this.vx -= Math.sign(this.vx) * decel;
      }
    }
  }

  private tryJump(): boolean {
    const canJump = this.grounded || this.coyoteTimer > 0;
    const wantsJump = this.jumpBufferTimer > 0;

    if (canJump && wantsJump) {
      this.jumpBufferTimer = 0;
      this.coyoteTimer = 0;
      this.fsm.transition('jump');
      return true;
    }
    return false;
  }

  private stateIdle(dt: number): void {
    this.applyHorizontalInput(dt);
    if (this.tryJump()) return;
    if (!this.grounded) { this.fsm.transition('fall'); return; }
    if (Math.abs(this.vx) > 10) this.fsm.transition('run');
  }

  private stateRun(dt: number): void {
    this.applyHorizontalInput(dt);
    if (this.tryJump()) return;
    if (!this.grounded) { this.fsm.transition('fall'); return; }
    if (Math.abs(this.vx) < 10) this.fsm.transition('idle');
  }

  private stateAir(dt: number): void {
    this.applyHorizontalInput(dt);
    this.tryJump();
  }

  // --- Dash ---

  private startDash(): void {
    if (this.grounded) {
      this.groundDashAvailable = false;
      this.groundDashDelayTimer = DASH_GROUND_DELAY;
    } else {
      this.airDashAvailable = false;
    }
    this.dashTimer = DASH_DURATION;

    const input = this.game.input;
    if (input.isDown(GameAction.MOVE_RIGHT)) this.dashDirX = 1;
    else if (input.isDown(GameAction.MOVE_LEFT)) this.dashDirX = -1;
    else this.dashDirX = this.facingRight ? 1 : -1;

    const dashSpeed = DASH_DISTANCE / (DASH_DURATION / 1000);
    this.vx = this.dashDirX * dashSpeed;
    this.vy = 0;
  }

  private stateDash(dt: number): void {
    this.dashTimer -= dt;
    if (this.dashTimer <= 0) {
      this.vx = this.dashDirX * MOVE_SPEED * 0.5;
      if (this.grounded) {
        this.fsm.transition(Math.abs(this.vx) > 10 ? 'run' : 'idle');
      } else {
        this.fsm.transition('fall');
      }
    }
  }

  // --- Dive Attack ---

  private static readonly DIVE_SPEED = 900; // px/s

  private startDive(): void {
    this.diveStartY = this.y;
    this.vy = Player.DIVE_SPEED;
    this.vx = 0;
    this.diveLanded = false;
    this.attackActive = true;
  }

  private stateDive(): void {
    // Fixed downward speed, no horizontal movement
    this.vy = Player.DIVE_SPEED;
    this.vx = 0;

    if (this.grounded) {
      // Landed
      this.diveFallDistance = Math.max(0, this.y - this.diveStartY);
      this.diveLanded = true;
      this.attackActive = false;
      this.fsm.transition('idle');
    }
  }

  // --- Surge (Counter-Current Surge) ---

  private startSurgeCharge(): void {
    this.surgeChargeTimer = Player.SURGE_CHARGE_MS;
    this.vx = 0;
    this.vy = 0;

    // Determine launch direction — wall bounce or straight up
    if (this.wallSliding && this.touchingWallDir !== 0) {
      this.surgeDirX = -this.touchingWallDir; // diagonal away from wall
    } else {
      this.surgeDirX = 0; // straight up
    }
  }

  private stateSurgeCharge(dt: number): void {
    this.surgeChargeTimer -= dt;
    this.vx = 0;
    this.vy = 0;

    if (this.surgeChargeTimer <= 0) {
      this.fsm.transition('surge_fly');
    }
  }

  private startSurgeFly(): void {
    this.surgeFlyTimer = Player.SURGE_DURATION;
    this.surgeActive = true;
    this.attackActive = true;
    this.vy = -Player.SURGE_SPEED;
    this.vx = this.surgeDirX * Player.SURGE_SPEED * 0.5; // diagonal component

    if (this.surgeDirX !== 0) {
      this.facingRight = this.surgeDirX > 0;
    }
  }

  private stateSurgeFly(dt: number): void {
    this.surgeFlyTimer -= dt;

    // Maintain upward velocity (resist gravity)
    this.vy = -Player.SURGE_SPEED * Math.max(0, this.surgeFlyTimer / Player.SURGE_DURATION);

    if (this.surgeFlyTimer <= 0) {
      this.surgeActive = false;
      this.attackActive = false;
      this.fsm.transition('fall');
    }

    // Hit ceiling → end early
    if (this.vy <= 0 && this.y <= 0) {
      this.surgeActive = false;
      this.attackActive = false;
      this.vy = 0;
      this.fsm.transition('fall');
    }
  }

  // --- Attack (3-hit combo) ---

  private startAttack(): void {
    const step = COMBO_STEPS[this.comboIndex];
    this.attackTimer = step.totalFrames * FRAME_MS;
    this.attackActive = true;
    this.attackQueued = false;
    this.hitList.clear();
    this.comboWindowTimer = 0;

    // Show attack hitbox visual
    this.updateAttackVisual();
  }

  private stateAttack(dt: number): void {
    this.applyHorizontalInput(dt, ATTACK_MOVE_MULT);

    // Gravity already applied in update() before state dispatch — no double gravity

    this.attackTimer -= dt;

    const step = COMBO_STEPS[this.comboIndex];
    const activeEnd = step.activeFrames * FRAME_MS;

    // Deactivate hitbox after active frames
    if (this.attackTimer <= (step.totalFrames - step.activeFrames) * FRAME_MS) {
      this.attackActive = false;
      this.attackSprite.visible = false;
    }

    // Attack animation finished
    if (this.attackTimer <= 0) {
      this.attackActive = false;

      if (this.attackQueued && this.comboIndex < 2) {
        // Next combo step
        this.comboIndex++;
        this.attackQueued = false;
        this.startAttack();
        return;
      }

      // Attack done — set combo window or end lag
      if (this.comboIndex >= 2) {
        // 3타 finished → end lag
        this.endLagTimer = COMBO3_END_LAG;
        this.comboIndex = 0;
      } else {
        // 1타 or 2타 → combo window
        this.comboIndex++;
        this.comboWindowTimer = COMBO_WINDOW;
      }

      // Return to movement state
      if (this.grounded) {
        this.fsm.transition(Math.abs(this.vx) > 10 ? 'run' : 'idle');
      } else {
        this.fsm.transition('fall');
      }
    }
  }

  private endAttack(): void {
    this.attackActive = false;
    this.attackSprite.visible = false;
  }

  /** Whether the attack hitbox is currently active (for HitManager to check) */
  isAttackActive(): boolean {
    return this.attackActive;
  }

  private updateAttackVisual(): void {
    const step = COMBO_STEPS[this.comboIndex];
    this.attackSprite.clear();
    this.attackSprite.rect(0, 0, step.hitboxW, step.hitboxH)
      .fill({ color: 0xffff00, alpha: 0.3 });

    const offsetY = (this.height - step.hitboxH) / 2;
    if (this.facingRight) {
      this.attackSprite.x = this.width;
    } else {
      this.attackSprite.x = -step.hitboxW;
    }
    this.attackSprite.y = offsetY;
    this.attackSprite.visible = true;
  }

  // --- Hit ---

  private _hitstunDuration = 0;
  private _hitstunTimer = 0;

  private startHit(): void {
    this._hitstunTimer = this._hitstunDuration;
    this.endLagTimer = 0;
    this.comboWindowTimer = 0;
    this.comboIndex = 0;
  }

  private stateHit(dt: number): void {
    this._hitstunTimer -= dt;
    // Apply friction during hitstun
    this.vx *= 0.9;
    if (this._hitstunTimer <= 0) {
      if (this.grounded) {
        this.fsm.transition(Math.abs(this.vx) > 10 ? 'run' : 'idle');
      } else {
        this.fsm.transition('fall');
      }
    }
  }

  // --- Visual ---

  // Sakurai: Flash overlay for player hit feedback
  private flashOverlay: Graphics | null = null;

  render(alpha: number): void {
    super.render(alpha);

    // Flash when invincible (blink)
    this.sprite.alpha = this.invincible ? (Math.floor(Date.now() / 50) % 2 === 0 ? 0.4 : 1) : 1;

    // Sakurai: White flash on taking damage (overlaid during flashTimer)
    if (this.flashTimer > 0) {
      if (!this.flashOverlay) {
        this.flashOverlay = new Graphics();
        this.container.addChild(this.flashOverlay);
      }
      this.flashOverlay.clear();
      this.flashOverlay.rect(0, 0, this.width, this.height)
        .fill({ color: 0xff4444, alpha: Math.min(0.7, this.flashTimer / 40) });
      this.flashOverlay.visible = true;
    } else if (this.flashOverlay) {
      this.flashOverlay.visible = false;
    }

    // Flip sprite based on facing
    this.sprite.scale.x = this.facingRight ? 1 : -1;
    this.sprite.x = this.facingRight ? 0 : this.width;

    // Update attack visual position on flip
    if (this.attackSprite.visible) {
      const step = COMBO_STEPS[this.comboIndex];
      if (this.facingRight) {
        this.attackSprite.x = this.width;
      } else {
        this.attackSprite.x = -step.hitboxW;
      }
    }
  }
}
