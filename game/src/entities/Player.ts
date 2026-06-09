import { Container, Graphics, Sprite, Assets, Rectangle, Texture } from 'pixi.js';
import { assetPath } from '@core/AssetLoader';
import { Entity } from './Entity';
import { GameAction } from '@core/InputManager';
import { resolveXPixelStep, resolveYPixelStep, resolveXPixelStepWithSlopes2x1, resolveYPixelStepWithSlopes2x1, isInWater, isInOil, isInMagma, isInAcid, isInCyro, isOnIce, isOnOneWay, isSolid, tryCornerCorrectUp, tryLedgeSnap, tryDashCornerCorrect } from '@core/Physics';
import { Debug } from '@core/Debug';
import { StateMachine } from '@utils/StateMachine';
import { COMBO_STEPS, COMBO_WINDOW, COMBO3_END_LAG, type ComboStep } from '@combat/CombatData';
import { resolveComboFx, FX_SLASH_FRAMES } from '@combat/WeaponFx';
import { scaleComboStep, type CombatEntity } from '@combat/HitManager';
import { SWORD_DEFS, type Rarity, type WeaponDef, type WeaponType } from '@data/weapons';
import type { Game } from '../Game';
import { PlayerConst } from '@data/constData';
// 2026-05-24: BARE_HAND_ATK import ?úÍ±∞ ??Îß®ÏÜê ?ÅÌÉú ?êÍ∏∞
import { SFX } from '@audio/Sfx';
import { rumbleGamepad } from '@utils/GamepadRumble';
import { CYRO_FROZEN_SLOW_PCT } from '@systems/TileHazards';
import { destroyDisplayObject } from '@scenes/shared/DisplayObjectLifecycleHelpers';

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
/** Horizontal input multiplier during aerial attacks ??much smaller than the
 *  grounded value so the player can't drift sideways mid-swing. Keeps the
 *  aerial combo visually "anchored" instead of looking like they're sliding. */
const AERIAL_ATTACK_MOVE_MULT = 0.05;
const AERIAL_ATTACK_LUNGE_MULT = 0.35;
const ATTACK_LUNGE_DURATION_MS = 90;

const WALL_SLIDE_SPEED = PlayerConst.WallSlideSpeed;
const WALL_JUMP_VX = PlayerConst.WallJumpVx;
const WALL_JUMP_VY = -Math.sqrt(2 * GRAVITY * 56); // derived: ~70% of normal jump (3.5 tiles)
const WALL_JUMP_COOLDOWN = PlayerConst.WallJumpCooldownMs;
const WALL_CHECK_DIST = PlayerConst.WallCheckDist;
const LEDGE_TOLERANCE = PlayerConst.LedgeTolerance;
const SLOPE_2X1_GROUND_SNAP_PX = 4;
const SLOPE_2X1_DASH_CAPTURE_PX = 8;

const VAR_JUMP_TIME = PlayerConst.VarJumpTimeMs;
const VAR_JUMP_CUT_MULT = PlayerConst.VarJumpCutMult;
const APEX_THRESHOLD = PlayerConst.ApexThreshold;
const APEX_GRAVITY_MULT = PlayerConst.ApexGravityMult;
const AIR_ACCEL_MULT = PlayerConst.AirAccelMult;

/** Oil slip ???åÎ†à?¥Ïñ¥Í∞Ä oil ?Ä?êÏÑú Îπ†Ï†∏?òÏò® ??ÎØ∏ÎÅÑ?¨Ïßê??ÏßÄ?çÎêò???úÍ∞Ñ. */
export const OIL_SLIP_DURATION_MS = 5000;
export const OIL_RESIDUE_DURATION_MS = OIL_SLIP_DURATION_MS;
/** Acid residue ??acid ?Ä ?¥ÌÉà ???îÏ°¥ trail Î∞úÏÉù Í∏∞Í∞Ñ. */
export const ACID_RESIDUE_DURATION_MS = 10000;
/** Magma residue ??magma ?Ä ?¥ÌÉà ???îÏ°¥ trail Î∞úÏÉù Í∏∞Í∞Ñ. */
export const MAGMA_RESIDUE_DURATION_MS = 10000;
/** Water residue ??water ?Ä ?¥ÌÉà ??puddle ?êÍµ≠ ?îÏ°¥ Í∏∞Í∞Ñ (2026-05-18 ?úÍ∞Å only). */
export const WATER_RESIDUE_DURATION_MS = 4000;
/** Cyro residue ??cyro ?Ä ?¥ÌÉà ??ice Í≤∞Ï†ï ?îÏ°¥ Í∏∞Í∞Ñ (2026-05-18 ?úÍ∞Å only). */
export const CYRO_RESIDUE_DURATION_MS = 6000;

/** Ego Shard ??Í∏∞Î≥∏ Î≥¥Ïú† Î∞úÏàò. Hades Bloodstone ?ôÏùº (3Î∞?. */
export const EGO_SHARD_MAX = 3;
/** Time until a fired shard automatically returns to the player (ms). */
export const SHARD_RECOVERY_MS = 8000;
const DASH_FREEZE_MS = PlayerConst.DashFreezeMs;
const DASH_CORNER_TOLERANCE = PlayerConst.DashCornerToleranceY;

// Derived: jump velocity from v¬≤ = 2*g*h => v = sqrt(2*g*h)
const JUMP_VELOCITY = -Math.sqrt(2 * GRAVITY * JUMP_HEIGHT); // negative = upward

const FRAME_MS = 1000 / 60;
/** Global attack speed multiplier across every equipped weapon.
 *  1.0 = baseline, <1 = slower, >1 = faster. Currently 1/1.5 ??0.667 ??1.5x slower. */
const ATTACK_SPEED_MUL = 1 / 1.5;
/** Time-domain inverse of ATTACK_SPEED_MUL ??multiplied into every attack
 *  timer (combo step duration, hitbox active window, slash FX frame ms,
 *  Erda attack frame progress). Larger = slower swings. */
const ATTACK_TIME_SCALE = 1 / ATTACK_SPEED_MUL;

/** Per-combo-step time multiplier. Currently uniform ??rhythm comes from the
 *  pre-3?Ä pause (COMBO_3_PRE_DELAY_MS) instead of slowing the 3?Ä swing itself.
 *  Compounds with weapon atkSpeed and ATTACK_TIME_SCALE inside startAttack. */
const COMBO_STEP_TIME_MUL: ReadonlyArray<number> = [1.0, 1.0, 1.0];

/** Pause inserted between 2?Ä ?ùÍ≥º 3?Ä ?úÏûë ??"?âÏäâ(???? Î∞ïÏûê.
 *  Player stays in attack state (air stall remains active for hover combos),
 *  no hitbox / slash FX during the wait, then 3?Ä swings at normal pace. */
const COMBO_3_PRE_DELAY_MS = 100;

// ?Ä?Ä Air Stall ??aerial attacks suspend the player so a 3-hit combo lands. ?Ä?Ä
// Applied during state==='attack' && !grounded. comboIndex 0/1 (1?Ä/2?Ä) get
// "slow descent"; comboIndex 2 (3?Ä) gets "near-halt" to anchor the finisher.
/** Gravity multiplier during 1?Ä/2?Ä aerial swings ??0 = full halt. */
const AIR_STALL_GRAVITY_MUL_12 = 0;
/** Gravity multiplier during 3?Ä aerial swing ??0 = full halt for the finisher. */
const AIR_STALL_GRAVITY_MUL_3 = 0;
/** Max downward speed cap during 1?Ä/2?Ä aerial swings (px/s) ??0 = no drift. */
const AIR_STALL_MAX_FALL_12 = 0;
/** Max downward speed cap during 3?Ä aerial swing (px/s) ??0 = no drift. */
const AIR_STALL_MAX_FALL_3 = 0;
/** Per-16ms damp on upward velocity during aerial attack ??kills jump residue
 *  so the player "hovers" rather than continuing to rise mid-swing. */
const AIR_STALL_RISE_DAMP_PER_16MS = 0.82;
const WEAPON_ICON_BASE_ROTATION = -45 * Math.PI / 180;
const SLASH_FX_FRAME_W = 96;
const SLASH_FX_FRAME_H = 64;
const SLASH_FX_ERDA_REF_X = 0;
const SLASH_FX_ERDA_REF_Y = 16;
const ERDA_FRAME_W = 32;
const ERDA_FRAME_H = 32;
const ERDA_ATTACK_GROUND_START = 18;
const ERDA_ATTACK2_GROUND_START = 22;
const ERDA_ATTACK_AIR_START = 26;
const ERDA_AIM_START = 30;
const ERDA_AIM_JUMP_FRAME = 34;
const ERDA_LIFT_START = 35;
const ERDA_WAKE_UP_START = 39;
const ERDA_WAKE_UP_FRAME_COUNT = 10;
const ERDA_ATTACK_FRAME_COUNT = 4;
const COMBO3_SLASH_SCALE_X = 1.35;

const ATTACK_WEAPON_POSES = [
  { x: 14, y: 17, rotation: 2.35, scale: 0.85 },
  { x: 15, y: 17, rotation: 2.35, scale: 0.9 },
  { x: 15, y: 16, rotation: 2.35, scale: 0.85 },
  { x: 14, y: 16, rotation: 2.35, scale: 0.8 },
] as const;
type AttackWeaponPose = { x: number; y: number; rotation: number; scale: number };

export type PlayerState = 'idle' | 'run' | 'jump' | 'fall' | 'dash' | 'dive' | 'surge_charge' | 'surge_fly' | 'attack' | 'hit' | 'death';

export class Player extends Entity implements CombatEntity {
  private game: Game;
  /**
   * Placeholder green rect ???êÏÖã Î°úÎî© Ï§??§Ìå® ??fallback.
   * erdaSprite Í∞Ä Î∂ôÏúºÎ©?invisible Ï≤òÎ¶¨.
   */
  private sprite: Graphics;
  /**
   * Erda Ï∫êÎ¶≠???§ÌîÑ?ºÏù¥?? 32√ó32 RGBA (assets/characters/erda_atlas.png).
   * 8?ÑÎ†à??Í∞ÄÎ°??ÑÌ??ºÏä§ ??idle(0??), jump(4??).
   * ?àÌä∏Î∞ïÏä§(14√ó24)Î≥¥Îã§ ?¨Î?Î°?anchor=(0.5, 1) Î°?"Î∞?Ï§ëÏïô" ?ïÎ†¨.
   * Î°úÎî©??ÎπÑÎèôÍ∏∞Ïù¥ÎØÄÎ°?Î°úÎìú ?ÑÏóî null, Î°úÎìú ?ÑÎ£å ??Ïª®ÌÖå?¥ÎÑà??Î∂ÄÏ∞?
   */
  private erdaSprite: Sprite | null = null;
  private weaponSprite: Sprite | null = null;
  private weaponSpriteDefId: string | null = null;
  private attackWeaponPoses: AttackWeaponPose[] = ATTACK_WEAPON_POSES.map(p => ({ ...p }));
  /** ?ÑÌ??ºÏä§?êÏÑú ?òÎùº??8Í∞??ÑÎ†à???çÏä§Ï≤?(idle 0??, jump 4??). */
  private erdaFrames: Texture[] = [];
  private wakeUpOverrideTimer = 0;
  private wakeUpOverrideDuration = 0;
  private wakeUpHoldPose = false;
  private playerInputSuppressed = false;
  /**
   * ?†ÎãàÎ©îÏù¥???úÎ∏å ?§ÌÖå?¥Ìä∏:
   *   - idle   : ?ÑÎ†à??0..3 Î£®ÌîÑ (400ms/frame)
   *   - run    : ?ÑÎ†à??8..15 Î£®ÌîÑ (100ms/frame)
   *   - takeoff: ?ÑÎ†à??4, ÏßßÏ? ?¥Î•ô squash (160ms)
   *   - air    : ?ÑÎ†à??5, Í≥µÏ§ë ÏßÄ??
   *   - land   : ?ÑÎ†à??6 ??7, ÏßßÏ? Ï∞©Ï? Î≥µÍµ¨ (Í∞?150ms)
   *   - dash   : ?ÑÎ†à??16 ??17 (startup 30ms + linger 120ms)
   *   - attack : ?ÑÎ†à??18..21, ÏßÑÌñâÎ•?Í∏∞Î∞ò ?§ÌÅ¨??(step.totalFrames*FRAME_MS ??ÎßûÏ∂∞ 4?ÑÎ†à??Î∂ÑÌï†)
   * idle/run switches on grounded locomotion intent or actual velocity.
   * Í≥µÏ§ë ÏßÑÏûÖ/Ï∞©Ï???grounded ?£Ï?Î°??∏Î¶¨Í±?
   * dash / attack ?Ä FSM state Í∞êÏ?Î°?ÏßÑÏûÖ/?¥ÌÉà.
   */
  private erdaAnim: 'idle' | 'run' | 'takeoff' | 'air' | 'land' | 'dash' | 'attack' | 'aim' | 'lift' = 'idle';
  /**
   * Charging Cast ??set by scene each frame while V (CAST) is held. Drives
   * the dedicated "aim" Erda animation override. Cleared on release.
   */
  isAiming = false;
  /**
   * Holding a ThrowableContainer ??set by scene each frame while the
   * player carries something. Drives the "lift" animation + halves move
   * speed (heavy carry).
   */
  isLifting = false;
  /** idle/run/land ???úÎ∏å ?ÑÎ†à???∏Îç±??(0 Í∏∞Ï?). takeoff/air ???¨Ïö© ???? */
  private erdaAnimFrame = 0;
  /** ?ÑÎ†à???ÑÏ†Å ?Ä?¥Î®∏ (ms). */
  private erdaAnimTimer = 0;
  /** ?¥Ï†Ñ ?ÑÎ†à?ÑÏùò grounded. ?¥Î•ô/Ï∞©Ï? ?£Ï? Í∞êÏ??? */
  private erdaPrevGrounded = true;
  /**
   * Í≥µÏ§ë ÏßÑÏûÖ???êÌîÑ(jump ?ÖÎ†•)?∏Ï? ?®Ïàú ?ôÌïò(ledge walk-off)?∏Ï?.
   * ?ôÌïò ??air(5) / land Ï¥àÎ∞ò(6) ?ÑÎ†à?ÑÏùÑ ?§ÌÇµ??Í∞ÑÍ≤∞???ôÌïò-Ï∞©Ï?Îß??¨ÏÉù.
   */
  private erdaJumpedOff = false;
  private static readonly ANIM_IDLE_FRAME_MS = 400;  // ?êÎ≥∏ 100ms √ó 4 ?êÎ¶¨Í≤?
  private static readonly ANIM_RUN_FRAME_MS = 67;     // running ???êÎ≥∏ 100ms ??1.5√ó ?çÎèÑ
  private static readonly ANIM_TAKEOFF_MS = 160;      // ?ÑÎ†à??4 ??ÏßßÏ? ?¥Î•ô squash (2Î∞??úÎãù)
  private static readonly ANIM_LAND_FRAME_MS = 150;   // ?ÑÎ†à??6, 7 Í∞ÅÍ∞Å ???çÎèÑ 2/3 Î°?Í∞êÏÜç (100??50ms)
  private static readonly ANIM_DASH_STARTUP_MS = 30;  // ?ÑÎ†à??16 ???†Ïπ¥Î°úÏö¥ ?úÎèô (ÏßßÍ≤å)
  private static readonly ANIM_DASH_LINGER_MS = 120;  // ?ÑÎ†à??17 ???îÏÉÅ ?¨Ïö¥ (Í∏∏Í≤å). ?©Í≥Ñ 150ms = DASH_DURATION
  /** Slash FX ??atlas ?ÑÎ†à??ms. FX ?§Ìéô(sprite/scale/offset/color) ?Ä CSV(COMBO_STEPS) SSoT. */
  private static readonly ANIM_SLASH_FRAME_MS = 40;
  private slashFrames: Texture[] = [];
  private slashSprite: Sprite | null = null;
  private slashTimer = 0;          // ?¨Îûò???†ÎãàÎ©îÏù¥???Ä?¥Î®∏ (ms)
  private slashFrameIdx = 0;       // ?ÑÏû¨ ?¨ÏÉù Ï§ëÏù∏ atlas ?ÑÎ†à???∏Îç±??
  private slashFromIdx = 0;        // ?¨ÏÉù Íµ¨Í∞Ñ ?úÏûë
  private slashToIdx = -1;         // ?¨ÏÉù Íµ¨Í∞Ñ ??(ÎπÑÌôú????-1)
  private slashHitboxW = 0;        // ?¥Î≤à ?¨Îûò?úÍ? Ï∞∏Ï°∞?òÎäî ?àÌä∏Î∞ïÏä§ Í∞ÄÎ°????ÑÏπò Í≥ÑÏÇ∞??
  private slashOffsetX = 0;        // CSV FxOffsetX Ï∫êÏãú (Í≥µÍ≤© Ï§?comboIndex Í∞Ä Î∞îÎÄåÏñ¥???ÑÏû¨ FX ?†Ï?)
  private slashOffsetY = 0;        // CSV FxOffsetY Ï∫êÏãú
  private attackSprite: Graphics;
  fsm: StateMachine<PlayerState>;

  // Stats
  hp = PlayerConst.BaseHp;
  maxHp = PlayerConst.BaseHp;
  // 2026-05-24: Îß®ÏÜê ?ÅÌÉú ?úÍ±∞. BARE_HAND_ATK Í∞Ä???êÍ∏∞. Î¨¥Í∏∞ ÎØ∏Ïû•Ï∞???ATK 0.
  // updatePlayerAtk() Í∞Ä Îß??ÑÎ†à??atk Î•??¨Í≥Ñ?∞ÌïòÎØÄÎ°?Ï¥àÍ∏∞Í∞íÏ? placeholder.
  atk = 0;
  def = PlayerConst.BaseDef;
  facingRight = true;

  // ============================================================
  // Tile hazard status (TileHazards.ts duck-typed fields)
  // magma ?ëÏ¥â ??Burn 3s ¬∑ charged Ï≤¥Î•ò ??0.5s tick ¬∑ acid Ï≤¥Î•ò ???∞ÏÜç DOT
  // GDD: Documents/System/System_World_TileSystem.md ¬ß2.6-2.13
  // ============================================================
  /** Burn ?ÅÌÉú ?îÏó¨ ms (0 = ?ïÏÉÅ). magma/fire ?ëÏ¥â ???§Ï†ï¬∑Í∞±Ïã†. */
  burnRemainingMs = 0;
  /** Burn 1Ï¥?tick ?ÑÏ†Å??(HazardTarget ?∏Ìôò). */
  burnTickAccum = 0;
  /** Charged 0.5Ï¥?tick ?ÑÏ†Å??(?ÑÎìú ÏßÑÏûÖ Ï§ëÏóêÎß?Ï¶ùÍ?). */
  chargedTickAccum = 0;
  /** Acid 0.1Ï¥?tick ?ÑÏ†Å??(?ÑÎìú ÏßÑÏûÖ Ï§ëÏóêÎß?Ï¶ùÍ?). */
  acidTickAccum = 0;
  chargedStateMs = 0;
  cyroTickAccum = 0;
  cyroSlowRemainingMs = 0;
  /** ?¥Ï†Ñ ?ÑÎ†à??electric ?§Î≤Ñ?àÏù¥ ?àÏù¥?àÎäîÏßÄ (thunder per-pulse ?∞Î?ÏßÄ ?∏Îûò??. */
  prevInElectric = false;
  /**
   * Oil slip debuff ?îÏó¨ ms. oil ?Ä?êÏÑú Îπ†Ï†∏?òÏò§Î©?OIL_SLIP_DURATION_MS Î°?
   * refresh. > 0 ???ôÏïà ice ?Ä ?ôÏùº??ÎØ∏ÎÅÑ?¨Ïßê (frictionMul = 0.1).
   * Scene ??hazard tick ?êÏÑú Îß??ÑÎ†à??Í∞êÏÜå.
   */
  oilSlipRemainingMs = 0;
  /**
   * Oil footprint trail timer. Separate from slip so touching an old oil blot
   * can refresh slipperiness without recursively spawning more oil blots.
   */
  oilResidueRemainingMs = 0;
  /** ?¥Ï†Ñ ?ÑÎ†à??oil ?Ä ?àÏóê ?àÏóà?îÏ? ??ÏßÑÏûÖ¬∑?¥ÌÉà ?ÑÌôò Í∞êÏ????¨Ïö©. */
  prevInOil = false;
  /** Acid residue trail ?îÏó¨ ?úÍ∞Ñ ??Î∞úÏù¥ acid ???ñÏñ¥?àÏñ¥ ?îÏ°¥ ?îÏ†Å spawn. */
  acidResidueRemainingMs = 0;
  prevInAcid = false;
  /** Magma residue trail ?îÏó¨ ?úÍ∞Ñ ??Î∞úÏù¥ magma ??Í∑∏ÏùÑ???îÏ°¥ ?îÏ†Å spawn. */
  magmaResidueRemainingMs = 0;
  prevInMagma = false;
  /** Water residue trail ?îÏó¨ ?úÍ∞Ñ ??Î∞??ñÏùå puddle ?îÏ†Å (2026-05-18). */
  waterResidueRemainingMs = 0;
  /** Cyro residue trail ?îÏó¨ ?úÍ∞Ñ ??Î∞úÏûêÍµ?óê ice Í≤∞Ï†ï ?îÏ°¥ (2026-05-18). */
  cyroResidueRemainingMs = 0;
  prevInCyro = false;

  /** Water extinguishes every player-side fire debuff / burn accumulator. */
  extinguishFireDebuffs(): void {
    this.burnRemainingMs = 0;
    this.burnTickAccum = 0;
    this.magmaResidueRemainingMs = 0;
  }

  getEchoWalkFrames(): Texture[] {
    return this.erdaFrames.length >= 16 ? this.erdaFrames.slice(8, 16) : [];
  }

  holdWakeUpPose(): void {
    this.wakeUpHoldPose = true;
    this.wakeUpOverrideTimer = 0;
    this.erdaAnim = 'idle';
    this.erdaAnimFrame = 0;
    this.erdaAnimTimer = 0;
    this.applyWakeUpFrame(0);
  }

  playWakeUpOverride(durationMs = 900): void {
    this.wakeUpHoldPose = false;
    this.wakeUpOverrideDuration = Math.max(1, durationMs);
    this.wakeUpOverrideTimer = this.wakeUpOverrideDuration;
    this.erdaAnim = 'idle';
    this.erdaAnimFrame = 0;
    this.erdaAnimTimer = 0;
  }
  tickWakeUpOverrideAnimation(dt: number): void {
    this.savePrevPosition();
    this.vx = 0;
    this.vy = 0;
    this.updateErdaAnimation(dt);
    this.vx = 0;
    this.vy = 0;
  }
  updateWithSuppressedInput(dt: number): void {
    const previous = this.playerInputSuppressed;
    this.playerInputSuppressed = true;
    try {
      this.update(dt);
    } finally {
      this.playerInputSuppressed = previous;
    }
  }

  private isPlayerInputDown(action: GameAction): boolean {
    return !this.playerInputSuppressed && this.game.input.isDown(action);
  }

  private isPlayerInputJustPressed(action: GameAction): boolean {
    return !this.playerInputSuppressed && this.game.input.isJustPressed(action);
  }

  private isPlayerInputJustReleased(action: GameAction): boolean {
    return !this.playerInputSuppressed && this.game.input.isJustReleased(action);
  }

  // ============================================================
  // Ego Shard ??Hades-style cast ammo
  // ============================================================
  /** Currently available shards (consumed by Cast, refilled by retrieval or cooldown). */
  egoShardCount = EGO_SHARD_MAX;
  /** Currently selected enchant ??drives Shard impact effect + Attack tint. */
  activeEnchant: 'fire' | 'ice' | 'thunder' = 'fire';
  /** Brief anti-spam gap between casts (ms). Recovery handled by cooldown queue below. */
  egoCastCooldownMs = 0;
  /**
   * One entry per fired-but-not-yet-recovered shard. Each value is the
   * remaining ms until automatic retrieval. Persists across room changes
   * (lives on the Player object) so the player can't spam by leaving a
   * room. Manual retrieval (walking over a stuck shard) consumes one
   * entry from this queue, granting the shard back immediately.
   */
  shardCooldowns: number[] = [];

  // ============================================================
  // Carry (Grab/Throw)
  // ============================================================
  /** Currently held pickable (Spelunky-style). Null = empty-handed. */
  heldItem: { kind: string; gfx?: unknown } | null = null;

  /**
   * DEBUG: when true, hp is clamped to ?? each frame and isDead/drowned are
   * cleared. Used for hazard testing ??take damage but never die. Scene
   * handler toggles it as part of the unified Shift+O cheat bundle.
   * URL-gated via ?debug.
   */
  debugLockHpAtOne = false;

  /**
   * DEBUG: when true, the unified Shift+O cheat bundle is currently active
   * (all relic abilities granted, maxHp/atk inflated, hp locked at ??1).
   * Toggling Shift+O again restores the pre-cheat values from cheatBackup.
   */
  debugCheatActive = false;
  private cheatBackup: {
    maxHp: number;
    atk: number;
    abilities: Player['abilities'];
    debugLockHpAtOne: boolean;
  } | null = null;

  /**
   * Currently equipped weapon type ??set by the scene whenever inventory
   * equip state changes. `null` = bare hand (falls back to Combo.csv FX).
   * Consumed by triggerSlash() to pick per-type FX from Content_FX_WeaponType.
   */
  equippedWeaponType: WeaponType | null = null;
  equippedWeaponId: string | null = null;

  /**
   * One-shot pulse: ATTACK was pressed in a state that *would* attack, but
   * no weapon is equipped (and cheat off). Scene reads + clears this each
   * frame to surface a "No Weapon Equipped" toast with cooldown.
   */
  attackBlockedNoWeaponPulse = false;
  attackInputEnabled = true;

  /**
   * Currently equipped weapon rarity ??used for rarity-tinted slash FX.
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
  /** True when oxygen has run out ??scene triggers death. */
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
    dash: false,          // ?êÎ¶≠ ?çÎìù ?ÑÍπåÏßÄ ÎπÑÌôú??(?òÏ§ë???çÎìù)
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
  private surgeDirX = 0; // 0 = straight up, ¬±1 = diagonal off wall
  /** True during surge flight ??scene can check for contact damage. */
  surgeActive = false;

  // Dive attack
  private diveStartY = 0;
  /** True on the frame dive attack lands ??scene checks this for effects. */
  diveLanded = false;
  /** Fall distance of the last dive landing (px). */
  diveFallDistance = 0;

  // Last safe ground position (for spike hazard respawn)
  lastSafeX = 0;
  lastSafeY = 0;
  /** True Î©??ÑÏû¨ grounded ?ÅÌÉúÍ∞Ä carrier(GiantBuilder ???¥Îèô ?úÎ©¥) ?ÑÏóê ???àÏùå??
   *  ?òÎ??úÎã§. ??Í≤ΩÏö∞ lastSafeX/Y Î•?Í∞±Ïã†?òÏ? ?äÏïÑ spike teleport ??
   *  carrier Í∞Ä ?†ÎÇòÎ≤ÑÎ¶∞ ?ÑÏπòÎ°?Î≥µÍ??òÏ? ?äÍ≤å ?úÎã§. Scene ??Îß??ÑÎ†à??
   *  playerOnBuilder Í≤∞Í≥ºÎ°?Í∞±Ïã†?úÎã§. */
  onCarrier = false;
  /** Vertical velocity inherited from the moving carrier underfoot. The scene
   * sets this before update; grounded jumps add it to their takeoff velocity. */
  carrierVelocityY = 0;

  // Double jump
  private doubleJumpAvailable = false;

  // Wall slide / wall jump
  private touchingWallDir = 0;      // -1 left wall, +1 right wall, 0 none
  private wallSliding = false;
  private wallJumpCooldown = 0;     // ms remaining

  // Physics
  private grounded = false;
  /** Debug (Shift+I): ?¥Î≤à ?ÑÎ†à???ëÏ? ÏßÄÏßÄ ?åÏä§. 'grid'|'slope'|'none' ?êÎäî
   *  ?¨Ïù¥ forceGrounded Î°??òÍ∏¥ ?ºÎ≤®('container'|'builder'|'locked-door'|'void-fade' ??. */
  groundSource = 'none';
  /** Debug: groundSource==='grid' ????Î∞úÎ∞ë ?Ä Ï¢åÌëú=?Ä?ºid Î™©Î°ù. */
  groundSourceDetail = '';
  /** ??forceGrounded Í∞Ä ?òÍ∏¥ ?ºÎ≤® (extraGroundedSticky Í∞Ä true ????groundSource Î°??∏Ï∂ú). */
  private extraGroundedLabel = 'scene';
  private moveRemainderX = 0;
  private moveRemainderY = 0;

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
  /** Set on the frame a grounded (or coyote) jump fired ??for takeoff puff. */
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
  /** true Î©??¥Î≤à ?Ä?úÍ? ÏßÄ?ÅÏóê???úÏûë?êÏùå. dash Ï¢ÖÎ£å ??Ïø®Ì????åÏßÑ ?êÏ†ï Í∏∞Ï?. */
  private dashStartedGrounded = false;
  /** ?Ä???†Îîú ?ôÍ≤∞ ?Ä?¥Î®∏ (ms). >0 ?¥Î©¥ vx/vy=0, Î∞©Ìñ•Îß??òÌîåÎß? */
  private dashFreezeTimer = 0;

  // Variable jump height
  /** ?êÌîÑ ??JUMP ?ºÎ©¥ ?ÅÏäπ?çÎèÑÎ•??àÎ∞ò Ïª??????àÎäî ?†Ìö® ?úÍ∞Ñ (ms). */
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
  comboIndex = 0;          // 0=1?Ä, 1=2?Ä, 2=3?Ä
  attackTimer = 0;          // current attack frame timer (ms)
  comboWindowTimer = 0;     // time left to input next combo (ms)
  endLagTimer = 0;          // 3?Ä end lag (ms)
  attackQueued = false;     // next attack input buffered
  hitList = new Set<CombatEntity>();
  private attackActive = false;
  private attackHasActivated = false;
  private attackLungeRemainingPx = 0;
  private attackLungeSpeedPxPerMs = 0;
  private attackLungeDir: 1 | -1 = 1;
  /** Captured at startAttack ??ATTACK_TIME_SCALE divided by the equipped
   *  weapon's CSV atkSpeed. Locks the swing's pace so a mid-swing weapon
   *  swap doesn't visually rubber-band. CSV atkSpeed > 1 = faster, < 1 = slower. */
  private currentAttackTimeScale = ATTACK_TIME_SCALE;
  /** ms remaining in the 2???Ä pause. >0 holds the player in 'attack' state
   *  with no active hitbox / no timer tick until it elapses. */
  private preAttackDelay = 0;

  // Room data reference for collision
  roomData: number[][] = [];

  bindCollisionGrid(collisionGrid: number[][]): void {
    this.roomData = collisionGrid;
  }
  fluidOverlayQuery: ((x: number, y: number, width: number, height: number) => number | null) | null = null;

  constructor(game: Game) {
    super();
    this.game = game;
    this.width = 14;
    this.height = 24;

    // Collision width: 70% (tighter feel in tile-based levels).
    // Collision height: 1.5 cell (24px @ TILE_SIZE=16) ???¨Ïö©??Í≤∞Ï†ï (2026-05-03):
    //   Í∏∞Ï°¥ 1 cell (16px) ?Ä 1?Ä ?íÏù¥ ?àÏùÑ player Í∞Ä ?µÍ≥º Í∞Ä??(= Î©îÌä∏Î°úÎ≤†?àÏïÑ
    //   ?•Î†• Í≤åÏù¥?∏Î°ú ÎßâÏïÑ????Ï¢ÅÏ? ?µÎ°úÍ∞Ä Î¨¥Î†•??. 1.5 cell Î°??§Ïõå Ï∞®Îã®.
    this.collisionW = Math.floor(this.width * 0.7);   // 9px
    this.collisionH = 24;                             // 1.5 cell ??1?Ä ???µÍ≥º Î∞©Ï?

    // Placeholder sprite ??erdaSprite Î°úÎî© ?ÑÍπåÏßÄÎß?Î≥¥ÏûÑ.
    this.sprite = new Graphics();
    this.sprite.rect(0, 0, this.width, this.height).fill(0x2ecc71);
    this.container.addChild(this.sprite);

    // Attack hitbox visual (hidden by default)
    this.attackSprite = new Graphics();
    this.attackSprite.visible = false;
    this.container.addChild(this.attackSprite);

    // ÎπÑÎèôÍ∏?Î°úÎìú: ?ÑÎ£å ??Graphics Î•??®Í∏∞Í≥?Sprite Î°?ÍµêÏ≤¥.
    this.loadErdaSprite();
    this.loadAttackWeaponPoseData();
    this.loadWeaponSprite();
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
        this.grounded = false;
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
        // ÏßÄ???Ä?úÎäî Ï¢ÖÎ£å Í≤ΩÎ°ú?Ä Î¨¥Í??òÍ≤å Ïø®Ì??ÑÏù¥ ?úÏûë?òÏñ¥???úÎã§.
        // ?ïÏÉÅ Ï¢ÖÎ£å(stateDash ??dashTimer<=0) + Ï§ëÎã®(onHit/onDeath ??FSM ?ÑÏù¥)
        // ?ëÏ™Ω Î™®Îëê ?¨Í∏∞??Ïª§Î≤Ñ. stateDash ?êÏÑú set ?òÎ©¥ Ï§ëÎã® Í≤ΩÎ°úÎ•??ìÏ≥ê
        // ?ºÍ≤© ÏßÅÌõÑ Ï¶âÏãú ?¨Î???Í∞Ä?•Ìïú Î≤ÑÍ∑∏ Î∞úÏÉù (Codex review P2).
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
    // DEBUG: Shift+O HP lock ??clamp hp ??1 and clear death markers each frame.
    // Lets the player walk through hazards taking continuous damage without dying.
    // Big hits (thunder 50%, spike 20%) trigger onDeath() before this clamp,
    // landing the FSM in 'death' state ??we have to eject out of it explicitly
    // or the player ends up alive (hp=1) but frozen in death animation.
    if (this.debugLockHpAtOne) {
      if (this.hp < 1) this.hp = 1;
      this.isDead = false;
      this.drowned = false;
      this.oxygen = Player.OXYGEN_MAX;
      if (this.fsm.currentState === 'death') {
        this.deathTimer = 0;
        this.sprite.alpha = 1;
        this.fsm.transition('fall');
      }
    }

    this.savePrevPosition();
    this.diveLanded = false; // reset each frame ??scene reads this flag
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
      // VFX: landing event ??fall speed = whichever is larger (current vy or the
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
    // Carrier(GiantBuilder) ??grounding ?Ä safe ground Î°?Í∏∞Î°ù?òÏ? ?äÎäî??
    // ÎπåÎçîÍ∞Ä ?¥Îèô/?åÏã§????spike teleport Í∞Ä Îπ?Í≥µÍ∞Ñ??Í∞ÄÎ¶¨ÌÇ§Î©?????
    // ?êÌïú Ï¢ÅÏ? ??Ï¢åÏö∞ Î≤??ïÏ∞© ?êÎäî Î®∏Î¶¨ ??ÎßâÌûò) ?àÏóê ?àÏúºÎ©?Í∏∞Î°ù?òÏ? ?äÎäî??
    if (this.grounded && this.hp > 0 && !this.onCarrier) {
      const T = 16;
      const cOffX = (this.width - this.collisionW) / 2;
      const cOffY = this.height - this.collisionH;
      const leftCol  = Math.floor((this.x + cOffX - 1) / T);
      const rightCol = Math.floor((this.x + cOffX + this.collisionW) / T);
      const headRow  = Math.floor((this.y + cOffY - 1) / T);
      const bodyRow  = Math.floor((this.y + cOffY + this.collisionH / 2) / T);
      const midCol   = Math.floor((this.x + this.width / 2) / T);
      const squeezedH = isSolid(this.roomData[bodyRow]?.[leftCol] ?? 0) &&
                        isSolid(this.roomData[bodyRow]?.[rightCol] ?? 0);
      const squeezedV = isSolid(this.roomData[headRow]?.[midCol] ?? 0);
      if (!squeezedH && !squeezedV) {
        this.lastSafeX = this.x;
        this.lastSafeY = this.y;
      }
    }
    // Recharge ground dash after delay
    if (this.grounded && this.groundDashDelayTimer <= 0) {
      this.groundDashAvailable = true;
    }

    this.wasGrounded = this.grounded;

    // Jump buffer: register press
    if (this.isPlayerInputJustPressed(GameAction.JUMP)) {
      // Down + Jump = drop through one-way platform (no jump)
      if (this.isPlayerInputDown(GameAction.LOOK_DOWN) && this.isOnOneWayPlatform()) {
        this.dropThroughTimer = Player.DROP_THROUGH_MS;
        this.y += 2;
        this.grounded = false;
        this.coyoteTimer = 0;       // prevent coyote jump after drop
        this.jumpBufferTimer = 0;   // consume the input ??don't also jump
        this._justDroppedThrough = true; // VFX: drop-through dust
        return;                     // skip all other jump/attack processing this frame
      }
      // 2026-05-17: drop-through ?∞Ì? ??"Ï∞©Ï? ÏßÅÌõÑ ?êÎèô ?êÌîÑ" Î∞©Ï?.
      //  - DOWN ???åÎ¶∞ ?ÅÌÉú??JUMP ??buffer ?òÏ? ?äÎäî??(?òÎèÑ=?úÎûç, not jump).
      //  - drop-through ÏßÅÌõÑ short window (dropThroughTimer ?úÏÑ± Ï§? ??JUMP ??Î¨¥Ïãú.
      // ?????ÅÏö©??(a) DOWN ?†Ï? mash ?Ä (b) DOWN ?ºÍ≥† JUMP ?∞Ì? Î™®Îëê Ï∞®Îã®.
      if (this.isPlayerInputDown(GameAction.LOOK_DOWN) || this.dropThroughTimer > 0) {
        return;
      }
      // Wall Jump: touching wall + jump ??kick off opposite direction
      else if (!this.isLifting && this.wallSliding && this.touchingWallDir !== 0) {
        const kickDir = -this.touchingWallDir; // +1 = kicked to right, -1 = kicked to left
        this.startWallJumpMotion(kickDir);
        // VFX: wall-jump kick event
        this._justWallJumped = true;
        this._wallJumpDir = kickDir;
      }
      // Double Jump: in air + no coyote + ability unlocked + not used yet
      // Reset vy to 0 first so the jump height is consistent regardless of
      // whether the player is rising or falling when they press jump.
      else if (!this.isLifting && !this.grounded && this.coyoteTimer <= 0 && this.abilities.doubleJump && this.doubleJumpAvailable) {
        this.startDoubleJumpMotion();
        // VFX: double-jump event
        this._justDoubleJumped = true;
      } else {
        this.jumpBufferTimer = JUMP_BUFFER;
      }
    }

    // Tick drop-through timer
    if (this.dropThroughTimer > 0) this.dropThroughTimer -= dt;

    const state = this.fsm.currentState;

    // Surge input ????+ C on ground or wall
    if (!this.isLifting && this.abilities.surge && this.isPlayerInputJustPressed(GameAction.DASH) &&
        this.isPlayerInputDown(GameAction.LOOK_UP) &&
        (this.grounded || this.wallSliding) &&
        state !== 'surge_charge' && state !== 'surge_fly' && state !== 'hit' && state !== 'death') {
      this.fsm.transition('surge_charge');
      return;
    }

    // Dash input (requires dash ability, available from most states, cancels 3?Ä end lag)
    if (!this.isLifting && this.abilities.dash && this.isPlayerInputJustPressed(GameAction.DASH) &&
        state !== 'dash' && state !== 'surge_charge' && state !== 'surge_fly' && state !== 'hit' && state !== 'death') {
      const canDash = this.grounded ? this.groundDashAvailable : this.airDashAvailable;
      if (canDash && (state !== 'attack' || this.canCancelAttackToDash())) {
        this.endLagTimer = 0;
        if (state === 'attack') this.endAttack();
        this.fsm.transition('dash');
        return;
      }
    }

    // Dive attack input ??air + ??+ C
    if (!this.isLifting && this.abilities.diveAttack && !this.grounded &&
        this.attackInputEnabled && this.isPlayerInputDown(GameAction.LOOK_DOWN) &&
        this.isPlayerInputJustPressed(GameAction.ATTACK) &&
        state !== 'dive' && state !== 'dash' && state !== 'hit' && state !== 'death') {
      this.fsm.transition('dive');
      return;
    }

    // Attack input
    // Dash (ground or air) can be cancelled into attack ??chaining
    // dash ??attack tightens the combat rhythm and matches what muscle
    // memory expects from action games.
    // No weapon equipped ??attack disabled entirely, except when cheat is on
    // (cheat already grants +99999 ATK so C should always swing for testing).
    // Suppress the swing when an interaction prompt is up (or a dialogue is
    // open) ??the same key press is claimed by the interaction. Not consumed
    // here, so the interaction runtime (which runs later) still receives it.
    const attackPressedThisFrame = this.isPlayerInputJustPressed(GameAction.ATTACK)
      && this.attackInputEnabled
      && !this.game.input.interactionPromptActive;
    const attackStateAllowed =
      !this.isLifting && state !== 'dive' && state !== 'hit' && state !== 'death';
    if (attackPressedThisFrame && attackStateAllowed &&
        this.equippedWeaponType === null && !this.abilities.cheat) {
      // Bare-hand swing attempt ??surface toast via scene, no state change.
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

    // Combo window expired ??reset combo
    if (state !== 'attack' && this.comboWindowTimer <= 0 && this.endLagTimer <= 0) {
      this.comboIndex = 0;
    }

    // End lag finished ??return to normal state
    if (state !== 'attack' && state !== 'hit' && state !== 'death' && state !== 'dash' && state !== 'dive' && this.endLagTimer > 0) {
      // Still in end lag, don't transition
    }

    // Echo Flask casting (GDD HEL-01)
    if (this.flaskCasting) {
      this.flaskCastTimer -= dt;
      this.vx = 0; // movement locked during cast
      // Trembling during cast ??continuous small vibration
      if (this.vibrateFrames <= 0) {
        this.startVibrate(1.5, 4, true);
      }
      if (this.flaskCastTimer <= 0) {
        // Cast complete ??heal + consume + white flash
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
      if (this.isPlayerInputJustPressed(GameAction.FLASK)) {
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

    // Run FSM (skip if flask casting ??player is locked)
    if (!this.flaskCasting) {
      this.fsm.update(dt);
    }

    // Water detection
    const overlayTile = this.fluidOverlayQuery?.(this.x, this.y, this.width, this.height) ?? null;
    this.inWater = isInWater(this.x, this.y, this.width, this.height, this.roomData) || overlayTile === 2;
    // Edge-detect water enter/exit for splash VFX
    if (this.inWater && !this.prevInWater) this._waterTransition = 1;
    else if (!this.inWater && this.prevInWater) this._waterTransition = -1;
    this.prevInWater = this.inWater;
    // 2026-05-17: Î∂Ä??/ ?†Ï≤¥ ?Ä??ùÑ Î™®Îì† fluid (water/oil/magma/acid/cyro) ??
    // ?ºÍ? ?ÅÏö©. `waterMult` Í∞Ä gravity + ?òÌèâ ?¥Îèô + max fall ???ôÏãú???êÌïë?úÎã§.
    // Î≥Ä?òÎ™Ö?Ä legacy "water" ?†Ï? (Ï∞∏Ï°∞ Î∂Ä????. Î≥ÑÎèÑ inAnyFluid ?åÎûòÍ∑∏Î°ú split.
    const inAnyFluid = this.inWater
      || isInOil(this.x, this.y, this.width, this.height, this.roomData) || overlayTile === 11
      || isInMagma(this.x, this.y, this.width, this.height, this.roomData) || overlayTile === 6
      || isInAcid(this.x, this.y, this.width, this.height, this.roomData) || overlayTile === 13
      || isInCyro(this.x, this.y, this.width, this.height, this.roomData) || overlayTile === 20;
    const waterMult = inAnyFluid ? PlayerConst.WaterMoveMult : 1.0; // slow everything in fluid

    // Submersion check ??head (top of sprite) is in water OR oil = 2+
    // tiles deep. Oil submersion drains oxygen the same way water does so
    // the dive gauge mechanic generalizes across drowning fluids.
    const headRow = Math.floor(this.y / 16);
    const midCol = Math.floor((this.x + this.width / 2) / 16);
    const headTile = this.roomData[headRow]?.[midCol] ?? 0;
    const headOverlayTile = this.fluidOverlayQuery?.(this.x + this.width / 2 - 1, this.y, 2, 2) ?? null;
    const headInWater = headTile === 2 || headOverlayTile === 2;
    const headInOil = headTile === 11 || headOverlayTile === 11;
    const inOil = isInOil(this.x, this.y, this.width, this.height, this.roomData) || overlayTile === 11;
    this.submerged = (this.inWater && headInWater) || (inOil && headInOil);

    // Oxygen timer ??drains while submerged in water or oil. Water breathing
    // ability bypasses both (treats every drowning fluid the same).
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

    // Apply gravity (except during dash/dive/surge) ??reduced in water.
    // ?ïÏ†ê Í∑ºÏ≤ò(|vy| < APEX_THRESHOLD)?êÏÑú Ï§ëÎ†• ?àÎ∞ò ??Ï≤¥Í≥µÍ∞??ÅÏäπ.
    // Aerial attack ??"Air Stall": gravity dramatically reduced + max fall
    // capped so 1/2/3?Ä ÏΩ§Î≥¥ ?ÑÏ≤¥Î•?Í≥µÏ§ë?êÏÑú ?¥Ïñ¥ ÎßûÏ∂ú ???àÎã§. 3?Ä??
    // Í±∞Ïùò Î©àÏ∂∞??ÎßàÎ¨¥Î¶?Í∞ïÌ?Î•??àÏ†ï?ÅÏúºÎ°?ÍΩÇÍ≤å ?úÎã§.
    if (state !== 'dash' && state !== 'dive' && state !== 'surge_fly' && state !== 'surge_charge') {
      const apexMult = Math.abs(this.vy) < APEX_THRESHOLD ? APEX_GRAVITY_MULT : 1.0;
      const aerialAttack = state === 'attack' && !this.grounded;
      const stallMult = aerialAttack
        ? (this.comboIndex === 2 ? AIR_STALL_GRAVITY_MUL_3 : AIR_STALL_GRAVITY_MUL_12)
        : 1.0;

      this.vy += GRAVITY * waterMult * apexMult * stallMult * dtSec;

      // Damp residual upward velocity from a jump ??"hover" feel during stall.
      if (aerialAttack && this.vy < 0) {
        this.vy *= Math.pow(AIR_STALL_RISE_DAMP_PER_16MS, dt / 16.67);
      }

      // inAnyFluid Î©?fluid drag Î°?max fall ???ôÏùº Ï∫?(2026-05-17 ??Î∂Ä???µÏùº).
      const baseMaxFall = inAnyFluid ? MAX_FALL_SPEED * PlayerConst.WaterMaxFallMult : MAX_FALL_SPEED;
      const maxFall = aerialAttack
        ? (this.comboIndex === 2 ? AIR_STALL_MAX_FALL_3 : AIR_STALL_MAX_FALL_12)
        : baseMaxFall;
      if (this.vy > maxFall) this.vy = maxFall;
    }

    // Variable jump height ??JUMP Î≤ÑÌäº???Ä?¥Î®∏ ?¥Ïóê ?ºÎ©¥ ?ÅÏäπ?çÎèÑ ?àÎ∞ò Ïª?
    // tap = short hop, hold = full height. dash/surge Ï§ëÏóî ÎπÑÌôú??(varJumpTimer=0 ?†Ï?).
    if (this.varJumpTimer > 0) {
      this.varJumpTimer -= dt;
      if (this.vy < 0 && this.isPlayerInputJustReleased(GameAction.JUMP)) {
        this.vy *= VAR_JUMP_CUT_MULT;
        this.varJumpTimer = 0;
      } else if (this.vy >= 0) {
        // ?¥Î? ?ôÌïò Ï§ëÏù¥Î©??Ä?¥Î®∏ ?òÎ? ?ÜÏùå.
        this.varJumpTimer = 0;
      }
    }

    // Slow horizontal movement in water
    const moveX = this.consumePixelMoveX(this.vx * waterMult * dtSec);
    const moveY = this.consumePixelMoveY(this.vy * dtSec);
    const colOffX = (this.width - this.collisionW) / 2;   // center horizontally
    const colOffY = this.height - this.collisionH;         // anchor at feet

    // 2x1 virtual slopes are player-only overlays inferred from the IntGrid.
    // Non-slope ledges still fall back to the older snap/corner correction.
    const physX = this.x + colOffX;
    const physY = this.y + colOffY;
    const slopeEligible =
      state !== 'dive' && state !== 'surge_fly' && state !== 'surge_charge' &&
      (state === 'dash' || this.grounded || this.vy >= 0);
    const slopeSnapPx = state === 'dash' ? SLOPE_2X1_DASH_CAPTURE_PX : SLOPE_2X1_GROUND_SNAP_PX;

    let rx = slopeEligible
      ? resolveXPixelStepWithSlopes2x1(
        physX, physY, this.collisionW, this.collisionH,
        moveX, this.roomData, slopeSnapPx,
      )
      : {
        ...resolveXPixelStep(physX, physY, this.collisionW, this.collisionH, moveX, this.roomData),
        y: physY,
        onSlope: false,
      };

    // Keep the old snap/corner helpers as fallback for non-2x1 geometry.
    if (rx.collided && !rx.onSlope && moveX !== 0) {
      let correctedY: number | null = null;
      if (state === 'dash') {
        correctedY = tryDashCornerCorrect(
          physX, physY, this.collisionW, this.collisionH,
          moveX, this.roomData, DASH_CORNER_TOLERANCE,
        );
      } else {
        correctedY = tryLedgeSnap(
          physX, physY, this.collisionW, this.collisionH,
          moveX, this.roomData, LEDGE_TOLERANCE,
        );
      }
      if (correctedY !== null) {
        rx = {
          ...resolveXPixelStep(physX, correctedY, this.collisionW, this.collisionH, moveX, this.roomData),
          y: correctedY,
          onSlope: false,
        };
      }
    }

    this.x = rx.x - colOffX;
    this.y = rx.y - colOffY;
    if (rx.collided) this.vx = 0;

    // ?ÅÏäπ Ï§?Ï≤úÏû• ÏΩîÎÑà???¥Ïßù Í±∏Î¶¨Î©?8px ?¥ÎÇ¥?êÏÑú ?òÌèâ?ºÎ°ú Î∞Ä???µÍ≥º.
    if (moveY < 0) {
      const cornerX = tryCornerCorrectUp(
        this.x + colOffX, this.y + colOffY, this.collisionW, this.collisionH,
        moveY, this.roomData, LEDGE_TOLERANCE,
      );
      if (cornerX !== null) this.x = cornerX - colOffX;
    }

    const ry = slopeEligible
      ? resolveYPixelStepWithSlopes2x1(
        this.x + colOffX, this.y + colOffY, this.collisionW, this.collisionH,
        moveY, this.roomData, this.dropThroughTimer > 0, slopeSnapPx,
      )
      : {
        ...resolveYPixelStep(
          this.x + colOffX, this.y + colOffY, this.collisionW, this.collisionH,
          moveY, this.roomData, this.dropThroughTimer > 0,
        ),
        onSlope: false,
      };
    this.y = ry.y - colOffY;
    // Grid grounded OR scene-supplied "standing on container" flag. The
    // sticky flag is set each frame by the scene's container-collision
    // resolve; we read it here so animation + jump checks behave as if
    // the player is on solid ground.
    this.grounded = ry.grounded || rx.onSlope || this.extraGroundedSticky;
    // Debug (Shift+I): Î∞úÎ∞ë???†Î∞õÏπòÎäî Ï∂©Îèå ?åÏä§???ïÏ≤¥Î•?Í∏∞Î°ù. ?∞ÏÑ†?úÏúÑ??
    // grounded ?âÍ? ?úÏÑú(grid > slope > scene flag)?Ä ?ôÏùº.
    if (ry.grounded) {
      this.groundSource = 'grid';
      this.groundSourceDetail = this.sampleFloorTiles(colOffX, colOffY);
    } else if (rx.onSlope || ry.onSlope) {
      this.groundSource = 'slope';
      this.groundSourceDetail = '';
    } else if (this.extraGroundedSticky) {
      this.groundSource = this.extraGroundedLabel;
      this.groundSourceDetail = '';
    } else {
      this.groundSource = 'none';
      this.groundSourceDetail = '';
    }
    if (ry.collided || rx.onSlope || ry.onSlope) {
      if (this.vy > 0) this.vy = 0;
      if (this.vy < 0) this.vy = 0;
    }

    // Wall detection (for wall slide/jump) ??check tiles adjacent to player sides
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

      if (leftSolid && this.isPlayerInputDown(GameAction.MOVE_LEFT)) {
        this.touchingWallDir = -1;
      } else if (rightSolid && this.isPlayerInputDown(GameAction.MOVE_RIGHT)) {
        this.touchingWallDir = 1;
      }

      // Wall slide: slow descent when touching wall and falling
      if (this.touchingWallDir !== 0 && this.vy > 0) {
        this.vy = WALL_SLIDE_SPEED;
        if (!this.wallSliding) {
          // Just started wall slide ??reset double jump and air dash
          this.doubleJumpAvailable = true;
          this.airDashAvailable = true;
        }
        this.wallSliding = true;
      }
    }

    // State transitions based on grounded
    if (state === 'jump' || state === 'fall') {
      if (this.grounded) {
        this.fsm.transition(this.getGroundMovementState());
      } else if (state === 'jump' && this.vy > 0) {
        this.fsm.transition('fall');
      }
    }

    if (this.externalFacingLockMs > 0) {
      this.externalFacingLockMs = Math.max(0, this.externalFacingLockMs - dt);
    }

    // Facing direction: player intent takes priority. Velocity fallback is
    // allowed only when no external force recently drove movement; knockback
    // must not flip the character after hitstun ends with residual vx.
    if (state !== 'attack' && state !== 'hit') {
      if (this.isPlayerInputDown(GameAction.MOVE_RIGHT)) this.facingRight = true;
      else if (this.isPlayerInputDown(GameAction.MOVE_LEFT)) this.facingRight = false;
      else if (this.externalFacingLockMs <= 0 && this.vx > 10) this.facingRight = true;
      else if (this.externalFacingLockMs <= 0 && this.vx < -10) this.facingRight = false;
    }

    // Update camera facing
    this.game.camera.facingDirection = this.facingRight ? 1 : -1;

    // Erda atlas ?ÑÎ†à???†ÎãàÎ©îÏù¥????grounded ?¨Î?Î°?idle/jump ?ÑÌôò.
    this.updateErdaAnimation(dt);
    // Slash FX ???¨ÏÉù Ï§ëÏùº ?åÎßå ?ÑÎ†à??Í∞±Ïã†, ?ÑÎ£å ???êÎèô ?®Í?.
    this.updateSlashFX(dt);
    // Consume the scene-supplied "standing on container" flag. The scene
    // re-sets it AFTER player.update each frame; reads here next frame.
    this.extraGroundedSticky = false;
  }

  // --- CombatEntity interface ---

  onHit(knockbackX: number, knockbackY: number, hitstun: number): void {
    const wasFacingRight = this.facingRight;
    // Flask cancel on hit: abort cast, do NOT consume charge (mercy rule GDD HEL-01)
    if (this.flaskCasting) {
      this.flaskCasting = false;
      this.flaskCastTimer = 0;
    }
    this.vx = knockbackX;
    this.vy = knockbackY;
    this._hitstunDuration = hitstun;
    this.externalFacingLockMs = Math.max(this.externalFacingLockMs, hitstun + 250);
    // VFX: player took damage this frame
    this._justHitThisFrame = true;
    this._hitKnockDir = wasFacingRight ? 1 : -1;
    this.fsm.transition('hit');
    this.facingRight = wasFacingRight;
  }

  onDeath(): void {
    this.fsm.transition('death');
  }

  respawn(): void {
    this.isDead = false;
    this.deathTimer = 0;
    this.lastDamageSource = 'unknown';
    this.cyroTickAccum = 0;
    this.cyroSlowRemainingMs = 0;
    this.chargedStateMs = 0;
    this.hp = this.maxHp;
    this.invincible = true;
    this.invincibleTimer = 1000;
    this.sprite.alpha = 1;
    this.vx = 0;
    this.vy = 0;
    this.fsm.transition('fall');
  }

  // --- Ground states ---

  private getHorizontalInputDirection(): number {
    let inputX = 0;
    if (this.isPlayerInputDown(GameAction.MOVE_LEFT)) inputX -= 1;
    if (this.isPlayerInputDown(GameAction.MOVE_RIGHT)) inputX += 1;
    return inputX;
  }

  private isGroundLocomotionActive(): boolean {
    // Collision can zero vx while the player is still pressing into a wall.
    // Keep locomotion visuals/state active from intent as well as actual speed.
    return this.grounded && (this.getHorizontalInputDirection() !== 0 || Math.abs(this.vx) > 10);
  }

  private getGroundMovementState(): 'idle' | 'run' {
    return this.isGroundLocomotionActive() ? 'run' : 'idle';
  }

  private getGroundOrAirAnimationState(): 'idle' | 'run' | 'air' {
    return this.grounded ? this.getGroundMovementState() : 'air';
  }

  private applyHorizontalInput(dt: number, speedMult = 1): void {
    const dtSec = dt / 1000;
    const targetSpeed = MOVE_SPEED * speedMult * this.getCyroMoveMultiplier();

    // Ice (IntGrid 7): near-zero friction. Acceleration and deceleration are
    // reduced to 10% so the player slides with heavy inertia. Direction changes
    // take much longer, and releasing input barely slows down.
    //
    // Oil slip debuff: after touching oil, the player's feet stay slick for
    // OIL_SLIP_DURATION_MS. While `oilSlipRemainingMs > 0`, friction drops the
    // same as on ice ??even on dry ground. The debuff expires naturally on
    // the timer; touching oil again refreshes it to full duration.
    const onIce = this.grounded && isOnIce(this.x, this.y, this.width, this.height, this.roomData);
    const oilSlipping = this.grounded && this.oilSlipRemainingMs > 0;
    const frictionMul = (onIce || oilSlipping) ? 0.1 : 1.0;
    // Í≥µÏ§ë?êÏÑú??Í∞Ä??Í∞êÏÜç???ΩÍ∞Ñ Ï§ÑÏó¨ ?ÑÏïΩÍ∞ê¬∑Ï°∞?ëÍ∞ê??Î¨¥Í≤ÅÍ≤?
    const airMul = this.grounded ? 1.0 : AIR_ACCEL_MULT;
    const accelRate = MOVE_SPEED / (ACCEL_FRAMES / 60) * frictionMul * airMul;

    const inputX = this.getHorizontalInputDirection();

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

  private getCyroMoveMultiplier(): number {
    return this.cyroSlowRemainingMs > 0 ? 1 - CYRO_FROZEN_SLOW_PCT : 1;
  }

  private consumePixelMoveX(amount: number): number {
    this.moveRemainderX += amount;
    const move = Math.round(this.moveRemainderX);
    if (move !== 0) this.moveRemainderX -= move;
    return move;
  }

  private consumePixelMoveY(amount: number): number {
    this.moveRemainderY += amount;
    const move = Math.round(this.moveRemainderY);
    if (move !== 0) this.moveRemainderY -= move;
    return move;
  }

  private startJumpMotion(vy: number): void {
    this.vy = vy;
    this.grounded = false;
    this.extraGroundedSticky = false;
    this.varJumpTimer = VAR_JUMP_TIME;
    this.fsm.transition('jump');
  }

  private startGroundJumpMotion(): void {
    // Riding solids carry the player separately; only inherit upward carrier
    // motion so a descending platform cannot steal jump height.
    this.startJumpMotion(JUMP_VELOCITY + Math.min(0, this.carrierVelocityY));
  }

  private startDoubleJumpMotion(): void {
    this.vy = 0;
    this.doubleJumpAvailable = false;
    this.startJumpMotion(JUMP_VELOCITY * 0.85);
  }

  private startWallJumpMotion(kickDir: number): void {
    this.vx = kickDir * WALL_JUMP_VX;
    this.facingRight = kickDir > 0;
    this.wallJumpCooldown = WALL_JUMP_COOLDOWN;
    this.wallSliding = false;
    this.touchingWallDir = 0;
    this.startJumpMotion(WALL_JUMP_VY);
  }

  private tryJump(): boolean {
    const canJump = this.grounded || this.coyoteTimer > 0;
    const wantsJump = this.jumpBufferTimer > 0;

    if (canJump && wantsJump) {
      // If already in jump state, this is a buffered double-jump, not a ground re-jump
      if (!this.isLifting && this.fsm.currentState === 'jump' && this.abilities.doubleJump && this.doubleJumpAvailable) {
        this.jumpBufferTimer = 0;
        this.startDoubleJumpMotion();
        this._justDoubleJumped = true;
        // ?îÎ∏î ?êÌîÑ ??speed ?ΩÍ∞Ñ Îπ†Î•¥Í≤?(?ºÏπò ?? Î°?Ï∞®Î≥Ñ??
        SFX.play('jump', 0, { speed: 1.1 });
        return true;
      }
      this.jumpBufferTimer = 0;
      this.coyoteTimer = 0;
      // VFX: ground takeoff event (only fires for grounded jump ??coyote counts)
      this._justJumpedGround = true;
      // ÏßÄÎ©??êÌîÑ ??speed 0.95~1.05 Î¨¥Ïûë??(?®Ï°∞Î°úÏ? Í∞êÏÜå).
      SFX.play('jump', 0, { speed: 0.95 + Math.random() * 0.1 });
      this.startGroundJumpMotion();
      return true;
    }
    return false;
  }

  private stateIdle(dt: number): void {
    this.applyHorizontalInput(dt, (this.isAiming || this.isLifting) ? 0.5 : 1);
    if (this.tryJump()) return;
    if (!this.grounded) { this.fsm.transition('fall'); return; }
    if (this.isGroundLocomotionActive()) this.fsm.transition('run');
  }

  private stateRun(dt: number): void {
    this.applyHorizontalInput(dt, (this.isAiming || this.isLifting) ? 0.5 : 1);
    if (this.tryJump()) return;
    if (!this.grounded) { this.fsm.transition('fall'); return; }
    if (!this.isGroundLocomotionActive()) this.fsm.transition('idle');
  }

  private stateAir(dt: number): void {
    this.applyHorizontalInput(dt, (this.isAiming || this.isLifting) ? 0.5 : 1);
    this.tryJump();
  }

  // --- Dash ---

  private startDash(): void {
    this.dashStartedGrounded = this.grounded;
    if (this.grounded) {
      this.groundDashAvailable = false;
      // Ïø®Ì??ÑÏ? dash Ï¢ÖÎ£å ?úÏ†ê???úÏûë ??FSM dash.exit ?êÏÑú ?µÌï© Ï≤òÎ¶¨.
    } else {
      this.airDashAvailable = false;
    }
    // ?Ä??sound ??speed 0.95~1.05 Î¨¥Ïûë??(Î∞òÎ≥µÍ∞???.
    SFX.play('dash', 0, { speed: 0.95 + Math.random() * 0.1 });
    rumbleGamepad(45, 0.15, 0.35);
    this.dashTimer = DASH_DURATION;
    // ?Ä???†Îîú 3?ÑÎ†à??50ms) ?ôÍ≤∞ ??stateDash ?êÏÑú ?ÄÎ¶???Î∞©Ìñ• ?ïÏ†ï ??dashSpeed Ïª§Î∞ã.
    this.dashFreezeTimer = DASH_FREEZE_MS;
    // Variable jump ?Ä?¥Î®∏???Ä?úÎ°ú ??ñ¥?∞Ïù∏ ?êÌîÑ ?ÅÏäπÍ≥?Î¨¥Í? ??Ï¶âÏãú Ï¢ÖÎ£å.
    this.varJumpTimer = 0;

    if (this.isPlayerInputDown(GameAction.MOVE_RIGHT)) this.dashDirX = 1;
    else if (this.isPlayerInputDown(GameAction.MOVE_LEFT)) this.dashDirX = -1;
    else this.dashDirX = this.facingRight ? 1 : -1;

    // ?ôÍ≤∞ Íµ¨Í∞Ñ ?ôÏïà?Ä ?ïÏ?. Î∞©Ìñ•?Ä freeze ?¥Ï†ú ?úÍ∞Ñ ?¨ÏÉò??
    this.vx = 0;
    this.vy = 0;

    // VFX: dash start event (consumed by scene for boost puff)
    this._justDashed = true;
    this._dashDir = this.dashDirX;
  }

  private stateDash(dt: number): void {
    // Freeze Íµ¨Í∞Ñ ??Î∞©Ìñ•Îß??§ÏãúÍ∞??¨ÏÉò?? ?¥Îèô?Ä Î©àÏ∂§.
    if (this.dashFreezeTimer > 0) {
      this.dashFreezeTimer -= dt;
        if (this.isPlayerInputDown(GameAction.MOVE_RIGHT)) this.dashDirX = 1;
      else if (this.isPlayerInputDown(GameAction.MOVE_LEFT)) this.dashDirX = -1;
      // ?ÖÎ†• ?ÜÏúºÎ©?Í∏∞Ï°¥ dashDirX ?†Ï? (startDash ?êÏÑú facing Í∏∞Î∞ò ?§Ï†ï).
      this.vx = 0;
      this.vy = 0;
      if (this.dashFreezeTimer <= 0) {
        // Freeze ?¥Ï†ú ???§Ï†ú ?Ä???çÎèÑ Ïª§Î∞ã.
        const dashSpeed = (DASH_DISTANCE / (DASH_DURATION / 1000)) * this.getCyroMoveMultiplier();
        this.vx = this.dashDirX * dashSpeed;
        this.vy = 0;
        this._dashDir = this.dashDirX; // VFX ?¨Ìôï??(Î∞©Ìñ• Î≥ÄÍ≤ΩÎêê?????àÏùå)
      }
      return;
    }

    this.dashTimer -= dt;
    if (this.dashTimer <= 0) {
      this.vx = this.dashDirX * MOVE_SPEED * 0.5 * this.getCyroMoveMultiplier();
      // groundDashDelayTimer ??FSM dash.exit ?êÏÑú ?µÌï© Ï≤òÎ¶¨ (Ï§ëÎã® Í≤ΩÎ°ú Ïª§Î≤Ñ).
      if (this.grounded) {
        this.fsm.transition(this.getGroundMovementState());
      } else {
        // ÏßÄ???Ä?úÍ? Í≥µÏ§ë?êÏÑú ?ùÎÇ¨?§Î©¥ Í≥µÏ§ë ?Ä?úÎèÑ ?åÏßÑ ??ledge-drop ?∞ÏáÑ Î∞©Ï?.
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

    // Determine launch direction ??wall bounce or straight up
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

    // Charging vibration ??intensifies as charge completes
    const progress = 1 - this.surgeChargeTimer / Player.SURGE_CHARGE_MS;
    this.startVibrate(progress * 3, 2, true);

    // Camera rumble ??escalating shake
    this.game.camera.shake(progress * 2);

    // Red tint ??flash faster as charge progresses
    const flashSpeed = 200 - progress * 150; // 200ms ??50ms
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

    // Launch impact ??camera shake + hitstop + flash
    this.game.camera.shakeDirectional(5, 0, 1); // upward bias
    this.game.hitstopFrames = 3;
    this.triggerFlash();
  }

  private stateSurgeFly(dt: number): void {
    this.surgeFlyTimer -= dt;

    // Maintain upward velocity (constant ??resist gravity entirely)
    this.vy = -Player.SURGE_SPEED;

    if (this.surgeFlyTimer <= 0) {
      this.surgeActive = false;
      this.attackActive = false;
      this.fsm.transition('fall');
    }

    // Hit ceiling ??end early
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
    // Capture per-swing time scale = global slow-down √ó (1 / weapon atkSpeed)
    // √ó per-combo-step multiplier ("?âÏäâ-??: 3?Ä drawn out).
    const def = this.getEquippedWeaponDef();
    const wSpeed = def.atkSpeed > 0 ? def.atkSpeed : 1.0;
    const stepMul = COMBO_STEP_TIME_MUL[this.comboIndex] ?? 1.0;
    this.currentAttackTimeScale = (ATTACK_TIME_SCALE / wSpeed) * stepMul;
    this.attackTimer = step.totalFrames * FRAME_MS * this.currentAttackTimeScale;
    this.attackActive = false;
    this.attackHasActivated = false;
    this.attackLungeRemainingPx = 0;
    this.attackLungeSpeedPxPerMs = 0;
    this.attackQueued = false;
    const lungePx = Math.max(0, step.lungePx) * (this.grounded ? 1 : AERIAL_ATTACK_LUNGE_MULT);
    this.attackLungeRemainingPx = lungePx;
    this.attackLungeSpeedPxPerMs = lungePx / ATTACK_LUNGE_DURATION_MS;
    this.attackLungeDir = this.facingRight ? 1 : -1;
    this.hitList.clear();
    this.comboWindowTimer = 0;

    // Swing whoosh ??every attack swing (hit ?êÎäî miss Î¨¥Í?).
    // comboIndex 0/1/2 ??whoosh_01/02/03 ?êÏÇ∞ (Sfx.ASSET_BACKED_CUES Î∞∞Ïó¥ ?∏Îç±??.
    SFX.play('attack_swing', this.comboIndex);

    // Show attack hitbox visual
    this.attackSprite.visible = false;
    if (this.slashSprite) this.slashSprite.visible = false;
    this.slashToIdx = -1;
    // Slash FX ??comboIndex Î≥??úÍ∑∏/?§Ï???
  }

  private stateAttack(dt: number): void {
    this.vx = 0;

    // Gravity already applied in update() before state dispatch ??no double gravity

    // 2???Ä pause ??hold the player in 'attack' state (air stall stays active
    // because comboIndex is already 2) without ticking attack/hitbox logic.
    // When the countdown elapses, fire startAttack() to begin 3?Ä.
    if (this.preAttackDelay > 0) {
      this.preAttackDelay -= dt;
      if (this.preAttackDelay <= 0) {
        this.preAttackDelay = 0;
        this.startAttack();
      }
      return;
    }

    this.attackTimer -= dt;

    const step = COMBO_STEPS[this.comboIndex];
    const totalMs = step.totalFrames * FRAME_MS * this.currentAttackTimeScale;
    const activeMs = step.activeFrames * FRAME_MS * this.currentAttackTimeScale;
    const activeStartMs = totalMs / 4;
    const elapsedMs = totalMs - this.attackTimer;
    if (elapsedMs < activeStartMs) {
      this.applyAttackLunge(dt);
    }

    if (!this.attackHasActivated && elapsedMs >= activeStartMs) {
      this.attackHasActivated = true;
      this.attackActive = true;
      this.updateAttackVisual();
      this.triggerSlash(this.comboIndex);
    }

    // Deactivate hitbox after active frames
    if (this.attackHasActivated && elapsedMs >= activeStartMs + activeMs) {
      this.attackActive = false;
      this.attackSprite.visible = false;
    }

    // Attack animation finished
    if (this.attackTimer <= 0) {
      this.attackActive = false;
      this.attackHasActivated = false;

      if (this.attackQueued && this.comboIndex < 2) {
        // Next combo step
        this.comboIndex++;
        this.attackQueued = false;
        if (this.comboIndex === 2) {
          // 2?Ä ??3?Ä: insert "?âÏäâ(???? pause. stateAttack will fire
          // startAttack() once the delay countdown reaches 0.
          this.preAttackDelay = COMBO_3_PRE_DELAY_MS;
        } else {
          this.startAttack();
        }
        return;
      }

      // Attack done ??set combo window or end lag
      if (this.comboIndex >= 2) {
        // 3?Ä finished ??end lag
        this.endLagTimer = COMBO3_END_LAG;
        this.comboIndex = 0;
      } else {
        // 1?Ä or 2?Ä ??combo window
        this.comboIndex++;
        this.comboWindowTimer = COMBO_WINDOW;
      }

      // Return to movement state
      if (this.grounded) {
        this.fsm.transition(this.getGroundMovementState());
      } else {
        this.fsm.transition('fall');
      }
    }
  }

  private endAttack(): void {
    this.attackActive = false;
    this.attackHasActivated = false;
    this.attackLungeRemainingPx = 0;
    this.attackLungeSpeedPxPerMs = 0;
    this.attackSprite.visible = false;
    if (this.slashSprite) this.slashSprite.visible = false;
    this.slashToIdx = -1;
    // Clear any pending 2?? pause so an interrupted swing doesn't carry it over.
    this.preAttackDelay = 0;
  }

  forceMovementControlReady(): void {
    if (this.fsm.currentState === 'death' || this.fsm.currentState === 'hit') return;
    this.attackActive = false;
    this.attackHasActivated = false;
    this.attackLungeRemainingPx = 0;
    this.attackLungeSpeedPxPerMs = 0;
    this.attackQueued = false;
    this.attackTimer = 0;
    this.comboWindowTimer = 0;
    this.endLagTimer = 0;
    this.preAttackDelay = 0;
    this.attackSprite.visible = false;
    if (this.slashSprite) this.slashSprite.visible = false;
    this.slashToIdx = -1;
    this.fsm.transition(this.grounded ? this.getGroundMovementState() : 'fall');
  }

  /** Whether the attack hitbox is currently active (for HitManager to check) */
  isAttackActive(): boolean {
    return this.attackActive;
  }

  private applyAttackLunge(dt: number): void {
    if (this.attackLungeRemainingPx <= 0 || dt <= 0) {
      this.vx = 0;
      return;
    }
    const movePx = Math.min(this.attackLungeRemainingPx, this.attackLungeSpeedPxPerMs * dt);
    this.attackLungeRemainingPx -= movePx;
    this.vx = this.attackLungeDir * (movePx / (dt / 1000));
  }

  private canCancelAttackToDash(): boolean {
    if (this.preAttackDelay > 0) return false;
    const step = COMBO_STEPS[this.comboIndex];
    if (!step) return false;
    const totalMs = step.totalFrames * FRAME_MS * this.currentAttackTimeScale;
    const activeMs = step.activeFrames * FRAME_MS * this.currentAttackTimeScale;
    const activeStartMs = totalMs / 4;
    const elapsedMs = totalMs - this.attackTimer;
    const activeEndMs = activeStartMs + activeMs;
    if (elapsedMs < activeEndMs) return false;
    if (this.comboIndex < 2) return true;
    return elapsedMs >= activeEndMs + Math.max(0, totalMs - activeEndMs) * 0.5;
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
  getWeaponTexture(): Texture | null {
    if (!this.weaponSprite || this.weaponSprite.destroyed) return null;
    return this.weaponSprite.texture;
  }

  getCurrentErdaTexture(): import('pixi.js').Texture | null {
    if (!this.erdaSprite || this.erdaSprite.visible === false) return null;
    return this.erdaSprite.texture;
  }

  /**
   * Returns a static Container that mirrors the player's current visual state ??
   * same sprite textures, transforms, and positions.  Caller positions the
   * container in world space (set x/y to player.container.x / .y).
   * Returned container shares textures (no deep clone) but owns its Sprites.
   */
  getFreezeSnapshot(): Container {
    const root = new Container();

    if (this.weaponSprite && !this.weaponSprite.destroyed && this.weaponSprite.visible) {
      const w = new Sprite(this.weaponSprite.texture);
      w.anchor.copyFrom(this.weaponSprite.anchor);
      w.pivot.copyFrom(this.weaponSprite.pivot);
      w.x        = this.weaponSprite.x;
      w.y        = this.weaponSprite.y;
      w.scale.copyFrom(this.weaponSprite.scale);
      w.rotation = this.weaponSprite.rotation;
      root.addChild(w);
    }

    if (this.erdaSprite && !this.erdaSprite.destroyed) {
      const e = new Sprite(this.erdaSprite.texture);
      e.anchor.copyFrom(this.erdaSprite.anchor);
      e.x = this.erdaSprite.x;
      e.y = this.erdaSprite.y;
      e.scale.copyFrom(this.erdaSprite.scale);
      root.addChild(e);
    }

    return root;
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
   *   -1 ??pushed off right wall (moving left)
   *   +1 ??pushed off left wall (moving right)
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

  /**
   * Debug: Î∞úÎ∞ë(feetRow) ?Ä?§ÏùÑ Í∑∏Î¶¨?úÏóê???òÌîå??"col,row=tileId" Î™©Î°ù?ºÎ°ú Î∞òÌôò.
   * groundSource==='grid' ?????¥Îñ§ ?Ä?ºÏù¥ ?†Î∞õÏπòÎäîÏßÄ ?ùÎ≥Ñ??
   */
  private sampleFloorTiles(colOffX: number, colOffY: number): string {
    const T = 16;
    const feetRow = Math.floor((this.y + colOffY + this.collisionH) / T);
    const leftCol = Math.floor((this.x + colOffX) / T);
    const rightCol = Math.floor((this.x + colOffX + this.collisionW - 1) / T);
    const parts: string[] = [];
    for (let col = leftCol; col <= rightCol; col++) {
      const t = this.roomData[feetRow]?.[col] ?? 1;
      parts.push(`${col},${feetRow}=${t}`);
    }
    return parts.join(' ');
  }

  /** FSM state probes for VFX driving. */
  isSurgeCharging(): boolean { return this.fsm.currentState === 'surge_charge'; }
  isSurgeFlying(): boolean { return this.fsm.currentState === 'surge_fly'; }
  /** 0..1 charge progress for surge VFX amplitude. */
  getSurgeChargeRatio(): number {
    if (this.fsm.currentState !== 'surge_charge') return 0;
    return Math.min(1, this.surgeChargeTimer / Player.SURGE_CHARGE_MS);
  }

  /** Current vx ??for footstep puff movement check. */
  getVx(): number { return this.vx; }
  /** Current vy ??for dive landing severity / jumpland intensity. */
  getVy(): number { return this.vy; }
  /** Grounded accessor (scene-side VFX polling). */
  isGrounded(): boolean { return this.grounded; }
  /**
   * Sticky external grounding ??set TRUE when standing on a non-grid solid
   * (e.g., a ThrowableContainer top). Player physics OR's it into `grounded`
   * at the end of each update, AFTER the grid check has already overwritten
   * `grounded` to false. Reset to false at the end of update so the scene
   * must re-flag each frame to keep the player on the container.
   */
  private extraGroundedSticky = false;
  forceGrounded(snapPose = false, source = 'scene'): void {
    this.extraGroundedSticky = true;
    this.extraGroundedLabel = source;
    this.grounded = true;
    if (snapPose) {
      const groundState = this.getGroundMovementState();
      if (this.fsm.currentState === 'jump' || this.fsm.currentState === 'fall') {
        this.fsm.transition(groundState);
      }
      if (this.erdaAnim === 'takeoff' || this.erdaAnim === 'air' || this.erdaAnim === 'land') {
        this.erdaAnim = groundState;
        this.erdaAnimFrame = 0;
        this.erdaAnimTimer = 0;
      }
      this.erdaPrevGrounded = true;
    }
  }

  /**
   * DEBUG: Grant the full cheat bundle ??every relic ability, inflated
   * maxHp/atk, and HP-lock-at-1 (immortality clamp). Snapshots the prior
   * values into `cheatBackup` so a second Shift+O press cleanly restores
   * them. No-op if already active.
   */
  enableCheatBundle(): void {
    if (this.debugCheatActive) return;
    this.cheatBackup = {
      maxHp: this.maxHp,
      atk: this.atk,
      abilities: { ...this.abilities },
      debugLockHpAtOne: this.debugLockHpAtOne,
    };
    this.abilities.dash = true;
    this.abilities.diveAttack = true;
    this.abilities.surge = true;
    this.abilities.waterBreathing = true;
    this.abilities.wallJump = true;
    this.abilities.doubleJump = true;
    this.abilities.cheat = true;
    this.maxHp = 99999;
    this.hp = 99999;
    this.atk = 99999;
    this.debugLockHpAtOne = true;
    this.debugCheatActive = true;
  }

  /** Reverse of `enableCheatBundle()` ??restores pre-cheat snapshot. */
  disableCheatBundle(): void {
    if (!this.debugCheatActive || !this.cheatBackup) return;
    this.abilities = { ...this.cheatBackup.abilities };
    this.maxHp = this.cheatBackup.maxHp;
    this.hp = Math.min(this.hp, this.maxHp);
    this.atk = this.cheatBackup.atk;
    this.debugLockHpAtOne = this.cheatBackup.debugLockHpAtOne;
    this.cheatBackup = null;
    this.debugCheatActive = false;
  }
  /** Ice-tile accessor for skid streak VFX. */
  isStandingOnIce(): boolean {
    return this.grounded && isOnIce(this.x, this.y, this.width, this.height, this.roomData);
  }
  /** One-way (drop-through) platform accessor ??for drop-through tutorial gating. */
  isOnOneWayPlatform(): boolean {
    return this.grounded && isOnOneWay(this.x, this.y, this.width, this.height, this.roomData);
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
    // ?àÌä∏Î∞ïÏä§ ?îÎ≤ÑÍ∑?Î∞ïÏä§??Debug.visible ??true ???åÎßå ?úÏãú.
    this.attackSprite.visible = Debug.visible;
  }

  // --- Hit ---

  private _hitstunDuration = 0;
  private _hitstunTimer = 0;
  private externalFacingLockMs = 0;

  private startHit(): void {
    this._hitstunTimer = this._hitstunDuration;
    this.endLagTimer = 0;
    this.comboWindowTimer = 0;
    this.comboIndex = 0;
    rumbleGamepad(140, 0.5, 1.0);
  }

  private stateHit(dt: number): void {
    this._hitstunTimer -= dt;
    // Apply friction during hitstun
    this.vx *= 0.9;
    if (this._hitstunTimer <= 0) {
      if (this.grounded) {
        this.fsm.transition(this.getGroundMovementState());
      } else {
        this.fsm.transition('fall');
      }
    }
  }

  // --- Visual ---

  // Sakurai: Flash overlay for player hit feedback
  private flashOverlay: Graphics | null = null;

  /**
   * Erda ?§ÌîÑ?ºÏù¥??ÎπÑÎèôÍ∏?Î°úÎìú.
   * ?êÏÖã Î∂Ä???§Ìä∏?åÌÅ¨ ?§Ìå® ??fallback ?Ä Í∏∞Ï°¥ ?πÏÉâ placeholder ?†Ï?.
   */
  private loadErdaSprite(): void {
    const path = assetPath('assets/characters/erda_atlas.png');
    Assets.load(path).then((tex: Texture) => {
      if (this.container.destroyed) return;
      // pixel-perfect ??Ï£ºÎ? ?ÖÏä§ÏºÄ???åÏù¥?ÑÎùº??worldRT nearest)Í≥??ºÏπò.
      tex.source.scaleMode = 'nearest';

      // 32√ó32 frame atlas. attack2 adds four frames after attack1:
      // attack1=18..21, attack2=22..25, attack_air=26..29,
      // aim=30..33, aim_jump=34, lift=35..38.
      this.erdaFrames = [];
      const frameCount = Math.floor(tex.width / ERDA_FRAME_W);
      for (let i = 0; i < frameCount; i++) {
        this.erdaFrames.push(
          new Texture({
            source: tex.source,
            frame: new Rectangle(i * ERDA_FRAME_W, 0, ERDA_FRAME_W, ERDA_FRAME_H),
          }),
        );
      }

      const s = new Sprite(this.erdaFrames[0]);
      // Î∞?Ï§ëÏïô Í∏∞Ï?: ?àÌä∏Î∞ïÏä§(14√ó24) ???òÎã® Ï§ëÏïô???§ÌîÑ?ºÏù¥???µÏª§Î•?Í±¥Îã§.
      // 32√ó32 ?§ÌîÑ?ºÏù¥?∏Í? Î∞ïÏä§Î≥¥Îã§ Í∞ÄÎ°?18px, ?∏Î°ú 8px Ïª§ÏÑú Î∞îÍπ•?ºÎ°ú ?êÏ†∏?òÏò¥ (?òÎèÑ).
      s.anchor.set(0.5, 1);
      s.x = this.width / 2;
      s.y = this.height;
      // attackSprite / flashOverlay Î≥¥Îã§ ?ÑÎûò???ìÏïÑ ?àÌä∏Î∞ïÏä§ ?îÎ≤ÑÍ∑??§Î≤Ñ?àÏù¥Î•?Í∞ÄÎ¶¨Ï? ?äÎèÑÎ°?
      const weaponIdx = this.weaponSprite ? this.container.getChildIndex(this.weaponSprite) : -1;
      this.container.addChildAt(s, weaponIdx >= 0 ? weaponIdx + 1 : 0);
      this.erdaSprite = s;
      this.sprite.visible = false; // placeholder off.
    }).catch(() => {
      // Î°úÎìú ?§Ìå® ??placeholder ?†Ï?.
    });
  }

  private getEquippedWeaponDef(): WeaponDef {
    const id = this.equippedWeaponId ?? 'sword_broken';
    return SWORD_DEFS.find(d => d.id === id) ?? SWORD_DEFS.find(d => d.id === 'sword_broken') ?? SWORD_DEFS[0];
  }

  private loadWeaponSprite(defId = 'sword_broken'): void {
    const def = SWORD_DEFS.find(d => d.id === defId) ?? SWORD_DEFS.find(d => d.id === 'sword_broken') ?? SWORD_DEFS[0];
    const path = assetPath(`assets/items/${def.id}.png`);
    Assets.load(path).then((tex: Texture) => {
      if (this.container.destroyed) return;
      tex.source.scaleMode = 'nearest';

      const s = new Sprite(tex);
      s.anchor.set(0, 0);
      s.pivot.set(def.weaponHandleX, def.weaponHandleY);
      s.visible = false;

      if (this.weaponSprite && !this.weaponSprite.destroyed) {
        destroyDisplayObject(this.weaponSprite);
      }
      const erdaIdx = this.erdaSprite ? this.container.getChildIndex(this.erdaSprite) : -1;
      this.container.addChildAt(s, erdaIdx >= 0 ? erdaIdx : 0);
      this.weaponSprite = s;
      this.weaponSpriteDefId = def.id;
    }).catch(() => {
      // Cosmetic only: attack still works without the held weapon sprite.
    });
  }

  private loadAttackWeaponPoseData(): void {
    const path = assetPath('assets/characters/erda_atlas.json');
    fetch(path)
      .then(res => res.ok ? res.json() : null)
      .then((json: {
        meta?: {
          slices?: Array<{
            name?: string;
            keys?: Array<{
              bounds?: { x: number; y: number; w?: number; h?: number };
              pivot?: { x: number; y: number };
            }>;
          }>;
        };
      } | null) => {
        if (!json?.meta?.slices) return;

        const poses = this.attackWeaponPoses.map(p => ({ ...p }));
        for (const slice of json.meta.slices) {
          const match = /^weapon_(\d+)_r(-?\d+)_s(\d+)$/i.exec(slice.name ?? '');
          const key = slice.keys?.[0];
          if (!match || !key?.bounds) continue;

          const frameNo = Number(match[1]);
          const attackFrameIdx =
            frameNo >= 19 && frameNo <= 22 ? frameNo - 19 :
            frameNo >= 18 && frameNo <= 21 ? frameNo - 18 :
            -1;
          if (attackFrameIdx < 0 || attackFrameIdx >= poses.length) continue;

          poses[attackFrameIdx] = {
            x: key.bounds.x + (key.pivot?.x ?? Math.floor((key.bounds.w ?? 1) / 2)),
            y: key.bounds.y + (key.pivot?.y ?? Math.floor((key.bounds.h ?? 1) / 2)),
            rotation: Number(match[2]) * Math.PI / 180 + WEAPON_ICON_BASE_ROTATION,
            scale: Number(match[3]) / 100,
          };
        }
        this.attackWeaponPoses = poses;
      })
      .catch(() => {
        // Fall back to ATTACK_WEAPON_POSES when slice metadata is unavailable.
      });
  }

  private applyWakeUpFrame(frame: number): void {
    if (!this.erdaSprite) return;
    const frameCount = Math.min(ERDA_WAKE_UP_FRAME_COUNT, Math.max(0, this.erdaFrames.length - ERDA_WAKE_UP_START));
    if (frameCount > 0) {
      const idx = Math.max(0, Math.min(frameCount - 1, frame));
      this.erdaSprite.texture = this.erdaFrames[ERDA_WAKE_UP_START + idx];
    } else if (this.erdaFrames.length > 0) {
      this.erdaSprite.texture = this.erdaFrames[0];
    }
  }

  private hideAttackWeapon(): void {
    if (this.weaponSprite) this.weaponSprite.visible = false;
  }

  private updateAttackWeaponPose(frameIdx: number): void {
    const s = this.weaponSprite;
    const def = this.getEquippedWeaponDef();
    if (this.weaponSpriteDefId !== def.id) {
      this.loadWeaponSprite(def.id);
      if (s) s.visible = false;
      return;
    }
    if (!s) return;

    const idx = Math.max(0, Math.min(this.attackWeaponPoses.length - 1, frameIdx));
    const pose = this.attackWeaponPoses[idx];
    const erdaLocalX = this.width / 2;
    const erdaLocalY = this.height;
    const erdaFrameW = 32;
    const erdaFrameH = 32;
    s.visible = true;
    s.x = this.facingRight
      ? erdaLocalX - erdaFrameW / 2 + pose.x
      : erdaLocalX + erdaFrameW / 2 - pose.x;
    s.y = erdaLocalY - erdaFrameH + pose.y;
    s.rotation = this.facingRight ? pose.rotation : -pose.rotation;
    s.scale.set(this.facingRight ? pose.scale : -pose.scale, pose.scale);
  }

  /**
   * Slash FX ?ÑÌ??ºÏä§ ÎπÑÎèôÍ∏?Î°úÎìú. 6 ?ÑÎ†à??32√ó32), ?®Ïùº source Í≥µÏú†.
   * ?¨ÏÉù?Ä startAttack() ?êÏÑú triggerSlash(comboIndex) Î°??úÏûë, updateSlashFX() Í∞Ä ?ÑÎ†à??ÏßÑÌñâ.
   */
  private loadSlashSprite(): void {
    const path = assetPath('assets/sprites/fx_slash_02_atlas.png');
    Assets.load(path).then((tex: Texture) => {
      if (this.container.destroyed) return;
      tex.source.scaleMode = 'nearest';
      this.slashFrames = [];
      for (let i = 0; i < 4; i++) {
        this.slashFrames.push(
          new Texture({ source: tex.source, frame: new Rectangle(i * SLASH_FX_FRAME_W, 0, SLASH_FX_FRAME_W, SLASH_FX_FRAME_H) }),
        );
      }
      const s = new Sprite(this.slashFrames[0]);
      // ?µÏª§: Í∞ÄÎ°?Ï§ëÏïô(0.5) + ?∏Î°ú Ï§ëÏïô(0.5) ???åÎ†à?¥Ïñ¥ ?íÏù¥ Ï§ëÏïô??ÎßûÏ∂∞ Î∞∞Ïπò.
      s.anchor.set(0, 0);
      s.visible = false;
      // attackSprite ???îÎ≤ÑÍ∑?Î∞ïÏä§ ?????§ÎèÑÎ°?Í∑∏ÎÉ• Ï∂îÍ?.
      this.container.addChild(s);
      this.slashSprite = s;
    }).catch(() => {
      // ?§Ìå® ??FX Îß??ùÎûµ. ?ÑÌà¨ ?êÏ≤¥???ÅÌñ• ?ÜÏùå.
    });
  }

  /**
   * Weapon-aware hitbox: scales COMBO_STEPS width by attackHitboxMul.
   * All player attack hitbox queries go through this, so equipment
   * actually changes reach without making taller weapons hit below the FX.
   */
  getAttackStep(comboIndex: number): ComboStep | null {
    const base = COMBO_STEPS[comboIndex];
    if (!base) return null;
    return scaleComboStep(base, this.attackHitboxMul);
  }

  /**
   * ÏΩ§Î≥¥ ?§ÌÖùÎ≥?slash FX ?∏Î¶¨Í±? ?§Ìéô SSoT:
   *   - Í≥µÍ≤© ?êÏ†ï:  COMBO_STEPS[step] √ó attackHitboxMul
   *   - ?úÍ∞Å FX:    resolveComboFx(equippedWeaponType, equippedRarity, step)
   *     ?ú‚? L1 sprite/scale/offset/color: Content_FX_WeaponType.csv
   *     ?î‚? L2 tint:                     Content_Rarity.csv FxTint
   *
   * FxScaleX/Y ??Î¨¥Í∏∞ hitbox Î∞∞Ïú®Í≥??∞Îèô: FX ?¨Í∏∞??Í≥µÍ≤© Î≤îÏúÑ??ÎπÑÎ?.
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
    if (!range) return; // ?????ÜÎäî ?úÍ∑∏ ??FX ?ùÎûµ.
    const [from, to] = range;
    if (from < 0 || to < from || to >= this.slashFrames.length) return;

    this.slashFromIdx = from;
    this.slashToIdx = to;
    this.slashFrameIdx = from;
    this.slashTimer = 0;
    this.slashHitboxW = step.hitboxW;
    this.slashOffsetX = fx.offsetX;
    this.slashOffsetY = fx.offsetY;

    // FX ?úÍ∞Å ?¨Í∏∞??Í≥µÍ≤© Î≤îÏúÑ??ÎπÑÎ?.
    const mul = this.attackHitboxMul;
    const fxScaleY = this.comboIndex === 1 ? -fx.scaleY : fx.scaleY;
    const comboScaleX = this.comboIndex === 2 ? COMBO3_SLASH_SCALE_X : 1;
    s.scale.set(
      this.facingRight ? fx.scaleX * mul * comboScaleX : -fx.scaleX * mul * comboScaleX,
      fx.sprite === 'fx_slash_02' ? fxScaleY : fxScaleY * mul,
    );
    s.tint = fx.color;
    s.texture = this.slashFrames[from];
    s.visible = true;
    this.container.setChildIndex(s, this.container.children.length - 1);
    this.updateSlashFX(0);
  }

  /**
   * Îß??ÑÎ†à??slash FX ?ÑÏπò/?ÑÎ†à??Í∞±Ïã†. stateAttack Ï§ëÏóêÎß??òÎ? ?àÏùå.
   * slashToIdx === -1 ?¥Î©¥ ÎπÑÌôú??
   */
  private updateSlashFX(dt: number): void {
    if (!this.slashSprite || this.slashToIdx < 0) return;
    const s = this.slashSprite;

    // Ï§ëÏã¨ = ?àÌä∏Î∞ïÏä§ Ï§ëÏã¨ + FxOffsetX(Ï¢åÌñ• ??Î∂Ä??Î∞òÏ†Ñ). Y = ?åÎ†à?¥Ïñ¥ ?íÏù¥ Ï§ëÏïô + FxOffsetY.
    const erdaTopLeftX = this.width / 2 - 16;
    const erdaTopLeftY = this.height - 32;
    s.x = this.facingRight
      ? erdaTopLeftX - SLASH_FX_ERDA_REF_X + this.slashOffsetX
      : erdaTopLeftX + 32 + SLASH_FX_ERDA_REF_X - this.slashOffsetX;
    s.y = erdaTopLeftY - SLASH_FX_ERDA_REF_Y + this.slashOffsetY;
    if (s.scale.y < 0) {
      s.y += SLASH_FX_FRAME_H * Math.abs(s.scale.y);
    }
    // Î∞©Ìñ• ?†Ï? (Í≥µÍ≤© Ï§?facing ??Î∞îÎÄåÏßÑ ?äÏ?Îß?Î≥¥Ïàò??Í∞±Ïã†).
    const sx = Math.abs(s.scale.x);
    s.scale.x = this.facingRight ? sx : -sx;

    this.slashTimer += dt;
    const slashFrameMs = Player.ANIM_SLASH_FRAME_MS * this.currentAttackTimeScale;
    while (this.slashTimer >= slashFrameMs) {
      this.slashTimer -= slashFrameMs;
      this.slashFrameIdx++;
      if (this.slashFrameIdx > this.slashToIdx) {
        // ?¨ÏÉù ?ÑÎ£å ???®Í?.
        s.visible = false;
        this.slashToIdx = -1;
        return;
      }
    }
    s.texture = this.slashFrames[this.slashFrameIdx];
  }

  /**
   * ?†ÎãàÎ©îÏù¥??Í∞±Ïã†:
   *   grounded ?£Ï? Í∞êÏ? ??takeoff(?¥Î•ô) / land(Ï∞©Ï?) ?∏Î¶¨Í±?
   *   Í∞??úÎ∏å ?§ÌÖå?¥Ìä∏Í∞Ä ?êÏ≤¥ ?Ä?¥Î®∏Î°??§Ïùå ?§ÌÖå?¥Ìä∏Î°?ÏßÑÌñâ.
   *     idle (loop) ?Äleave?Ä> takeoff ?Ä80ms?Ä> air ?Äland edge?Ä> land(6,50ms) ?Ä> land(7,50ms) ?Ä> idle
   */
  private updateErdaAnimation(dt: number): void {
    if (!this.erdaSprite || this.erdaFrames.length === 0) return;

    if (this.wakeUpHoldPose) {
      this.hideAttackWeapon();
      this.applyWakeUpFrame(0);
      this.erdaPrevGrounded = this.grounded;
      return;
    }

    if (this.wakeUpOverrideTimer > 0) {
      this.hideAttackWeapon();
      const elapsed = Math.max(0, this.wakeUpOverrideDuration - this.wakeUpOverrideTimer);
      const frameCount = Math.min(ERDA_WAKE_UP_FRAME_COUNT, Math.max(0, this.erdaFrames.length - ERDA_WAKE_UP_START));
      if (frameCount > 0) {
        const frameMs = this.wakeUpOverrideDuration / frameCount;
        const frame = Math.min(frameCount - 1, Math.floor(elapsed / frameMs));
        this.applyWakeUpFrame(frame);
      } else {
        this.erdaSprite.texture = this.erdaFrames[0];
      }
      this.wakeUpOverrideTimer = Math.max(0, this.wakeUpOverrideTimer - dt);
      this.erdaPrevGrounded = this.grounded;
      return;
    }

    // Dash ?∞ÏÑ† ??FSM state === 'dash' ÏßÑÏûÖ ?£Ï????†ÎãàÎ©îÏù¥??Î¶¨ÏÖã.
    // dash Ï§ëÏóî grounded ?£Ï?(takeoff/land) ?ÑÏù¥Î•?Í±¥ÎÑà?∞Ïñ¥ 16??7 ?úÌÄÄ?§Î? Î≥¥Ïû•.
    const fsmState = this.fsm.currentState;
    if (fsmState === 'dash') {
      this.hideAttackWeapon();
      if (this.erdaAnim !== 'dash') {
        this.erdaAnim = 'dash';
        this.erdaAnimFrame = 0;
        this.erdaAnimTimer = 0;
      }
      this.erdaPrevGrounded = this.grounded;
      this.erdaAnimTimer += dt;
      // ?ÑÎ†à??16 (startup, 30ms) ??17 (linger, 120ms). ?îÏÉÅ?Ä dash Ï¢ÖÎ£å ?£Ï?ÍπåÏ? ?†Ï?.
      if (this.erdaAnimFrame === 0 && this.erdaAnimTimer >= Player.ANIM_DASH_STARTUP_MS) {
        this.erdaAnimFrame = 1;
        this.erdaAnimTimer = 0;
      }
      this.erdaSprite.texture = this.erdaFrames[16 + this.erdaAnimFrame];
      return;
    }
    if (this.erdaAnim === 'dash') {
      // dash Ï¢ÖÎ£å ??ÏßÄÎ©?Í≥µÏ§ë???∞Îùº idle/run/air Î°?Î≥µÍ?.
      this.erdaAnim = this.getGroundOrAirAnimationState();
      this.erdaAnimFrame = 0;
      this.erdaAnimTimer = 0;
    }

    // Aim/lift release ??restore idle/run/air just like dash exit. Without
    // this, erdaAnim stays 'aim'/'lift' after release and the subsequent
    // idle/run animation branch never fires ??visually frozen on the last
    // aim/lift frame.
    if (!this.isAiming && this.erdaAnim === 'aim') {
      this.erdaAnim = this.getGroundOrAirAnimationState();
      this.erdaAnimFrame = 0;
      this.erdaAnimTimer = 0;
    }
    if (!this.isLifting && this.erdaAnim === 'lift') {
      this.erdaAnim = this.getGroundOrAirAnimationState();
      this.erdaAnimFrame = 0;
      this.erdaAnimTimer = 0;
    }

    // Lift override ??while carrying a throwable container. 4-frame lift
    // animation at indices 35~38 (Aseprite tag `lift`, shifted +4).
    // Walk cycle when ground locomotion is active; hold frame 35 when stationary.
    // Takes precedence over aim because hands are full.
    if (this.isLifting && this.erdaFrames.length >= ERDA_LIFT_START + 4) {
      this.hideAttackWeapon();
      if (this.erdaAnim !== 'lift') {
        this.erdaAnim = 'lift';
        this.erdaAnimFrame = 0;
        this.erdaAnimTimer = 0;
      }
      const moving = this.isGroundLocomotionActive();
      if (moving) {
        this.erdaAnimTimer += dt;
        const LIFT_WALK_FRAME_MS = 110;
        while (this.erdaAnimTimer >= LIFT_WALK_FRAME_MS) {
          this.erdaAnimTimer -= LIFT_WALK_FRAME_MS;
          this.erdaAnimFrame = (this.erdaAnimFrame + 1) % 4;
        }
      } else {
        this.erdaAnimFrame = 0;
        this.erdaAnimTimer = 0;
      }
      this.erdaSprite.texture = this.erdaFrames[ERDA_LIFT_START + this.erdaAnimFrame];
      this.erdaPrevGrounded = this.grounded;
      return;
    }

    // Aim override ??while charging an Ego Shard. 4-frame aim animation
    // at indices 30~33. When ground locomotion is active, cycle the 4 frames
    // as a walk-aim shuffle. When stationary, hold frame 30 (steady aim).
    // Higher priority than idle/run/jump but below dash.
    if (this.isAiming && this.erdaFrames.length >= ERDA_AIM_START + 4) {
      this.hideAttackWeapon();
      if (this.erdaAnim !== 'aim') {
        this.erdaAnim = 'aim';
        this.erdaAnimFrame = 0;
        this.erdaAnimTimer = 0;
      }
      // Mid-air aim ??dedicated `aim_jump` frame. Falls back to the steady
      // aim pose when the atlas hasn't been updated.
      if (!this.grounded) {
        const airIdx = this.erdaFrames.length > ERDA_AIM_JUMP_FRAME
          ? ERDA_AIM_JUMP_FRAME
          : ERDA_AIM_START;
        this.erdaSprite.texture = this.erdaFrames[airIdx];
        this.erdaPrevGrounded = this.grounded;
        return;
      }
      const moving = this.isGroundLocomotionActive();
      if (moving) {
        this.erdaAnimTimer += dt;
        const AIM_WALK_FRAME_MS = 110;   // 4 frames √ó 110 ??440ms cycle
        while (this.erdaAnimTimer >= AIM_WALK_FRAME_MS) {
          this.erdaAnimTimer -= AIM_WALK_FRAME_MS;
          this.erdaAnimFrame = (this.erdaAnimFrame + 1) % 4;
        }
      } else {
        this.erdaAnimFrame = 0;
        this.erdaAnimTimer = 0;
      }
      this.erdaSprite.texture = this.erdaFrames[ERDA_AIM_START + this.erdaAnimFrame];
      this.erdaPrevGrounded = this.grounded;
      return;
    }

    // Attack ??each combo step scrubs a 4-frame attack strip from progress.
    // Grounded 1?Ä/2?Ä use attack1, grounded 3?Ä uses attack2.
    // Airborne attacks always use attack_air so the finisher does not pop to a ground pose.
    if (fsmState === 'attack') {
      // 2?? pause(preAttackDelay) ?ôÏïà ÏßÅÏ†Ñ frame + weapon pose hold.
      // attackTimer Í∞Ä 0 ?¥Îùº ?ÑÎûò progress Í≥ÑÏÇ∞??0.9999 Î°??Ä??frame jump Î∞úÏÉù ??Í∞Ä?úÎ°ú Ï∞®Îã®.
      if (this.preAttackDelay > 0) {
        this.updateAttackWeaponPose(this.erdaAnimFrame);
        this.erdaPrevGrounded = this.grounded;
        return;
      }
      if (this.erdaAnim !== 'attack') {
        this.erdaAnim = 'attack';
        this.erdaAnimFrame = 0;
        this.erdaAnimTimer = 0;
      }
      this.erdaPrevGrounded = this.grounded;
      const step = COMBO_STEPS[this.comboIndex];
      const total = step.totalFrames * FRAME_MS * this.currentAttackTimeScale;
      const progress = total > 0 ? Math.max(0, Math.min(0.9999, 1 - this.attackTimer / total)) : 0;
      const forwardIdx = Math.min(ERDA_ATTACK_FRAME_COUNT - 1, Math.floor(progress * ERDA_ATTACK_FRAME_COUNT));
      const idx = this.comboIndex === 1 ? ERDA_ATTACK_FRAME_COUNT - 1 - forwardIdx : forwardIdx;
      const attackStart =
        !this.grounded && this.erdaFrames.length >= ERDA_ATTACK_AIR_START + ERDA_ATTACK_FRAME_COUNT
          ? ERDA_ATTACK_AIR_START
          : this.comboIndex === 2 && this.erdaFrames.length >= ERDA_ATTACK2_GROUND_START + ERDA_ATTACK_FRAME_COUNT
            ? ERDA_ATTACK2_GROUND_START
            : ERDA_ATTACK_GROUND_START;
      this.erdaAnimFrame = idx;
      this.erdaSprite.texture = this.erdaFrames[attackStart + idx];
      this.updateAttackWeaponPose(idx);
      return;
    }
    // ÏΩ§Î≥¥ hold ??attack Ï¢ÖÎ£å ÏßÅÌõÑ ÏΩ§Î≥¥ ?àÎèÑ???êÎäî 3?Ä endLag) ?ôÏïà ÎßàÏ?Îß?attack
    // frame ??hold ??Ïπ????êÏÑ∏ + weapon pose ?†Ï?. ?§Ïùå ÏΩ§Î≥¥ ?ÖÎ†• ???êÏó∞?§ÎüΩÍ≤?
    // ?§Ïùå swing ?ºÎ°ú ?∞Í≤∞, ?àÎèÑ??ÎßåÎ£å/?êÌîÑ/?Ä???±ÏúºÎ°?Ï∫îÏä¨?òÎ©¥ idle Î°?Î≥µÍ?.
    // ?êÌîÑ¬∑?Ä?ú¬∑Í≥µÏ§ëÏ? hold Íπ®Í≥† ?êÏó∞ ?ÑÏù¥ (fsmState Í∞Ä??.
    if (this.erdaAnim === 'attack'
        && (this.comboWindowTimer > 0 || this.endLagTimer > 0)
        && this.grounded
        && (fsmState === 'idle' || fsmState === 'run')) {
      this.updateAttackWeaponPose(this.erdaAnimFrame);
      this.erdaPrevGrounded = this.grounded;
      return;
    }
    if (this.erdaAnim === 'attack') {
      // attack Ï¢ÖÎ£å ??ÏßÄÎ©?Í≥µÏ§ë???∞Îùº idle/run/air Î°?Î≥µÍ?.
      this.erdaAnim = this.getGroundOrAirAnimationState();
      this.erdaAnimFrame = 0;
      this.erdaAnimTimer = 0;
    }
    this.hideAttackWeapon();

    // ?£Ï? Í∞êÏ? ??grounded Î≥Ä???úÍ∞Ñ?êÎßå ?úÎ∏å ?§ÌÖå?¥Ìä∏ ?ÑÏù¥.
    if (this.erdaPrevGrounded && !this.grounded) {
      // ?¥Î•ô. vy < 0 = ?êÌîÑ ?ÖÎ†• ??takeoff(4) ?úÌÄÄ??
      // vy ??0 = Î≤ºÎûë ?ôÌïò ???úÎ∏å ?§ÌÖå?¥Ìä∏ Í∑∏Î?Î°?idle) ?†Ï?, ?ÑÎ†à???ºÎ†§ Í≥µÏ§ë?êÏÑú idle ?¨Ï¶à ?ïÏ?.
      this.erdaJumpedOff = this.vy < 0;
      if (this.erdaJumpedOff) {
        this.erdaAnim = 'takeoff';
        this.erdaAnimTimer = 0;
        this.erdaAnimFrame = 0;
      }
    } else if (!this.erdaPrevGrounded && this.grounded) {
      // Ï∞©Ï?. ?êÌîÑ?Ä?ºÎ©¥ 6??, ?ôÌïò?Ä?ºÎ©¥ 7Îß??¨ÏÉù.
      this.erdaAnim = 'land';
      this.erdaAnimTimer = 0;
      this.erdaAnimFrame = this.erdaJumpedOff ? 0 : 1;
    }
    this.erdaPrevGrounded = this.grounded;

    // Grounded idle/run switches from locomotion intent or velocity.
    if (this.grounded && (this.erdaAnim === 'idle' || this.erdaAnim === 'run')) {
      const desired = this.getGroundMovementState();
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
        // Î∞òÏùë???∞ÏÑ†: Ï¢åÏö∞ ?¥Îèô??Í±∏Î¶¨Î©?land Î•??äÍ≥† run ?ºÎ°ú ?êÌîÑÏª?
        // ?¨Ï†ê?ÑÎäî ?§Ïùå ?ÑÎ†à??grounded ?£Ï?Í∞Ä takeoff Î°??êÎèô ?ÑÏù¥?úÌÇ¥.
        if (this.isGroundLocomotionActive()) {
          this.erdaAnim = 'run';
          this.erdaAnimFrame = 0;
          this.erdaAnimTimer = 0;
          textureIdx = 8;
          break;
        }
        // sub 0 ???ÑÎ†à??6, sub 1 ???ÑÎ†à??7.
        textureIdx = 6 + this.erdaAnimFrame;
        if (this.erdaAnimTimer >= Player.ANIM_LAND_FRAME_MS) {
          this.erdaAnimTimer = 0;
          if (this.erdaAnimFrame === 0) {
            this.erdaAnimFrame = 1;
          } else {
            // Ï∞©Ï? Î≥µÍµ¨ Ï¢ÖÎ£å ??idle Î£®ÌîÑ ÏßÑÏûÖ.
            this.erdaAnim = 'idle';
            this.erdaAnimFrame = 0;
          }
        }
        break;
      }
      case 'run': {
        // ÏßÄ?ÅÏùº ?åÎßå ?ÑÎ†à??ÏßÑÌñâ ??Î≤ºÎûë ?ôÌïò Ï§ëÏóî ÎßàÏ?Îß?run ?ÑÎ†à?ÑÏùÑ Í≥µÏ§ë?êÏÑú ?†Ï?.
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
        // ÏßÄ?ÅÏùº ?åÎßå ?ÑÎ†à??ÏßÑÌñâ ??Î≤ºÎûë ?ôÌïò Ï§ëÏóê??ÎßàÏ?Îß?idle ?ÑÎ†à?ÑÏùÑ Í≥µÏ§ë?êÏÑú ?†Ï?.
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

    // ?úÏÑ± ?úÍ∞Å(Graphics placeholder ?êÎäî Sprite) Ï∞∏Ï°∞ ??ÍπúÎ∞ï???åÎ¶Ω???ôÏùº ?Ä?ÅÏóê ?ÅÏö©.
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
      // Sprite ??anchor(0.5, 1) Í∏∞Ï??¥Î?Î°?scale.x Îß??§Ïßë?ºÎ©¥ Ï§ëÏã¨ Ï∂??åÏ†Ñ.
      this.erdaSprite.scale.x = this.facingRight ? 1 : -1;
      if (this.weaponSprite?.visible && this.erdaAnim === 'attack') {
        this.updateAttackWeaponPose(this.erdaAnimFrame);
        this.weaponSprite.alpha = this.erdaSprite.alpha;
      }
    } else {
      // Placeholder Graphics ??top-left Í∏∞Ï? ??x Î≥¥Ï†ï ?ÑÏöî (Í∏∞Ï°¥ Î°úÏßÅ ?†Ï?).
      this.sprite.scale.x = this.facingRight ? 1 : -1;
      this.sprite.x = this.facingRight ? 0 : this.width;
    }

    // Update attack visual position on flip. Debug ?†Í???Ï§ëÍ∞Ñ??Í∫ºÏ?Î©?Ï¶âÏãú ?®Í?.
    this.attackSprite.visible = this.attackActive && Debug.visible;
    if (this.attackSprite.visible) {
      const step = this.getAttackStep(this.comboIndex) ?? COMBO_STEPS[this.comboIndex];
      this.attackSprite.x = this.facingRight ? this.width : -step.hitboxW;
    }
  }
}
