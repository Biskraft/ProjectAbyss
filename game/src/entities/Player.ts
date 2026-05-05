import { Graphics, Sprite, Assets, Rectangle, Texture } from 'pixi.js';
import { assetPath } from '@core/AssetLoader';
import { Entity } from './Entity';
import { GameAction } from '@core/InputManager';
import { resolveX, resolveY, isInWater, isOnIce, isSolid, tryCornerCorrectUp, tryLedgeSnap, tryDashCornerCorrect } from '@core/Physics';
import { Debug } from '@core/Debug';
import { StateMachine } from '@utils/StateMachine';
import { COMBO_STEPS, COMBO_WINDOW, COMBO3_END_LAG, type ComboStep } from '@combat/CombatData';
import { resolveComboFx, FX_SLASH_FRAMES } from '@combat/WeaponFx';
import { scaleComboStep, type CombatEntity } from '@combat/HitManager';
import type { Rarity, WeaponType } from '@data/weapons';
import type { Game } from '../Game';
import { PlayerConst } from '@data/constData';
import { BARE_HAND_ATK } from '@data/rarityConfig';
import { SFX } from '@audio/Sfx';

// SSoT: Sheets/Content_Player.csv (loaded via @data/constData)
const MOVE_SPEED = PlayerConst.MoveSpeed;
const ACCEL_FRAMES = PlayerConst.AccelFrames;
const GRAVITY = PlayerConst.Gravity;
const MAX_FALL_SPEED = PlayerConst.MaxFallSpeed;
const JUMP_HEIGHT = PlayerConst.JumpHeight;
const COYOTE_TIME = PlayerConst.CoyoteTimeMs;
const JUMP_BUFFER = PlayerConst.JumpBufferMs;
const DASH_DISTANCE = PlayerConst.DashDistance;
const DASH_DURATION = PlayerConst.DashDurationMs;
const DASH_GROUND_DELAY = PlayerConst.DashGroundDelayMs;
const ATTACK_MOVE_MULT = PlayerConst.AttackMoveMult;

const WALL_SLIDE_SPEED = PlayerConst.WallSlideSpeed;
const WALL_JUMP_VX = PlayerConst.WallJumpVx;
const WALL_JUMP_VY = -Math.sqrt(2 * GRAVITY * 56); // derived: ~70% of normal jump (3.5 tiles)
const WALL_JUMP_COOLDOWN = PlayerConst.WallJumpCooldownMs;
const WALL_CHECK_DIST = PlayerConst.WallCheckDist;
const LEDGE_TOLERANCE = PlayerConst.LedgeTolerance;

const VAR_JUMP_TIME = PlayerConst.VarJumpTimeMs;
const VAR_JUMP_CUT_MULT = PlayerConst.VarJumpCutMult;
const APEX_THRESHOLD = PlayerConst.ApexThreshold;
const APEX_GRAVITY_MULT = PlayerConst.ApexGravityMult;
const AIR_ACCEL_MULT = PlayerConst.AirAccelMult;
const DASH_FREEZE_MS = PlayerConst.DashFreezeMs;
const DASH_CORNER_TOLERANCE = PlayerConst.DashCornerToleranceY;

// Derived: jump velocity from v² = 2*g*h => v = sqrt(2*g*h)
const JUMP_VELOCITY = -Math.sqrt(2 * GRAVITY * JUMP_HEIGHT); // negative = upward

const FRAME_MS = 1000 / 60;

export type PlayerState = 'idle' | 'run' | 'jump' | 'fall' | 'dash' | 'dive' | 'surge_charge' | 'surge_fly' | 'attack' | 'hit' | 'death';

export class Player extends Entity implements CombatEntity {
  private game: Game;
  /**
   * Placeholder green rect — 에셋 로딩 중/실패 시 fallback.
   * erdaSprite 가 붙으면 invisible 처리.
   */
  private sprite: Graphics;
  /**
   * Erda 캐릭터 스프라이트. 32×32 RGBA (assets/characters/erda_atlas.png).
   * 8프레임 가로 아틀라스 — idle(0–3), jump(4–7).
   * 히트박스(14×24)보다 크므로 anchor=(0.5, 1) 로 "발 중앙" 정렬.
   * 로딩이 비동기이므로 로드 전엔 null, 로드 완료 시 컨테이너에 부착.
   */
  private erdaSprite: Sprite | null = null;
  /** 아틀라스에서 잘라낸 8개 프레임 텍스처 (idle 0–3, jump 4–7). */
  private erdaFrames: Texture[] = [];
  /**
   * 애니메이션 서브 스테이트:
   *   - idle   : 프레임 0..3 루프 (400ms/frame)
   *   - run    : 프레임 8..15 루프 (100ms/frame)
   *   - takeoff: 프레임 4, 짧은 이륙 squash (160ms)
   *   - air    : 프레임 5, 공중 지속
   *   - land   : 프레임 6 → 7, 짧은 착지 복구 (각 150ms)
   *   - dash   : 프레임 16 → 17 (startup 30ms + linger 120ms)
   *   - attack : 프레임 18..21, 진행률 기반 스크럽 (step.totalFrames*FRAME_MS 에 맞춰 4프레임 분할)
   * idle ↔ run 은 지상에서 |vx| 기준으로 매 프레임 스위칭.
   * 공중 진입/착지는 grounded 엣지로 트리거.
   * dash / attack 은 FSM state 감지로 진입/이탈.
   */
  private erdaAnim: 'idle' | 'run' | 'takeoff' | 'air' | 'land' | 'dash' | 'attack' = 'idle';
  /** idle/run/land 용 서브 프레임 인덱스 (0 기준). takeoff/air 는 사용 안 함. */
  private erdaAnimFrame = 0;
  /** 프레임 누적 타이머 (ms). */
  private erdaAnimTimer = 0;
  /** 이전 프레임의 grounded. 이륙/착지 엣지 감지용. */
  private erdaPrevGrounded = true;
  /**
   * 공중 진입이 점프(jump 입력)인지 단순 낙하(ledge walk-off)인지.
   * 낙하 시 air(5) / land 초반(6) 프레임을 스킵해 간결한 낙하-착지만 재생.
   */
  private erdaJumpedOff = false;
  private static readonly ANIM_IDLE_FRAME_MS = 400;  // 원본 100ms × 4 느리게
  private static readonly ANIM_RUN_FRAME_MS = 100;    // running — atlas 원본 속도
  private static readonly ANIM_TAKEOFF_MS = 160;      // 프레임 4 — 짧은 이륙 squash (2배 튜닝)
  private static readonly ANIM_LAND_FRAME_MS = 150;   // 프레임 6, 7 각각 — 속도 2/3 로 감속 (100→150ms)
  private static readonly ANIM_DASH_STARTUP_MS = 30;  // 프레임 16 — 날카로운 시동 (짧게)
  private static readonly ANIM_DASH_LINGER_MS = 120;  // 프레임 17 — 잔상 여운 (길게). 합계 150ms = DASH_DURATION
  /** Slash FX — atlas 프레임 ms. FX 스펙(sprite/scale/offset/color) 은 CSV(COMBO_STEPS) SSoT. */
  private static readonly ANIM_SLASH_FRAME_MS = 40;
  private slashFrames: Texture[] = [];
  private slashSprite: Sprite | null = null;
  private slashTimer = 0;          // 슬래시 애니메이션 타이머 (ms)
  private slashFrameIdx = 0;       // 현재 재생 중인 atlas 프레임 인덱스
  private slashFromIdx = 0;        // 재생 구간 시작
  private slashToIdx = -1;         // 재생 구간 끝 (비활성 시 -1)
  private slashHitboxW = 0;        // 이번 슬래시가 참조하는 히트박스 가로 — 위치 계산용
  private slashOffsetX = 0;        // CSV FxOffsetX 캐시 (공격 중 comboIndex 가 바뀌어도 현재 FX 유지)
  private slashOffsetY = 0;        // CSV FxOffsetY 캐시
  private attackSprite: Graphics;
  fsm: StateMachine<PlayerState>;

  // Stats
  hp = PlayerConst.BaseHp;
  maxHp = PlayerConst.BaseHp;
  atk = PlayerConst.BaseAtk + BARE_HAND_ATK; // STR(Lv1) + bare hand
  def = PlayerConst.BaseDef;
  facingRight = true;

  /**
   * Currently equipped weapon type — set by the scene whenever inventory
   * equip state changes. `null` = bare hand (falls back to Combo.csv FX).
   * Consumed by triggerSlash() to pick per-type FX from Content_FX_WeaponType.
   */
  equippedWeaponType: WeaponType | null = null;

  /**
   * One-shot pulse: ATTACK was pressed in a state that *would* attack, but
   * no weapon is equipped (and cheat off). Scene reads + clears this each
   * frame to surface a "No Weapon Equipped" toast with cooldown.
   */
  attackBlockedNoWeaponPulse = false;

  /**
   * Currently equipped weapon rarity — used for rarity-tinted slash FX.
   * `null` = bare hand.
   */
  equippedRarity: Rarity | null = null;

  /**
   * Hitbox scale multiplier derived from equipped weapon's HitboxW vs the
   * baseline bare-hand value (BASE_HITBOX_W). Applied to COMBO_STEPS in
   * getAttackStep(). Also consumed by HitManager via CombatEntity.attackHitboxMul.
   */
  attackHitboxMul = 1;

  // Collision box (70% of visual size)
  collisionW = PlayerConst.CollisionW;
  collisionH = PlayerConst.CollisionH;

  // Water
  inWater = false;
  /** True when player head is submerged (2+ tiles deep). */
  submerged = false;
  /** Tracks the previous frame's inWater flag to detect enter/exit transitions. */
  private prevInWater = false;
  /**
   * Transition flag: +1 = entered water this frame, -1 = exited water this
   * frame, 0 = no transition. Consumed by the scene for splash VFX.
   */
  private _waterTransition: 0 | 1 | -1 = 0;

  // Oxygen system
  private static readonly OXYGEN_MAX = PlayerConst.OxygenMaxMs;
  /** Current oxygen remaining (ms). Scene reads this for HUD. */
  oxygen = Player.OXYGEN_MAX;
  /** True when oxygen has run out → scene triggers death. */
  drowned = false;

  // Drop-through one-way platforms (down + jump)
  dropThroughTimer = 0;
  private static readonly DROP_THROUGH_MS = PlayerConst.DropThroughMs;

  // Echo Flask (GDD System_Healing_Recovery.md)
  flaskCharges = PlayerConst.FlaskInitialCharges;
  flaskMaxCharges = PlayerConst.FlaskInitialCharges;
  private static readonly FLASK_HEAL_PERCENT = PlayerConst.FlaskHealPercent;
  private static readonly FLASK_CAST_MS = PlayerConst.FlaskCastMs;
  private static readonly FLASK_BUFFER_MS = PlayerConst.FlaskBufferMs;
  private flaskCastTimer = 0;
  private flaskCasting = false;
  private flaskBufferTimer = 0;

  /** Callback: scene reads this to show heal VFX/toast after successful flask use. */
  onFlaskHeal: ((healAmount: number) => void) | null = null;

  // Abilities (unlocked by relic pickups)
  abilities = {
    dash: true,           // 기본 능력 — 처음부터 보유
    diveAttack: false,
    surge: false,
    waterBreathing: false,
    wallJump: false,
    doubleJump: false,
    cheat: false,         // DEBUG: ATK +99999 / HP +99999 via AbilityRelic (ability=cheat)
  };

  // Surge (Counter-Current Surge)
  private static readonly SURGE_CHARGE_MS = PlayerConst.SurgeChargeMs;
  private static readonly SURGE_SPEED = PlayerConst.SurgeSpeed;
  private static readonly SURGE_DURATION = PlayerConst.SurgeDurationMs;
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
  /** True 면 현재 grounded 상태가 carrier(GiantBuilder 등 이동 표면) 위에 서 있음을
   *  의미한다. 이 경우 lastSafeX/Y 를 갱신하지 않아 spike teleport 시
   *  carrier 가 떠나버린 위치로 복귀하지 않게 한다. Scene 이 매 프레임
   *  playerOnBuilder 결과로 갱신한다. */
  onCarrier = false;

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

  // --- VFX event flags (one-shot, consumed by scene per-frame) ---
  /** Peak downward vy observed during the current airborne segment (px/s). */
  private peakFallSpeed = 0;
  /** Set on the frame the player touches ground after being airborne. */
  private _justLanded = false;
  /** Fall speed captured at the landing frame (px/s, positive). */
  private _landingFallSpeed = 0;
  /** Set on the frame a dash started. */
  private _justDashed = false;
  /** Dash direction at the moment of the dash event (-1/+1). */
  private _dashDir = 1;
  /** Set on the frame a double jump was performed. */
  private _justDoubleJumped = false;
  /** Set on the frame a wall jump kick-off was performed. */
  private _justWallJumped = false;
  /** Wall side at the moment of the wall jump (-1=left wall kicked right, +1=right wall kicked left). */
  private _wallJumpDir = 0;
  /** Set on the frame a grounded (or coyote) jump fired — for takeoff puff. */
  private _justJumpedGround = false;
  /** Set on the frame the drop-through one-way move was triggered. */
  private _justDroppedThrough = false;
  /** Set on the frame startHit() ran (player took damage this frame). */
  private _justHitThisFrame = false;
  /** Captured hit direction at the moment of damage (+1 knocked right, -1 left). */
  private _hitKnockDir = 0;

  // Dash
  private dashTimer = 0;
  private dashDirX = 0;
  private airDashAvailable = true;
  private groundDashAvailable = true;
  private groundDashDelayTimer = 0;
  /** true 면 이번 대시가 지상에서 시작됐음. dash 종료 시 쿨타임/소진 판정 기준. */
  private dashStartedGrounded = false;
  /** 대시 선딜 동결 타이머 (ms). >0 이면 vx/vy=0, 방향만 샘플링. */
  private dashFreezeTimer = 0;

  // Variable jump height
  /** 점프 후 JUMP 떼면 상승속도를 절반 컷 할 수 있는 유효 시간 (ms). */
  private varJumpTimer = 0;

  // Death
  isDead = false;
  private deathTimer = 0;
  /** Telemetry: source of the most recent damage applied to the player.
   *  Set by scene damage sites (enemy name, 'projectile', 'spike', 'drown').
   *  Read by trackPlayerDeath when isDead fires on the next frame. */
  lastDamageSource = 'unknown';

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

    // Collision width: 70% (tighter feel in tile-based levels).
    // Collision height: 1.5 cell (24px @ TILE_SIZE=16) — 사용자 결정 (2026-05-03):
    //   기존 1 cell (16px) 은 1셀 높이 틈을 player 가 통과 가능 (= 메트로베니아
    //   능력 게이트로 막아야 할 좁은 통로가 무력화). 1.5 cell 로 키워 차단.
    this.collisionW = Math.floor(this.width * 0.7);   // 9px
    this.collisionH = 24;                             // 1.5 cell — 1셀 틈 통과 방지

    // Placeholder sprite — erdaSprite 로딩 전까지만 보임.
    this.sprite = new Graphics();
    this.sprite.rect(0, 0, this.width, this.height).fill(0x2ecc71);
    this.container.addChild(this.sprite);

    // Attack hitbox visual (hidden by default)
    this.attackSprite = new Graphics();
    this.attackSprite.visible = false;
    this.container.addChild(this.attackSprite);

    // 비동기 로드: 완료 시 Graphics 를 숨기고 Sprite 로 교체.
    this.loadErdaSprite();
    this.loadSlashSprite();

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
      enter: () => {
        this.vy = JUMP_VELOCITY;
        this.grounded = false;
        // Variable jump height — 이 시간 안에 JUMP 떼면 상승속도 절반 컷.
        this.varJumpTimer = VAR_JUMP_TIME;
      },
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
      exit: () => {
        // 지상 대시는 종료 경로와 무관하게 쿨타임이 시작되어야 한다.
        // 정상 종료(stateDash 의 dashTimer<=0) + 중단(onHit/onDeath 등 FSM 전이)
        // 양쪽 모두 여기서 커버. stateDash 에서 set 하면 중단 경로를 놓쳐
        // 피격 직후 즉시 재대시 가능한 버그 발생 (Codex review P2).
        if (this.dashStartedGrounded) {
          this.groundDashDelayTimer = DASH_GROUND_DELAY;
        }
      },
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
      // VFX: landing event — fall speed = whichever is larger (current vy or the
      // peak observed while airborne, in case resolveY clamped vy to 0 already).
      const landedSpeed = Math.max(this.vy, this.peakFallSpeed, 0);
      this._justLanded = true;
      this._landingFallSpeed = landedSpeed;
      this.peakFallSpeed = 0;
    }
    // Track peak downward speed while airborne for accurate landing VFX sizing.
    if (!this.grounded && this.vy > this.peakFallSpeed) {
      this.peakFallSpeed = this.vy;
    }
    // Carrier(GiantBuilder) 위 grounding 은 safe ground 로 기록하지 않는다.
    // 빌더가 이동/소실된 후 spike teleport 가 빈 공간을 가리키면 안 됨.
    if (this.grounded && this.hp > 0 && !this.onCarrier) {
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
        this._justDroppedThrough = true; // VFX: drop-through dust
        return;                     // skip all other jump/attack processing this frame
      }
      // Wall Jump: touching wall + jump → kick off opposite direction
      else if (this.wallSliding && this.touchingWallDir !== 0) {
        const kickDir = -this.touchingWallDir; // +1 = kicked to right, -1 = kicked to left
        this.vx = kickDir * WALL_JUMP_VX;
        this.vy = WALL_JUMP_VY;
        this.facingRight = this.touchingWallDir < 0; // face away from wall
        this.wallJumpCooldown = WALL_JUMP_COOLDOWN;
        this.wallSliding = false;
        this.touchingWallDir = 0;
        // VFX: wall-jump kick event
        this._justWallJumped = true;
        this._wallJumpDir = kickDir;
        this.fsm.transition('jump');
      }
      // Double Jump: in air + no coyote + ability unlocked + not used yet
      // Reset vy to 0 first so the jump height is consistent regardless of
      // whether the player is rising or falling when they press jump.
      else if (!this.grounded && this.coyoteTimer <= 0 && this.abilities.doubleJump && this.doubleJumpAvailable) {
        this.vy = 0;
        this.vy = JUMP_VELOCITY * 0.85;
        this.doubleJumpAvailable = false;
        // VFX: double-jump event
        this._justDoubleJumped = true;
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

    // Dive attack input — air + ↓ + C
    if (this.abilities.diveAttack && !this.grounded &&
        this.game.input.isDown(GameAction.LOOK_DOWN) &&
        this.game.input.isJustPressed(GameAction.ATTACK) &&
        state !== 'dive' && state !== 'dash' && state !== 'hit' && state !== 'death') {
      this.fsm.transition('dive');
      return;
    }

    // Attack input
    // Dash (ground or air) can be cancelled into attack — chaining
    // dash → attack tightens the combat rhythm and matches what muscle
    // memory expects from action games.
    // No weapon equipped → attack disabled entirely, except when cheat is on
    // (cheat already grants +99999 ATK so C should always swing for testing).
    const attackPressedThisFrame = this.game.input.isJustPressed(GameAction.ATTACK);
    const attackStateAllowed =
      state !== 'dive' && state !== 'hit' && state !== 'death';
    if (attackPressedThisFrame && attackStateAllowed &&
        this.equippedWeaponType === null && !this.abilities.cheat) {
      // Bare-hand swing attempt → surface toast via scene, no state change.
      this.attackBlockedNoWeaponPulse = true;
    }
    if (attackPressedThisFrame &&
        (this.equippedWeaponType !== null || this.abilities.cheat) &&
        attackStateAllowed) {
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

    // Echo Flask casting (GDD HEL-01)
    if (this.flaskCasting) {
      this.flaskCastTimer -= dt;
      this.vx = 0; // movement locked during cast
      // Trembling during cast — continuous small vibration
      if (this.vibrateFrames <= 0) {
        this.startVibrate(1.5, 4, true);
      }
      if (this.flaskCastTimer <= 0) {
        // Cast complete → heal + consume + white flash
        this.flaskCasting = false;
        this.flaskCharges--;
        const healAmt = Math.max(1, Math.floor(this.maxHp * Player.FLASK_HEAL_PERCENT));
        this.hp = Math.min(this.maxHp, this.hp + healAmt);
        this.triggerFlash();
        this.onFlaskHeal?.(healAmt);
      }
      // Skip FSM + movement while casting
    } else {
      // Buffer R key press for 200ms so it doesn't get swallowed during attack/dash
      if (this.game.input.isJustPressed(GameAction.FLASK)) {
        this.flaskBufferTimer = Player.FLASK_BUFFER_MS;
      }
      if (this.flaskBufferTimer > 0) {
        this.flaskBufferTimer -= dt;
        // Flask input check: grounded, has charges, not in a blocking state
        if (this.flaskCharges > 0 && this.grounded && this.hp < this.maxHp &&
            state !== 'attack' && state !== 'dash' && state !== 'dive' &&
            state !== 'hit' && state !== 'death' && state !== 'surge_fly') {
          this.flaskCasting = true;
          this.flaskCastTimer = Player.FLASK_CAST_MS;
          this.flaskBufferTimer = 0;
          this.vx = 0;
          this.startVibrate(1.5, 4, true);
        }
      }
    }

    // Run FSM (skip if flask casting — player is locked)
    if (!this.flaskCasting) {
      this.fsm.update(dt);
    }

    // Water detection
    this.inWater = isInWater(this.x, this.y, this.width, this.height, this.roomData);
    // Edge-detect water enter/exit for splash VFX
    if (this.inWater && !this.prevInWater) this._waterTransition = 1;
    else if (!this.inWater && this.prevInWater) this._waterTransition = -1;
    this.prevInWater = this.inWater;
    const waterMult = this.inWater ? PlayerConst.WaterMoveMult : 1.0; // slow everything in water

    // Submersion check — head (top of sprite) is in water = 2+ tiles deep
    const headRow = Math.floor(this.y / 16);
    const midCol = Math.floor((this.x + this.width / 2) / 16);
    const headInWater = this.roomData[headRow]?.[midCol] === 2;
    this.submerged = this.inWater && headInWater;

    // Oxygen timer
    this.drowned = false;
    if (this.submerged && !this.abilities.waterBreathing) {
      this.oxygen -= dt;
      if (this.oxygen <= 0) {
        this.oxygen = 0;
        this.drowned = true;
      }
    } else {
      // Recover oxygen when not submerged (fast recovery)
      this.oxygen = Math.min(Player.OXYGEN_MAX, this.oxygen + dt * PlayerConst.WaterOxygenRecoverMult);
    }

    // Apply gravity (except during dash/dive/surge) — reduced in water.
    // 정점 근처(|vy| < APEX_THRESHOLD)에서 중력 절반 → 체공감 상승.
    if (state !== 'dash' && state !== 'dive' && state !== 'surge_fly' && state !== 'surge_charge') {
      const apexMult = Math.abs(this.vy) < APEX_THRESHOLD ? APEX_GRAVITY_MULT : 1.0;
      this.vy += GRAVITY * waterMult * apexMult * dtSec;
      const maxFall = this.inWater ? MAX_FALL_SPEED * PlayerConst.WaterMaxFallMult : MAX_FALL_SPEED;
      if (this.vy > maxFall) this.vy = maxFall;
    }

    // Variable jump height — JUMP 버튼을 타이머 내에 떼면 상승속도 절반 컷.
    // tap = short hop, hold = full height. dash/surge 중엔 비활성 (varJumpTimer=0 유지).
    if (this.varJumpTimer > 0) {
      this.varJumpTimer -= dt;
      if (this.vy < 0 && this.game.input.isJustReleased(GameAction.JUMP)) {
        this.vy *= VAR_JUMP_CUT_MULT;
        this.varJumpTimer = 0;
      } else if (this.vy >= 0) {
        // 이미 낙하 중이면 타이머 의미 없음.
        this.varJumpTimer = 0;
      }
    }

    // Slow horizontal movement in water
    const moveX = this.vx * waterMult * dtSec;
    const moveY = this.vy * dtSec;
    const colOffX = (this.width - this.collisionW) / 2;   // center horizontally
    const colOffY = this.height - this.collisionH;         // anchor at feet

    // Ledge grab / corner correction 계열 보정.
    // - 대시 중: 진행 방향 벽의 top-only/bottom-only 끝자락을 8px 이내로 세로 nudge.
    // - 일반 이동: 살짝 낮은 ledge 에 발끝이 걸리면 8px 이내에서 위로 끌어올려 통과.
    if (moveX !== 0) {
      if (state === 'dash') {
        const dashY = tryDashCornerCorrect(
          this.x + colOffX, this.y + colOffY, this.collisionW, this.collisionH,
          moveX, this.roomData, DASH_CORNER_TOLERANCE,
        );
        if (dashY !== null) this.y = dashY - colOffY;
      } else {
        const snapY = tryLedgeSnap(
          this.x + colOffX, this.y + colOffY, this.collisionW, this.collisionH,
          moveX, this.roomData, LEDGE_TOLERANCE,
        );
        if (snapY !== null) this.y = snapY - colOffY;
      }
    }

    const rx = resolveX(this.x + colOffX, this.y + colOffY, this.collisionW, this.collisionH, moveX, this.roomData);
    this.x = rx.x - colOffX;
    if (rx.collided) this.vx = 0;

    // 상승 중 천장 코너에 살짝 걸리면 8px 이내에서 수평으로 밀어 통과.
    if (moveY < 0) {
      const cornerX = tryCornerCorrectUp(
        this.x + colOffX, this.y + colOffY, this.collisionW, this.collisionH,
        moveY, this.roomData, LEDGE_TOLERANCE,
      );
      if (cornerX !== null) this.x = cornerX - colOffX;
    }

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
        if (!this.wallSliding) {
          // Just started wall slide — reset double jump and air dash
          this.doubleJumpAvailable = true;
          this.airDashAvailable = true;
        }
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

    // Erda atlas 프레임 애니메이션 — grounded 여부로 idle/jump 전환.
    this.updateErdaAnimation(dt);
    // Slash FX — 재생 중일 때만 프레임 갱신, 완료 시 자동 숨김.
    this.updateSlashFX(dt);
  }

  // --- CombatEntity interface ---

  onHit(knockbackX: number, knockbackY: number, hitstun: number): void {
    // Flask cancel on hit: abort cast, do NOT consume charge (mercy rule GDD HEL-01)
    if (this.flaskCasting) {
      this.flaskCasting = false;
      this.flaskCastTimer = 0;
    }
    this.vx = knockbackX;
    this.vy = knockbackY;
    this._hitstunDuration = hitstun;
    // VFX: player took damage this frame
    this._justHitThisFrame = true;
    this._hitKnockDir = knockbackX >= 0 ? 1 : -1;
    this.fsm.transition('hit');
  }

  onDeath(): void {
    this.fsm.transition('death');
  }

  respawn(): void {
    this.isDead = false;
    this.deathTimer = 0;
    this.lastDamageSource = 'unknown';
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
    const targetSpeed = MOVE_SPEED * speedMult;

    // Ice (IntGrid 7): near-zero friction. Acceleration and deceleration are
    // reduced to 10% so the player slides with heavy inertia. Direction changes
    // take much longer, and releasing input barely slows down.
    const onIce = this.grounded && isOnIce(this.x, this.y, this.width, this.height, this.roomData);
    const frictionMul = onIce ? 0.1 : 1.0;
    // 공중에서는 가속/감속을 약간 줄여 도약감·조작감을 무겁게.
    const airMul = this.grounded ? 1.0 : AIR_ACCEL_MULT;
    const accelRate = MOVE_SPEED / (ACCEL_FRAMES / 60) * frictionMul * airMul;

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
      // If already in jump state, this is a buffered double-jump, not a ground re-jump
      if (this.fsm.currentState === 'jump' && this.abilities.doubleJump && this.doubleJumpAvailable) {
        this.jumpBufferTimer = 0;
        this.vy = 0;
        this.vy = JUMP_VELOCITY * 0.85;
        this.doubleJumpAvailable = false;
        this._justDoubleJumped = true;
        return true;
      }
      this.jumpBufferTimer = 0;
      this.coyoteTimer = 0;
      // VFX: ground takeoff event (only fires for grounded jump — coyote counts)
      this._justJumpedGround = true;
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
    this.dashStartedGrounded = this.grounded;
    if (this.grounded) {
      this.groundDashAvailable = false;
      // 쿨타임은 dash 종료 시점에 시작 — FSM dash.exit 에서 통합 처리.
    } else {
      this.airDashAvailable = false;
    }
    this.dashTimer = DASH_DURATION;
    // 대시 선딜 3프레임(50ms) 동결 — stateDash 에서 풀릴 때 방향 확정 후 dashSpeed 커밋.
    this.dashFreezeTimer = DASH_FREEZE_MS;
    // Variable jump 타이머는 대시로 덮어쓰인 점프 상승과 무관 — 즉시 종료.
    this.varJumpTimer = 0;

    const input = this.game.input;
    if (input.isDown(GameAction.MOVE_RIGHT)) this.dashDirX = 1;
    else if (input.isDown(GameAction.MOVE_LEFT)) this.dashDirX = -1;
    else this.dashDirX = this.facingRight ? 1 : -1;

    // 동결 구간 동안은 정지. 방향은 freeze 해제 순간 재샘플.
    this.vx = 0;
    this.vy = 0;

    // VFX: dash start event (consumed by scene for boost puff)
    this._justDashed = true;
    this._dashDir = this.dashDirX;
  }

  private stateDash(dt: number): void {
    // Freeze 구간 — 방향만 실시간 재샘플, 이동은 멈춤.
    if (this.dashFreezeTimer > 0) {
      this.dashFreezeTimer -= dt;
      const input = this.game.input;
      if (input.isDown(GameAction.MOVE_RIGHT)) this.dashDirX = 1;
      else if (input.isDown(GameAction.MOVE_LEFT)) this.dashDirX = -1;
      // 입력 없으면 기존 dashDirX 유지 (startDash 에서 facing 기반 설정).
      this.vx = 0;
      this.vy = 0;
      if (this.dashFreezeTimer <= 0) {
        // Freeze 해제 — 실제 대시 속도 커밋.
        const dashSpeed = DASH_DISTANCE / (DASH_DURATION / 1000);
        this.vx = this.dashDirX * dashSpeed;
        this.vy = 0;
        this._dashDir = this.dashDirX; // VFX 재확정 (방향 변경됐을 수 있음)
      }
      return;
    }

    this.dashTimer -= dt;
    if (this.dashTimer <= 0) {
      this.vx = this.dashDirX * MOVE_SPEED * 0.5;
      // groundDashDelayTimer 는 FSM dash.exit 에서 통합 처리 (중단 경로 커버).
      if (this.grounded) {
        this.fsm.transition(Math.abs(this.vx) > 10 ? 'run' : 'idle');
      } else {
        // 지상 대시가 공중에서 끝났다면 공중 대시도 소진 — ledge-drop 연쇄 방지.
        if (this.dashStartedGrounded) {
          this.airDashAvailable = false;
        }
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

    // Charging vibration — intensifies as charge completes
    const progress = 1 - this.surgeChargeTimer / Player.SURGE_CHARGE_MS;
    this.startVibrate(progress * 3, 2, true);

    // Camera rumble — escalating shake
    this.game.camera.shake(progress * 2);

    // Red tint — flash faster as charge progresses
    const flashSpeed = 200 - progress * 150; // 200ms → 50ms
    const flashOn = Math.sin(Date.now() / flashSpeed) > 0;
    this.sprite.tint = flashOn ? 0xff4444 : 0xffffff;

    if (this.surgeChargeTimer <= 0) {
      this.sprite.tint = 0xffffff;
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

    // Launch impact — camera shake + hitstop + flash
    this.game.camera.shakeDirectional(5, 0, 1); // upward bias
    this.game.hitstopFrames = 3;
    this.triggerFlash();
  }

  private stateSurgeFly(dt: number): void {
    this.surgeFlyTimer -= dt;

    // Maintain upward velocity (constant — resist gravity entirely)
    this.vy = -Player.SURGE_SPEED;

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

    // Swing whoosh — every attack swing (hit 또는 miss 무관).
    // comboIndex 0/1/2 → whoosh_01/02/03 자산 (Sfx.ASSET_BACKED_CUES 배열 인덱스).
    SFX.play('attack_swing', this.comboIndex);

    // Show attack hitbox visual
    this.updateAttackVisual();
    // Slash FX — comboIndex 별 태그/스케일.
    this.triggerSlash(this.comboIndex);
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

  /** True while the dash state is active (scene can spawn afterimage trail). */
  isDashing(): boolean {
    return this.fsm.currentState === 'dash';
  }

  /**
   * Returns the currently visible erda atlas texture (or null if the atlas has
   * not loaded yet). Used by DashAfterimageManager to clone the exact frame for
   * the afterimage trail so the silhouette matches the player's current pose.
   */
  getCurrentErdaTexture(): import('pixi.js').Texture | null {
    if (!this.erdaSprite || this.erdaSprite.visible === false) return null;
    return this.erdaSprite.texture;
  }

  // --- VFX one-shot event consumers ---
  // Each returns the payload if the event fired this frame, else null,
  // and immediately clears the flag so subsequent polls in the same frame
  // return null. Scenes poll these once per frame after player.update().

  /** Returns absolute fall speed (px/s) if the player landed this frame, else null. */
  consumeLandedEvent(): number | null {
    if (!this._justLanded) return null;
    this._justLanded = false;
    return this._landingFallSpeed;
  }

  /** Returns dash direction (-1/+1) if a dash started this frame, else null. */
  consumeDashedEvent(): number | null {
    if (!this._justDashed) return null;
    this._justDashed = false;
    return this._dashDir;
  }

  /** Returns true if a double jump was performed this frame. */
  consumeDoubleJumpEvent(): boolean {
    if (!this._justDoubleJumped) return false;
    this._justDoubleJumped = false;
    return true;
  }

  /**
   * Returns the wall-jump kick direction sign if a wall jump was performed this frame.
   *   -1 → pushed off right wall (moving left)
   *   +1 → pushed off left wall (moving right)
   * Returns null if no wall jump this frame.
   */
  consumeWallJumpEvent(): number | null {
    if (!this._justWallJumped) return null;
    this._justWallJumped = false;
    return this._wallJumpDir;
  }

  /** True if a grounded jump fired this frame. */
  consumeGroundJumpEvent(): boolean {
    if (!this._justJumpedGround) return false;
    this._justJumpedGround = false;
    return true;
  }

  /** True if a drop-through one-way platform move fired this frame. */
  consumeDropThroughEvent(): boolean {
    if (!this._justDroppedThrough) return false;
    this._justDroppedThrough = false;
    return true;
  }

  /**
   * Returns the knockback direction (+1 / -1) if the player took damage this
   * frame, else null.
   */
  consumePlayerHitEvent(): number | null {
    if (!this._justHitThisFrame) return null;
    this._justHitThisFrame = false;
    return this._hitKnockDir;
  }

  /** True while the player is wall-sliding (for continuous dust emission). */
  isWallSliding(): boolean { return this.wallSliding; }
  /** Wall contact side: -1 = wall on left, +1 = wall on right, 0 = none. */
  wallContactDir(): number { return this.touchingWallDir; }

  /** FSM state probes for VFX driving. */
  isSurgeCharging(): boolean { return this.fsm.currentState === 'surge_charge'; }
  isSurgeFlying(): boolean { return this.fsm.currentState === 'surge_fly'; }
  /** 0..1 charge progress for surge VFX amplitude. */
  getSurgeChargeRatio(): number {
    if (this.fsm.currentState !== 'surge_charge') return 0;
    return Math.min(1, this.surgeChargeTimer / Player.SURGE_CHARGE_MS);
  }

  /** Current vx — for footstep puff movement check. */
  getVx(): number { return this.vx; }
  /** Current vy — for dive landing severity / jumpland intensity. */
  getVy(): number { return this.vy; }
  /** Grounded accessor (scene-side VFX polling). */
  isGrounded(): boolean { return this.grounded; }
  /** Ice-tile accessor for skid streak VFX. */
  isStandingOnIce(): boolean {
    return this.grounded && isOnIce(this.x, this.y, this.width, this.height, this.roomData);
  }
  /**
   * One-shot water enter/exit edge event.
   * Returns +1 on the frame water is entered, -1 on the frame water is exited,
   * or null otherwise.
   */
  consumeWaterTransitionEvent(): 1 | -1 | null {
    if (this._waterTransition === 0) return null;
    const v = this._waterTransition;
    this._waterTransition = 0;
    return v;
  }

  /** Oxygen ratio 0~1 (1 = full, 0 = drowned). */
  get oxygenRatio(): number {
    return this.oxygen / Player.OXYGEN_MAX;
  }

  private updateAttackVisual(): void {
    // Debug visual reflects scaled hitbox so equipment feedback is visible.
    const step = this.getAttackStep(this.comboIndex) ?? COMBO_STEPS[this.comboIndex];
    this.attackSprite.clear();
    this.attackSprite.rect(0, 0, step.hitboxW, step.hitboxH)
      .fill({ color: 0xffff00, alpha: 0.3 });

    const offsetY = (this.height - step.hitboxH) / 2;
    if (this.facingRight) {
      this.attackSprite.x = this.width;
    } else {
      this.attackSprite.x = -step.hitboxW;
    }
    this.attackSprite.scale.x = 1;
    this.attackSprite.y = offsetY;
    // 히트박스 디버그 박스는 Debug.visible 이 true 일 때만 표시.
    this.attackSprite.visible = Debug.visible;
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

  /**
   * Erda 스프라이트 비동기 로드.
   * 에셋 부재/네트워크 실패 시 fallback 은 기존 녹색 placeholder 유지.
   */
  private loadErdaSprite(): void {
    const path = assetPath('assets/characters/erda_atlas.png');
    Assets.load(path).then((tex: Texture) => {
      if (this.container.destroyed) return;
      // pixel-perfect — 주변 업스케일 파이프라인(worldRT nearest)과 일치.
      tex.source.scaleMode = 'nearest';

      // 아틀라스 가로 22프레임(32×32) 을 sub-rect 텍스처로 분할.
      // idle 0..3 / jump 4..7 / running 8..15 / dash 16..17 / attack1 18..21. 모두 같은 source 공유.
      this.erdaFrames = [];
      for (let i = 0; i < 22; i++) {
        this.erdaFrames.push(
          new Texture({
            source: tex.source,
            frame: new Rectangle(i * 32, 0, 32, 32),
          }),
        );
      }

      const s = new Sprite(this.erdaFrames[0]);
      // 발 중앙 기준: 히트박스(14×24) 의 하단 중앙에 스프라이트 앵커를 건다.
      // 32×32 스프라이트가 박스보다 가로 18px, 세로 8px 커서 바깥으로 삐져나옴 (의도).
      s.anchor.set(0.5, 1);
      s.x = this.width / 2;
      s.y = this.height;
      // attackSprite / flashOverlay 보다 아래에 놓아 히트박스 디버그 오버레이를 가리지 않도록.
      this.container.addChildAt(s, 0);
      this.erdaSprite = s;
      this.sprite.visible = false; // placeholder off.
    }).catch(() => {
      // 로드 실패 → placeholder 유지.
    });
  }

  /**
   * Slash FX 아틀라스 비동기 로드. 6 프레임(32×32), 단일 source 공유.
   * 재생은 startAttack() 에서 triggerSlash(comboIndex) 로 시작, updateSlashFX() 가 프레임 진행.
   */
  private loadSlashSprite(): void {
    const path = assetPath('assets/sprites/fx_slash.png');
    Assets.load(path).then((tex: Texture) => {
      if (this.container.destroyed) return;
      tex.source.scaleMode = 'nearest';
      this.slashFrames = [];
      for (let i = 0; i < 6; i++) {
        this.slashFrames.push(
          new Texture({ source: tex.source, frame: new Rectangle(i * 32, 0, 32, 32) }),
        );
      }
      const s = new Sprite(this.slashFrames[0]);
      // 앵커: 가로 중앙(0.5) + 세로 중앙(0.5) — 플레이어 높이 중앙에 맞춰 배치.
      s.anchor.set(0.5, 0.5);
      s.visible = false;
      // attackSprite 위(디버그 박스 위)에 오도록 그냥 추가.
      this.container.addChild(s);
      this.slashSprite = s;
    }).catch(() => {
      // 실패 시 FX 만 생략. 전투 자체엔 영향 없음.
    });
  }

  /**
   * Weapon-aware hitbox: scales COMBO_STEPS by attackHitboxMul.
   * All player attack hitbox queries go through this, so equipment
   * actually changes reach. Enemies keep using COMBO_STEPS directly.
   */
  getAttackStep(comboIndex: number): ComboStep | null {
    const base = COMBO_STEPS[comboIndex];
    if (!base) return null;
    return scaleComboStep(base, this.attackHitboxMul);
  }

  /**
   * 콤보 스텝별 slash FX 트리거. 스펙 SSoT:
   *   - 공격 판정:  COMBO_STEPS[step] × attackHitboxMul
   *   - 시각 FX:    resolveComboFx(equippedWeaponType, equippedRarity, step)
   *     ├─ L1 sprite/scale/offset/color: Content_FX_WeaponType.csv
   *     └─ L2 tint:                     Content_Rarity.csv FxTint
   *
   * FxScaleX/Y 는 무기 hitbox 배율과 연동: FX 크기도 공격 범위에 비례.
   */
  private triggerSlash(comboIndex: number): void {
    if (!this.slashSprite || this.slashFrames.length === 0) return;
    const step = this.getAttackStep(comboIndex);
    if (!step) return;
    const s = this.slashSprite;

    // FX: type(L1) + rarity tint(L2).
    const fx = resolveComboFx(this.equippedWeaponType, this.equippedRarity, comboIndex);
    if (!fx) return;
    const range = FX_SLASH_FRAMES[fx.sprite];
    if (!range) return; // 알 수 없는 태그 — FX 생략.
    const [from, to] = range;

    this.slashFromIdx = from;
    this.slashToIdx = to;
    this.slashFrameIdx = from;
    this.slashTimer = 0;
    this.slashHitboxW = step.hitboxW;
    this.slashOffsetX = fx.offsetX;
    this.slashOffsetY = fx.offsetY;

    // FX 시각 크기도 공격 범위에 비례.
    const mul = this.attackHitboxMul;
    s.scale.set(
      this.facingRight ? fx.scaleX * mul : -fx.scaleX * mul,
      fx.scaleY * mul,
    );
    s.tint = fx.color;
    s.texture = this.slashFrames[from];
    s.visible = true;
  }

  /**
   * 매 프레임 slash FX 위치/프레임 갱신. stateAttack 중에만 의미 있음.
   * slashToIdx === -1 이면 비활성.
   */
  private updateSlashFX(dt: number): void {
    if (!this.slashSprite || this.slashToIdx < 0) return;
    const s = this.slashSprite;

    // 중심 = 히트박스 중심 + FxOffsetX(좌향 시 부호 반전). Y = 플레이어 높이 중앙 + FxOffsetY.
    const hw = this.slashHitboxW;
    const hitboxCenterX = this.facingRight ? (this.width + hw / 2) : (-hw / 2);
    s.x = this.facingRight ? (hitboxCenterX + this.slashOffsetX) : (hitboxCenterX - this.slashOffsetX);
    s.y = this.height / 2 + this.slashOffsetY;
    // 방향 유지 (공격 중 facing 이 바뀌진 않지만 보수적 갱신).
    const sx = Math.abs(s.scale.x);
    s.scale.x = this.facingRight ? sx : -sx;

    this.slashTimer += dt;
    while (this.slashTimer >= Player.ANIM_SLASH_FRAME_MS) {
      this.slashTimer -= Player.ANIM_SLASH_FRAME_MS;
      this.slashFrameIdx++;
      if (this.slashFrameIdx > this.slashToIdx) {
        // 재생 완료 → 숨김.
        s.visible = false;
        this.slashToIdx = -1;
        return;
      }
    }
    s.texture = this.slashFrames[this.slashFrameIdx];
  }

  /**
   * 애니메이션 갱신:
   *   grounded 엣지 감지 → takeoff(이륙) / land(착지) 트리거.
   *   각 서브 스테이트가 자체 타이머로 다음 스테이트로 진행.
   *     idle (loop) ─leave─> takeoff ─80ms─> air ─land edge─> land(6,50ms) ─> land(7,50ms) ─> idle
   */
  private updateErdaAnimation(dt: number): void {
    if (!this.erdaSprite || this.erdaFrames.length === 0) return;

    // Dash 우선 — FSM state === 'dash' 진입 엣지에 애니메이션 리셋.
    // dash 중엔 grounded 엣지(takeoff/land) 전이를 건너뛰어 16→17 시퀀스를 보장.
    const fsmState = this.fsm.currentState;
    if (fsmState === 'dash') {
      if (this.erdaAnim !== 'dash') {
        this.erdaAnim = 'dash';
        this.erdaAnimFrame = 0;
        this.erdaAnimTimer = 0;
      }
      this.erdaPrevGrounded = this.grounded;
      this.erdaAnimTimer += dt;
      // 프레임 16 (startup, 30ms) → 17 (linger, 120ms). 잔상은 dash 종료 엣지까지 유지.
      if (this.erdaAnimFrame === 0 && this.erdaAnimTimer >= Player.ANIM_DASH_STARTUP_MS) {
        this.erdaAnimFrame = 1;
        this.erdaAnimTimer = 0;
      }
      this.erdaSprite.texture = this.erdaFrames[16 + this.erdaAnimFrame];
      return;
    }
    if (this.erdaAnim === 'dash') {
      // dash 종료 — 지면/공중에 따라 idle/run/air 로 복귀.
      this.erdaAnim = this.grounded ? (Math.abs(this.vx) > 10 ? 'run' : 'idle') : 'air';
      this.erdaAnimFrame = 0;
      this.erdaAnimTimer = 0;
    }

    // Attack — FSM state === 'attack' 진입 시 attackTimer 진행률로 18..21 스크럽.
    // 매 콤보 스텝의 startAttack() 에서 attackTimer 가 total 로 리셋되므로 각 타격마다 18→21 재생.
    if (fsmState === 'attack') {
      if (this.erdaAnim !== 'attack') {
        this.erdaAnim = 'attack';
        this.erdaAnimFrame = 0;
        this.erdaAnimTimer = 0;
      }
      this.erdaPrevGrounded = this.grounded;
      const step = COMBO_STEPS[this.comboIndex];
      const total = step.totalFrames * FRAME_MS;
      const progress = total > 0 ? Math.max(0, Math.min(0.9999, 1 - this.attackTimer / total)) : 0;
      const idx = Math.min(3, Math.floor(progress * 4));
      this.erdaSprite.texture = this.erdaFrames[18 + idx];
      return;
    }
    if (this.erdaAnim === 'attack') {
      // attack 종료 — 지면/공중에 따라 idle/run/air 로 복귀.
      this.erdaAnim = this.grounded ? (Math.abs(this.vx) > 10 ? 'run' : 'idle') : 'air';
      this.erdaAnimFrame = 0;
      this.erdaAnimTimer = 0;
    }

    // 엣지 감지 — grounded 변화 순간에만 서브 스테이트 전이.
    if (this.erdaPrevGrounded && !this.grounded) {
      // 이륙. vy < 0 = 점프 입력 → takeoff(4) 시퀀스.
      // vy ≥ 0 = 벼랑 낙하 → 서브 스테이트 그대로(idle) 유지, 프레임 얼려 공중에서 idle 포즈 정지.
      this.erdaJumpedOff = this.vy < 0;
      if (this.erdaJumpedOff) {
        this.erdaAnim = 'takeoff';
        this.erdaAnimTimer = 0;
        this.erdaAnimFrame = 0;
      }
    } else if (!this.erdaPrevGrounded && this.grounded) {
      // 착지. 점프였으면 6→7, 낙하였으면 7만 재생.
      this.erdaAnim = 'land';
      this.erdaAnimTimer = 0;
      this.erdaAnimFrame = this.erdaJumpedOff ? 0 : 1;
    }
    this.erdaPrevGrounded = this.grounded;

    // 지상 상태에서 |vx| 로 idle ↔ run 전환. 공중/착지 시퀀스엔 개입하지 않음.
    if (this.grounded && (this.erdaAnim === 'idle' || this.erdaAnim === 'run')) {
      const desired: 'idle' | 'run' = Math.abs(this.vx) > 10 ? 'run' : 'idle';
      if (desired !== this.erdaAnim) {
        this.erdaAnim = desired;
        this.erdaAnimFrame = 0;
        this.erdaAnimTimer = 0;
      }
    }

    this.erdaAnimTimer += dt;
    let textureIdx = 0;

    switch (this.erdaAnim) {
      case 'takeoff': {
        textureIdx = 4;
        if (this.erdaAnimTimer >= Player.ANIM_TAKEOFF_MS) {
          this.erdaAnim = 'air';
          this.erdaAnimTimer = 0;
        }
        break;
      }
      case 'air': {
        textureIdx = 5;
        break;
      }
      case 'land': {
        // 반응성 우선: 좌우 이동이 걸리면 land 를 끊고 run 으로 점프컷.
        // 재점프는 다음 프레임 grounded 엣지가 takeoff 로 자동 전이시킴.
        if (Math.abs(this.vx) > 10) {
          this.erdaAnim = 'run';
          this.erdaAnimFrame = 0;
          this.erdaAnimTimer = 0;
          textureIdx = 8;
          break;
        }
        // sub 0 → 프레임 6, sub 1 → 프레임 7.
        textureIdx = 6 + this.erdaAnimFrame;
        if (this.erdaAnimTimer >= Player.ANIM_LAND_FRAME_MS) {
          this.erdaAnimTimer = 0;
          if (this.erdaAnimFrame === 0) {
            this.erdaAnimFrame = 1;
          } else {
            // 착지 복구 종료 → idle 루프 진입.
            this.erdaAnim = 'idle';
            this.erdaAnimFrame = 0;
          }
        }
        break;
      }
      case 'run': {
        // 지상일 때만 프레임 진행 — 벼랑 낙하 중엔 마지막 run 프레임을 공중에서 유지.
        if (this.grounded) {
          while (this.erdaAnimTimer >= Player.ANIM_RUN_FRAME_MS) {
            this.erdaAnimTimer -= Player.ANIM_RUN_FRAME_MS;
            this.erdaAnimFrame = (this.erdaAnimFrame + 1) % 8;
          }
        }
        textureIdx = 8 + this.erdaAnimFrame; // 8..15
        break;
      }
      case 'idle':
      default: {
        // 지상일 때만 프레임 진행 — 벼랑 낙하 중에는 마지막 idle 프레임을 공중에서 유지.
        if (this.grounded) {
          while (this.erdaAnimTimer >= Player.ANIM_IDLE_FRAME_MS) {
            this.erdaAnimTimer -= Player.ANIM_IDLE_FRAME_MS;
            this.erdaAnimFrame = (this.erdaAnimFrame + 1) % 4;
          }
        }
        textureIdx = this.erdaAnimFrame; // 0..3
        break;
      }
    }

    this.erdaSprite.texture = this.erdaFrames[textureIdx];
  }

  render(alpha: number): void {
    super.render(alpha);

    // 활성 시각(Graphics placeholder 또는 Sprite) 참조 — 깜박임/플립을 동일 대상에 적용.
    const activeVisual = this.erdaSprite ?? this.sprite;

    // Flash when invincible (blink)
    activeVisual.alpha = this.invincible ? (Math.floor(Date.now() / 50) % 2 === 0 ? 0.4 : 1) : 1;

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

    // Flip visual based on facing.
    if (this.erdaSprite) {
      // Sprite 는 anchor(0.5, 1) 기준이므로 scale.x 만 뒤집으면 중심 축 회전.
      this.erdaSprite.scale.x = this.facingRight ? 1 : -1;
    } else {
      // Placeholder Graphics 는 top-left 기준 → x 보정 필요 (기존 로직 유지).
      this.sprite.scale.x = this.facingRight ? 1 : -1;
      this.sprite.x = this.facingRight ? 0 : this.width;
    }

    // Update attack visual position on flip. Debug 토글이 중간에 꺼지면 즉시 숨김.
    this.attackSprite.visible = this.attackActive && Debug.visible;
    if (this.attackSprite.visible) {
      const step = this.getAttackStep(this.comboIndex) ?? COMBO_STEPS[this.comboIndex];
      this.attackSprite.x = this.facingRight ? this.width : -step.hitboxW;
    }
  }
}
