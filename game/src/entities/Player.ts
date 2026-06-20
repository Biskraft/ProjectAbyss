import { Container, Graphics, Sprite, Assets, Rectangle, Texture } from 'pixi.js';
import { assetPath } from '@core/AssetLoader';
import { Entity } from './Entity';
import { GameAction } from '@core/InputManager';
import { resolveXPixelStep, resolveYPixelStep, resolveXPixelStepWithSlopes2x1, resolveYPixelStepWithSlopes2x1, TILE_LADDER, isInWater, isInOil, isInMagma, isInAcid, isInCyro, isOnIce, isOnOneWay, isOnLadder, isSolid, tryCornerCorrectUp, tryLedgeSnap, tryDashCornerCorrect } from '@core/Physics';
import { Debug } from '@core/Debug';
import { StateMachine } from '@utils/StateMachine';
import { COMBO_STEPS, COMBO_WINDOW, COMBO3_END_LAG, type ComboStep } from '@combat/CombatData';
import { getPlayerAttackTimeline, type PlayerAttackTimeline } from '@combat/PlayerAttackTimeline';
import { resolveComboFx, FX_SLASH_FRAMES } from '@combat/WeaponFx';
import { scaleComboStep, type CombatEntity } from '@combat/HitManager';
import { SWORD_DEFS, type Rarity, type WeaponDef, type WeaponType } from '@data/weapons';
import type { Game } from '../Game';
import { PlayerConst } from '@data/constData';
// 2026-05-24: BARE_HAND_ATK import ??Î≥§ÌÉ¢ ??Á≠åÎùØÎ´?? ??®Î∞¥Î¨??????
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

/** Oil slip ????????Í≥∑ÏÑ†?∂Ïéõ? oil ?????????Ï•ôË???Î•ÅÍ∂î ??Ê≤ÉÏÑéÏ±∂Â´Ñ??ÂΩ??Á≠åÏôñ????ú‚î∑????Î≥?ç¢. */
export const OIL_SLIP_DURATION_MS = 5000;
export const OIL_RESIDUE_DURATION_MS = OIL_SLIP_DURATION_MS;
/** Acid residue ??acid ?? ??ÍæßÌâ± ????∫Ïöç??trail ?ÑÏèÜÎÆáÊ∫ê??´Íø∏?óËÄ? */
export const ACID_RESIDUE_DURATION_MS = 10000;
/** Magma residue ??magma ?? ??ÍæßÌâ± ????∫Ïöç??trail ?ÑÏèÜÎÆáÊ∫ê??´Íø∏?óËÄ? */
export const MAGMA_RESIDUE_DURATION_MS = 10000;
/** Water residue ??water ?? ??ÍæßÌâ± ??puddle ???????∫Ïöç???´Íø∏?óËÄ?(2026-05-18 ??Î≥?çü only). */
export const WATER_RESIDUE_DURATION_MS = 4000;
/** Cyro residue ??cyro ?? ??ÍæßÌâ± ??ice ?éÍªâ?????∫Ïöç???´Íø∏?óËÄ?(2026-05-18 ??Î≥?çü only). */
export const CYRO_RESIDUE_DURATION_MS = 6000;

/** Ego Shard ???´Íø∏????∞Í∑£??? ?ÑÏèÜÎÆ?? Hades Bloodstone ???âÎµ¨ (3??. */
export const EGO_SHARD_MAX = 3;
/** Time until a fired shard automatically returns to the player (ms). */
export const SHARD_RECOVERY_MS = 8000;
const DASH_FREEZE_MS = PlayerConst.DashFreezeMs;
const DASH_CORNER_TOLERANCE = PlayerConst.DashCornerToleranceY;

// Derived: jump velocity from vÔß?= 2*g*h => v = sqrt(2*g*h)
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
 *  pre-3?? pause (COMBO_3_PRE_DELAY_MS) instead of slowing the 3?? swing itself.
 *  Compounds with weapon atkSpeed and ATTACK_TIME_SCALE inside startAttack. */
const COMBO_STEP_TIME_MUL: ReadonlyArray<number> = [1.0, 1.0, 1.0];

/** Pause inserted between 2?? ??Î£∏Í∂¢ 3?? ??ÎΩ∞ÏÇÇ ??"??ÍπÖÎ?(???? ?ÑÏèÖÎ≤??
 *  Player stays in attack state (air stall remains active for hover combos),
 *  no hitbox / slash FX during the wait, then 3?? swings at normal pace. */
const COMBO_3_PRE_DELAY_MS = 100;

// ???? Air Stall ??aerial attacks suspend the player so a 3-hit combo lands. ????
// Applied during state==='attack' && !grounded. comboIndex 0/1 (1??/2??) get
// "slow descent"; comboIndex 2 (3??) gets "near-halt" to anchor the finisher.
/** Gravity multiplier during 1??/2?? aerial swings ??0 = full halt. */
const AIR_STALL_GRAVITY_MUL_12 = 0;
/** Gravity multiplier during 3?? aerial swing ??0 = full halt for the finisher. */
const AIR_STALL_GRAVITY_MUL_3 = 0;
/** Max downward speed cap during 1??/2?? aerial swings (px/s) ??0 = no drift. */
const AIR_STALL_MAX_FALL_12 = 0;
/** Max downward speed cap during 3?? aerial swing (px/s) ??0 = no drift. */
const AIR_STALL_MAX_FALL_3 = 0;
/** Per-16ms damp on upward velocity during aerial attack ??kills jump residue
 *  so the player "hovers" rather than continuing to rise mid-swing. */
const AIR_STALL_RISE_DAMP_PER_16MS = 0.82;
const WEAPON_ICON_BASE_ROTATION = -45 * Math.PI / 180;
const SLASH_FX_FRAME_W = 96;
const SLASH_FX_FRAME_H = 64;
const SLASH_FX_ERDA_REF_X = 0;
const SLASH_FX_ERDA_REF_Y = 24;
const ERDA_FRAME_W = 48;
const ERDA_FRAME_H = 48;
const ERDA_ATTACK_GROUND_START = 18;
const ERDA_ATTACK2_GROUND_START = 26;
const ERDA_ATTACK_AIR_START = 34;
const ERDA_AIM_START = 38;
const ERDA_AIM_JUMP_FRAME = 42;
const ERDA_LIFT_START = 43;
const ERDA_WAKE_UP_START = 47;
const ERDA_WAKE_UP_FRAME_COUNT = 10;
const ERDA_ATTACK_GROUND_FRAME_COUNT = 8;
const ERDA_ATTACK_AIR_FRAME_COUNT = 4;
const COMBO3_SLASH_SCALE_X = 1.35;
const PLAYER_SLASH_FX_ENABLED = true;
const CLIMB_SPEED = MOVE_SPEED;
const CLIMB_STEP_OFF_SPEED = MOVE_SPEED * 0.55;
const CLIMB_CENTER_LERP = 0.28;

const ATTACK_WEAPON_POSES = [
  { x: 14, y: 17, rotation: 2.35, scale: 0.85, drawOrder: 'front' },
  { x: 15, y: 17, rotation: 2.35, scale: 0.9, drawOrder: 'front' },
  { x: 15, y: 16, rotation: 2.35, scale: 0.85, drawOrder: 'front' },
  { x: 14, y: 16, rotation: 2.35, scale: 0.8, drawOrder: 'front' },
] as const;
type AttackWeaponDrawOrder = 'front' | 'back';
type AttackWeaponPose = { x: number; y: number; rotation: number; scale: number; drawOrder: AttackWeaponDrawOrder };
type ErdaFrameRange = { from: number; to: number; count: number };

export type PlayerState = 'idle' | 'run' | 'jump' | 'fall' | 'climb' | 'dash' | 'dive' | 'surge_charge' | 'surge_fly' | 'attack' | 'hit' | 'death';

export class Player extends Entity implements CombatEntity {
  private game: Game;
  /**
   * Placeholder green rect ????????•‚â™ÎÆÜÈÄ?È§????àÏÜ≠ ??fallback.
   * erdaSprite ?∂Ïéõ? ?Î∏êÎäø??æÏ≠ñ?invisible Á≠åÔΩåÍº??
   */
  private sprite: Graphics;
  /**
   * Erda Á≠?≈¶??????àÎäÑ??ÍπÜÎµ†?? 32??2 RGBA (assets/characters/erda_atlas.png).
   * 8?Ë¢Å‚ë•????∂Ïéõ????Ë¢???ÍπÖÎÆû ??idle(0??), jump(4??).
   * ???ÖÎ±ú?ÑÏèÖÎ≤??14??4)?∞Í∑£????????anchor=(0.5, 1) ??"??È§ìŒªÏµê?? ?ÔßêÔΩåÏ°?
   * ?•‚â™ÎÆÜÈÄ?????¨Áå∑?ÑÎ¨æ?®ÏÄ¨Îµ†Ê≤ÉÏÉï????•‚â™ÎÆÜË´≠??Ë¢Å‚ë∏??null, ?•‚â™ÎÆÜË´≠??Ë¢Å‚ë•???????´Ç????????Î¥î¬ÄÁ≠?
   */
  private erdaSprite: Sprite | null = null;
  private weaponSprite: Sprite | null = null;
  private weaponSpriteDefId: string | null = null;
  private attackWeaponPoses: AttackWeaponPose[] = ATTACK_WEAPON_POSES.map(p => ({ ...p }));
  private attackWeaponPoseByFrame = new Map<number, AttackWeaponPose>();
  /** ?Ë¢???ÍπÖÎÆû???????Î°?µ¨??8???Ë¢Å‚ë•??????©ÎÆûÁ≠?(idle 0??, jump 4??). */
  private erdaFrames: Texture[] = [];
  private erdaFrameDurationsMs: number[] = [];
  private erdaFrameTags = new Map<string, ErdaFrameRange>();
  private wakeUpOverrideTimer = 0;
  private wakeUpOverrideDuration = 0;
  private wakeUpHoldPose = false;
  private playerInputSuppressed = false;
  /**
   * ??´ÎîÖÎπçÁ≠åÎ°´ÎóÑ?????Î∫•Îãè ???à¬Ä??Íæ®Î±ú:
   *   - idle   : ?Ë¢Å‚ë•???0..3 ?Î£êÎ´Ç??(400ms/frame)
   *   - run    : ?Ë¢Å‚ë•???8..15 ?Î£êÎ´Ç??(100ms/frame)
   *   - takeoff: ?Ë¢Å‚ë•???4, Á≠åÏöÅÎ£? ???Ôß?squash (160ms)
   *   - air    : ?Ë¢Å‚ë•???5, ??§Î≤äÂ§?Á≠åÏôñ???
   *   - land   : ?Ë¢Å‚ë•???6 ??7, Á≠åÏöÅÎ£? Á≠å‚ñ≥Î´? ?∞Í∑£Î≤Ä??(??150ms)
   *   - dash   : ?Ë¢Å‚ë•???16 ??17 (startup 30ms + linger 120ms)
   *   - attack : ?Ë¢Å‚ë•???18..21, Á≠åÏöä?µÔßë?ëÎ™¥??´Íø∏?°ËÄ????ÑÏæø??(step.totalFrames*FRAME_MS ??Á≠åÎùø???4?Ë¢Å‚ë•????Î∏åÏëµ??
   * idle/run switches on grounded locomotion intent or actual velocity.
   * ??§Î≤äÂ§?Á≠åÏöä???Á≠å‚ñ≥Î´???grounded ?ÁØÄ????ÔßèÍ∫øÎ¥∫Ê§∞?
   * dash / attack ?? FSM state ?∂ÏèÖ≈ä???Á≠åÏöä?????ÍæßÌâ±.
   */
  private erdaAnim: 'idle' | 'run' | 'takeoff' | 'air' | 'land' | 'climb' | 'dash' | 'attack' | 'aim' | 'lift' = 'idle';
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
  /** idle/run/land ????Î∫•Îãè ?Ë¢Å‚ë•????ÔßèÍªä???(0 ?´Íø∏??). takeoff/air ?????????? */
  private erdaAnimFrame = 0;
  /** ?Ë¢Å‚ë•????Ë¢Å‚ëπ?????????(ms). */
  private erdaAnimTimer = 0;
  /** ??Í≥∏Ïùà ?Ë¢Å‚ë•??Ë¢Å‚ëπÎ≤?grounded. ???Ôß?Á≠å‚ñ≥Î´? ?ÁØÄ? ?∂ÏèÖ≈ä??? */
  private erdaPrevGrounded = true;
  /**
   * ??§Î≤äÂ§?Á≠åÏöä??????íÍ≥ï??jump ???ÜÏ†æ)?Ôß? ??Œª?????∞Î¶≠(ledge walk-off)?Ôß?.
   * ???∞Î¶≠ ??air(5) / land ?Œª?ÑËÄ?6) ?Ë¢Å‚ë•??Ë¢Å‚ëπÎ±????ÑÎïÅ???∂ÏèÑ?®Áåø?????∞Î¶≠-Á≠å‚ñ≥Î´?Á≠???Ê∫?
   */
  private erdaJumpedOff = false;
  private static readonly ANIM_IDLE_FRAME_MS = 400;  // ???Í∂?100ms ??4 ???Î¥∫Èáé?
  private static readonly ANIM_RUN_FRAME_MS = 67;     // running ?????Í∂?100ms ??1.5?????úÏ¶≤
  private static readonly ANIM_TAKEOFF_MS = 160;      // ?Ë¢Å‚ë•???4 ??Á≠åÏöÅÎ£? ???Ôß?squash (2????Î∫£Îªº)
  private static readonly ANIM_LAND_FRAME_MS = 150;   // ?Ë¢Å‚ë•???6, 7 ?∂ÏèÑ?´ËÄ??????úÏ¶≤ 2/3 ???∂ÏèÖ≈ä??(100??50ms)
  private static readonly ANIM_DASH_STARTUP_MS = 30;  // ?Ë¢Å‚ë•???16 ????´Î°´Ï∂?ö•?™ÎÆá????Î∫£Ïßó (Á≠åÏöÅÎ£ìËã°?
  private static readonly ANIM_DASH_LINGER_MS = 120;  // ?Ë¢Å‚ë•???17 ????∫ÏößÎß?????(?´ÎÄÄ?áËã°?. ??Î£ª¬Ä?150ms = DASH_DURATION
  /** Slash FX ??atlas ?Ë¢Å‚ë•???ms. FX ???àÏùÉ(sprite/scale/offset/color) ?? CSV(COMBO_STEPS) SSoT. */
  private static readonly ANIM_SLASH_FRAME_MS = 40;
  private slashFrames: Texture[] = [];
  private slashSprite: Sprite | null = null;
  private slashTimer = 0;          // ???????´ÎîÖÎπçÁ≠åÎ°´ÎóÑ??????????(ms)
  private slashFrameIdx = 0;       // ?Ë¢Å‚ëπ????Ê∫?È§ìŒªÏµê??atlas ?Ë¢Å‚ë•????ÔßèÍªä???
  private slashFromIdx = 0;        // ??Ê∫???åÎçâ????ÎΩ∞ÏÇÇ
  private slashToIdx = -1;         // ??Ê∫???åÎçâ????(????????-1)
  private slashHitboxW = 0;        // ??????????? Á≠å„ÄìÏ±∑???Î°´ÎÆâ ???ÖÎ±ú?ÑÏèÖÎ≤???∂Ïéõ??????Ë¢Å‚ë∫????£Ïë¥Ê≤??
  private slashOffsetX = 0;        // CSV FxOffsetX Á≠?≈ä??(??§Î???È§?comboIndex ?∂Ïéõ? ?ÑÏèÖ?Ä???????Ë¢Å‚ëπ??FX ???)
  private slashOffsetY = 0;        // CSV FxOffsetY Á≠?≈ä??
  private attackSprite: Graphics;
  fsm: StateMachine<PlayerState>;

  // Stats
  hp = PlayerConst.BaseHp;
  maxHp = PlayerConst.BaseHp;
  // 2026-05-24: Á≠åÎùØÎ´?? ??®Î∞¥Î¨???Î≥§ÌÉ¢. BARE_HAND_ATK ?∂Ïéõ???????? ??úÎñØ??Ê≤ÉÏÑéÏ±?ÔΩè„éï???ATK 0.
  // updatePlayerAtk() ?∂Ïéõ? Á≠??Ë¢Å‚ë•???atk ???????®Ï¢äÎ¶?≤É?ï¬Ä???Œª?ÉÁî±Í≤ºÏ≤éË™? placeholder.
  atk = 0;
  def = PlayerConst.BaseDef;
  facingRight = true;

  // ============================================================
  // Tile hazard status (TileHazards.ts duck-typed fields)
  // magma ??æÎ?Í≤???Burn 3s Â§?charged Á≠åÔΩã?Ôß???0.5s tick Â§?acid Á≠åÔΩã?Ôß?????®ÏÄ´Í∫ó DOT
  // GDD: Documents/System/System_World_TileSystem.md Ôß?.6-2.13
  // ============================================================
  /** Burn ??®Î∞¥Î¨???∫Ïö©??ms (0 = ?Ôßê„Ö∫Îß?. magma/fire ??æÎ?Í≤??????±Ï†üÂ§∑Îö¶Ï≤éÊ∫ê?øÎªø. */
  burnRemainingMs = 0;
  /** Burn 1??tick ?Ë¢Å‚ëπ???(HazardTarget ?ÔßèÎÇÜ??. */
  burnTickAccum = 0;
  /** Charged 0.5??tick ?Ë¢Å‚ëπ???(?Ë¢Å‚ë§Íµ?Á≠åÏöä???È§ìŒªÏµê?âÎêµÏ≠?Á≠åÏïπÎπ?). */
  chargedTickAccum = 0;
  /** Acid 0.1??tick ?Ë¢Å‚ëπ???(?Ë¢Å‚ë§Íµ?Á≠åÏöä???È§ìŒªÏµê?âÎêµÏ≠?Á≠åÏïπÎπ?). */
  acidTickAccum = 0;
  chargedStateMs = 0;
  cyroTickAccum = 0;
  cyroSlowRemainingMs = 0;
  /** ??Í≥∏Ïùà ?Ë¢Å‚ë•???electric ???¥Ïíî???±Îµ† ???±Îµ†???àÎÆâÁ≠åÏôñ? (thunder per-pulse ???Á≠åÏôñ? ?ÔßèÍªã???. */
  prevInElectric = false;
  /**
   * Oil slip debuff ??∫Ïö©??ms. oil ?????????Ï•ôË???Î•ÅÍ∂éÁ≠?OIL_SLIP_DURATION_MS ??
   * refresh. > 0 ?????àÌàß ice ?? ???âÎµ¨??Ê≤ÉÏÑéÏ±∂Â´Ñ??ÂΩ?(frictionMul = 0.1).
   * Scene ??hazard tick ?????Á≠??Ë¢Å‚ë•????∂ÏèÖ≈ä??
   */
  oilSlipRemainingMs = 0;
  /**
   * Oil footprint trail timer. Separate from slip so touching an old oil blot
   * can refresh slipperiness without recursively spawning more oil blots.
   */
  oilResidueRemainingMs = 0;
  /** ??Í≥∏Ïùà ?Ë¢Å‚ë•???oil ?? ???∞Ìì† ??????? ??Á≠åÏöä???ÏÆ??ÍæßÌâ± ?Ë¢Å„Çå???∂ÏèÖ≈ä??????? */
  prevInOil = false;
  /** Acid residue trail ??∫Ïö©????Î≥?ç¢ ???ÑÏèÜÎÆ??acid ???ÔßíÍ≥ï????∞ÏÑ† ??∫Ïöç????∫Ïö∞??spawn. */
  acidResidueRemainingMs = 0;
  prevInAcid = false;
  /** Magma residue trail ??∫Ïö©????Î≥?ç¢ ???ÑÏèÜÎÆ??magma ???üÎ∞∏Ï±?????∫Ïöç????∫Ïö∞??spawn. */
  magmaResidueRemainingMs = 0;
  prevInMagma = false;
  /** Water residue trail ??∫Ïö©????Î≥?ç¢ ?????ÔßíÍ≥óÎ≤?puddle ??∫Ïö∞??(2026-05-18). */
  waterResidueRemainingMs = 0;
  /** Cyro residue trail ??∫Ïö©????Î≥?ç¢ ???ÑÏèÜÎÆ?Íæ£Î§É???ice ?éÍªâ?????∫Ïöç??(2026-05-18). */
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
    dash: false,          // ???Î¥????úÍµ£ ?Ë¢Å„èâ?±Á≠å?ñ¬Ä ??????(??Î•Å„â¶?????úÍµ£)
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
  private surgeDirX = 0; // 0 = straight up, Ôß? = diagonal off wall
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
  /** True Á≠??Ë¢Å‚ëπ??grounded ??®Î∞¥Î¨∂Êè∂?õ¬Ä carrier(GiantBuilder ?????????Î∫õÎä∫) ?Ë¢Å‚ë∏???????±Î≤â??
   *  ?????Î∫£ÎºÑ. ???éÍªã???lastSafeX/Y ???∂ÏèÑ????? ???øÌà° spike teleport ??
   *  carrier ?∂Ïéõ? ??´ÎîÑ?åÁîïÍ≥åÏë¨???Ë¢Å‚ë∫?ÑÂö•??∞Í∑£Î≤Ä???? ??Íæ©Ïì∫ ??Î∫£ÎºÑ. Scene ??Á≠??Ë¢Å‚ë•???
   *  playerOnBuilder ?éÍªâ???ùÏóê??∂ÏèÑ????Î∫£ÎºÑ. */
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
  /** Debug (Shift+I): ??????Ë¢Å‚ë•?????? Á≠åÏôñ?Á≠åÏôñ? ???ÎÆ? 'grid'|'slope'|'none' ???ÎÆ?
   *  ????forceGrounded ?????æ‚î∏ ??Í≥åÎ≥º('container'|'builder'|'locked-door'|'void-fade' ??. */
  groundSource = 'none';
  /** Debug: groundSource==='grid' ?????ÑÏèÜÎÆÜËÄ??? ??´Ïä¶Ôß?????Î∑?Á≠åÎ§¥Î´ñ‰ª•? */
  groundSourceDetail = '';
  /** ??forceGrounded ?∂Ïéõ? ???æ‚î∏ ??Í≥åÎ≥º (extraGroundedSticky ?∂Ïéõ? true ????groundSource ???ÔßèÍæ™??. */
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
  /** true Á≠??????????? Á≠åÏôñ???®Î™É?????ÎΩ∞ÏÇÇ???Î≤? dash ??´ÍµùÔß????Î¨ÖÎ´Ç??????Ï∂???????´Íø∏??. */
  private dashStartedGrounded = false;
  /** ??????´ÎîÖ?Ä ???æÌçô ???????(ms). >0 ?????vx/vy=0, ?ÑÏéªÎ´öÂ†â?Ï≠???Î¨êÌÉ£Á≠? */
  private dashFreezeTimer = 0;

  // Variable jump height
  /** ??íÍ≥ï????JUMP ??Í≤πÎä∫ ??®Î™ÉÎ±???úÏ¶≤?????âÎ∫ò ?????????àÎÆâ ??´Î•Å????Î≥?ç¢ (ms). */
  private varJumpTimer = 0;
  private ladderCenterX: number | null = null;

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
  comboIndex = 0;          // 0=1??, 1=2??, 2=3??
  attackTimer = 0;          // current attack frame timer (ms)
  private attackElapsedMs = 0;
  private attackVisualTotalMs = 0;
  private attackHitStartMs = 0;
  private attackHitEndMs = 0;
  private attackFxMs = 0;
  private attackCancelStartMs = 0;
  private attackCancelEndMs = 0;
  private attackMoveLockEndMs = 0;
  private attackLungeStartMs = 0;
  private attackLungeEndMs = 0;
  private currentAttackTimeline: PlayerAttackTimeline | null = null;
  private attackFxTriggered = false;
  private attackVisualReleased = false;
  comboWindowTimer = 0;     // time left to input next combo (ms)
  endLagTimer = 0;          // 3?? end lag (ms)
  attackQueued = false;     // next attack input buffered
  hitList = new Set<CombatEntity>();
  private attackActive = false;
  private attackHasActivated = false;
  private attackLungeRemainingPx = 0;
  private attackLungeSpeedPxPerMs = 0;
  private attackLungeDir: 1 | -1 = 1;
  private attackHitRecoilMs = 0;
  private attackHitRecoilVx = 0;
  /** Captured at startAttack ??ATTACK_TIME_SCALE divided by the equipped
   *  weapon's CSV atkSpeed. Locks the swing's pace so a mid-swing weapon
   *  swap doesn't visually rubber-band. CSV atkSpeed > 1 = faster, < 1 = slower. */
  private currentAttackTimeScale = ATTACK_TIME_SCALE;
  /** ms remaining in the 2???? pause. >0 holds the player in 'attack' state
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

    this.collisionW = PlayerConst.CollisionW;
    this.collisionH = PlayerConst.CollisionH;

    // Placeholder sprite ??erdaSprite ?•‚â™ÎÆÜÈÄ??Ë¢Å„èâ?±Á≠å?ñ¬ÄÁ≠??∞Í∑£???
    this.sprite = new Graphics();
    this.sprite.rect(0, 0, this.width, this.height).fill(0x2ecc71);
    this.container.addChild(this.sprite);

    // Attack hitbox visual (hidden by default)
    this.attackSprite = new Graphics();
    this.attackSprite.visible = false;
    this.container.addChild(this.attackSprite);

    // ???¨Áå∑?ÑÎ¨æ??•‚â™ÎÆÜË´≠? ?Ë¢Å‚ë•????Graphics ????ÔΩã‚îõ??Sprite ????Ä≈ä??
    this.loadErdaSprite();
    this.loadAttackWeaponPoseData();
    this.loadWeaponSprite();
    this.loadSlashSprite();

    // State machine
    this.fsm = new StateMachine<PlayerState>();
    this.setupStates();
    this.fsm.transition('fall');
  }

  getHurtAABB(): { x: number; y: number; width: number; height: number } {
    const width = this.width;
    const height = this.height;
    return {
      x: this.x + (this.width - width) / 2,
      y: this.y + this.height - height,
      width,
      height,
    };
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
      name: 'climb',
      enter: () => this.startClimb(),
      update: (dt) => this.stateClimb(dt),
      exit: () => { this.ladderCenterX = null; },
    });
    this.fsm.addState({
      name: 'dash',
      enter: () => this.startDash(),
      update: (dt) => this.stateDash(dt),
      exit: () => {
        // Á≠åÏôñ???????Î∫£ÎÆâ ??´ÍµùÔß??éÍªã?•‰ª•?? ??úÎñØ????øÏì∫ ?Î¨ÖÎ´Ç??Ë¢Å‚ëπÎµ???ÎΩ∞ÏÇÇ??Î§øÏÑ†????Î∫£ÎºÑ.
        // ?Ôßê„Ö∫Îß???´ÍµùÔß?stateDash ??dashTimer<=0) + È§ìŒªÏµé??onHit/onDeath ??FSM ?Ë¢Å‚ëπÎµ?
        // ??æÎ?Í±?Á≠åÎ§¥Î´ÄÔß????????£ÎÅá?? stateDash ?????set ??Î°?ä∫ È§ìŒªÏµé???éÍªã?•‰ª•?ÑÎ™¥??Ëπ???
        // ???£Î¥Ñ Á≠åÏöä???Á≠åÏï∏Îß????????∂Ïéõ??È§®Èáâ??ïÍ≥å????ÑÏèÜÎÆáÊ∫ê?(Codex review P2).
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
    // Carrier(GiantBuilder) ??grounding ?? safe ground ???´Íø∏?°‰ª•??? ???ÖÎÆâ??
    // ????Î¨àÏ≤é? ????????Îº????spike teleport ?∂Ïéõ? ????§Î?????∂Ïéõ??Í∑êÎó™?ïÁ≠å?????
    // ??íÍ≥ïÎ¶???™ÎÇØ? ????´Ïä£?????Ôßê„Ö∫Ïª????ÎÆ??ÎØ©Ï±∂????Á≠åÎùæÎß?? ???∞Ìì† ???±Î™µÁ≠??´Íø∏?°‰ª•??? ???ÖÎÆâ??
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
      // 2026-05-17: drop-through ??? ??"Á≠å‚ñ≥Î´? Á≠åÏöä??????Ïß???íÍ≥ï?? ?ÑÏéªÎ´?.
      //  - DOWN ?????Îµ???®Î∞¥Î¨??JUMP ??buffer ??? ???ÖÎÆâ??(??Î°´Ï¶≤=??Î∫§Îøª, not jump).
      //  - drop-through Á≠åÏöä???short window (dropThroughTimer ??ÎΩ?âê È§? ??JUMP ????úÎòª??
      // ??????®Î™Ñ???(a) DOWN ??? mash ?? (b) DOWN ???¶¬Ä?JUMP ??? Á≠åÎ§¥Î´ÄÔß?Á≠å‚ñ≥Î´Ä??
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

    if (state !== 'climb' && this.canEnterClimb()) {
      this.fsm.transition('climb');
      return;
    }

    // Surge input ????+ C on ground or wall
    if (!this.isLifting && this.abilities.surge && this.isPlayerInputJustPressed(GameAction.DASH) &&
        this.isPlayerInputDown(GameAction.LOOK_UP) &&
        (this.grounded || this.wallSliding) &&
        state !== 'surge_charge' && state !== 'surge_fly' && state !== 'climb' && state !== 'hit' && state !== 'death') {
      this.fsm.transition('surge_charge');
      return;
    }

    // Dash input (requires dash ability, available from most states, cancels 3?? end lag)
    if (!this.isLifting && this.abilities.dash && this.isPlayerInputJustPressed(GameAction.DASH) &&
        state !== 'dash' && state !== 'surge_charge' && state !== 'surge_fly' && state !== 'climb' && state !== 'hit' && state !== 'death') {
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
        state !== 'dive' && state !== 'dash' && state !== 'climb' && state !== 'hit' && state !== 'death') {
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
      !this.isLifting && state !== 'climb' && state !== 'dive' && state !== 'hit' && state !== 'death';
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
    // 2026-05-17: ?Î¥î¬Ä??/ ??´Î°™????????Á≠åÎ§¥Î´ÄË´?fluid (water/oil/magma/acid/cyro) ??
    // ??? ??®Î™Ñ?? `waterMult` ?∂Ïéõ? gravity + ??Î¨êÏ¶∏ ?????+ max fall ?????àÎªª????íÍ≥ïÎ¶??Î∫£ÎºÑ.
    // ?∞Í∂∞???Î°?µ¨?? legacy "water" ??? (Á≠å„ÄìÏ±∑???Î¥î¬Ä????. ?∞Í∑¢?¨Áå∑?inAnyFluid ????ãÂüüÎ∞∏Ï±∂‰ª?split.
    const inAnyFluid = this.inWater
      || isInOil(this.x, this.y, this.width, this.height, this.roomData) || overlayTile === 11
      || isInMagma(this.x, this.y, this.width, this.height, this.roomData) || overlayTile === 6
      || isInAcid(this.x, this.y, this.width, this.height, this.roomData) || overlayTile === 13
      || isInCyro(this.x, this.y, this.width, this.height, this.roomData) || overlayTile === 20;
    const waterMult = inAnyFluid ? PlayerConst.WaterMoveMult : 1.0; // slow gravity/fall behavior in fluid
    const horizontalFluidMoveMult = this.inWater && this.abilities.waterBreathing ? 1.25 : waterMult;

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
    // ?Ôßê„Öº???üÎ??òËçë?|vy| < APEX_THRESHOLD)?????È§ìŒªÏµé?????âÎ∫ò ??Á≠åÔΩã???Ï≤???®Î™ÉÎ±?
    // Aerial attack ??"Air Stall": gravity dramatically reduced + max fall
    // capped so 1/2/3?? ?Íæ†ÎÅá???Ë¢Å‚ë∑?????§Î≤äÂ§???????Í≥∑ÏÑ† Á≠åÎùø????????àÎºÑ. 3????
    // Ê§∞Íæß???Á≠åÎ°´????Á≠åÎùæ?ÑÔ§á???∂ÏèÖÎ≤??????±Ï†ü??®Î™ÑÎ™µÂö•??Î¨éÎûô????Î∫£ÎºÑ.
    if (state !== 'climb' && state !== 'dash' && state !== 'dive' && state !== 'surge_fly' && state !== 'surge_charge') {
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

      // inAnyFluid Á≠?fluid drag ??max fall ?????âÎµ¨ Á≠?(2026-05-17 ???Î¥î¬Ä?????Îµ?.
      const baseMaxFall = inAnyFluid ? MAX_FALL_SPEED * PlayerConst.WaterMaxFallMult : MAX_FALL_SPEED;
      const maxFall = aerialAttack
        ? (this.comboIndex === 2 ? AIR_STALL_MAX_FALL_3 : AIR_STALL_MAX_FALL_12)
        : baseMaxFall;
      if (this.vy > maxFall) this.vy = maxFall;
    }

    // Variable jump height ??JUMP ?ïÍ≥å?????????????Í≥∑Ìì† ??Í≤πÎä∫ ??®Î™ÉÎ±???úÏ¶≤ ???âÎ∫ò ??
    // tap = short hop, hold = full height. dash/surge È§ìŒªÏµê????????(varJumpTimer=0 ???).
    if (this.varJumpTimer > 0) {
      this.varJumpTimer -= dt;
      if (this.vy < 0 && this.isPlayerInputJustReleased(GameAction.JUMP)) {
        this.vy *= VAR_JUMP_CUT_MULT;
        this.varJumpTimer = 0;
      } else if (this.vy >= 0) {
        // ???? ???∞Î¶≠ È§ìŒªÏµê?Ï¢ëÏ≠ñ??????????? ??Í≥∏Î≤â.
        this.varJumpTimer = 0;
      }
    }

    // WaterBreathing removes water slowdown and grants a small horizontal speed boost.
    const moveX = this.consumePixelMoveX(this.vx * horizontalFluidMoveMult * dtSec);
    const moveY = this.consumePixelMoveY(this.vy * dtSec);
    const colOffX = (this.width - this.collisionW) / 2;   // center horizontally
    const colOffY = this.height - this.collisionH;         // anchor at feet

    // 2x1 virtual slopes are player-only overlays inferred from the IntGrid.
    // Non-slope ledges still fall back to the older snap/corner correction.
    const physX = this.x + colOffX;
    const physY = this.y + colOffY;
    const slopeEligible =
      state !== 'climb' && state !== 'dive' && state !== 'surge_fly' && state !== 'surge_charge' &&
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

    // ??®Î™ÉÎ±?È§?Á≠åÔΩåÎÆ???Íæ®Î??????Í≥? Ê§∞Íæ®Ï±?Í≥ªÏ≠ñ?8px ???Ê≤???????Î¨êÏ¶∏??Í≥óÏ®Æ ?ÑÏéõ??????Í∂?
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
    // Debug (Shift+I): ?ÑÏèÜÎÆÜËÄ????´ÎîÜÎª†ÁáÅ?¥Íº∂???Í≤∏Î´ñ?????ÎÆ???Ôßê„Ö∫????´Íø∏?°‰ª•? ??®ÏÄ™Ìê®??ÎΩ∞ÎßÑ??
    // grounded ??? ??ÎΩ?ê£(grid > slope > scene flag)?? ???âÎµ¨.
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
    if (state === 'jump' || state === 'fall' || state === 'climb') {
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

    // Erda atlas ?Ë¢Å‚ë•?????´ÎîÖÎπçÁ≠åÎ°´ÎóÑ?????grounded ?????idle/jump ?Ë¢Å„Çå??
    this.updateErdaAnimation(dt);
    // Slash FX ????Ê∫?È§ìŒªÏµê?????Ï∂??Ë¢Å‚ë•????∂ÏèÑ??? ?Ë¢Å‚ë•???????Ïß????.
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
    // ??§Î≤äÂ§???????∂Ïéõ????∂ÏèÖ≈ä?????Íæ©Ìç¢ È§ìŒ∫Ïë¥???Ë¢Å‚ë∏?ãÊè∂?ÖÏ??∑Î∞ü???æÎ°ÆÎπ????úÎñØ?°„ÇÖÏπ?
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

  private getPlayerCollisionRect(): { x: number; y: number; width: number; height: number } {
    const colOffX = (this.width - this.collisionW) / 2;
    const colOffY = this.height - this.collisionH;
    return {
      x: this.x + colOffX,
      y: this.y + colOffY,
      width: this.collisionW,
      height: this.collisionH,
    };
  }

  private isTouchingLadder(): boolean {
    const rect = this.getPlayerCollisionRect();
    return isOnLadder(rect.x, rect.y, rect.width, rect.height, this.roomData);
  }

  private getCurrentLadderCenterX(): number | null {
    const rect = this.getPlayerCollisionRect();
    const col = Math.floor((rect.x + rect.width / 2) / 16);
    const top = Math.floor((rect.y + 2) / 16);
    const bottom = Math.floor((rect.y + rect.height - 3) / 16);
    for (let row = top; row <= bottom; row++) {
      if (this.roomData[row]?.[col] === TILE_LADDER) return col * 16 + 8;
    }
    return null;
  }

  private canEnterClimb(): boolean {
    if (this.isLifting || this.flaskCasting || this.fsm.currentState === 'hit' || this.fsm.currentState === 'death') {
      return false;
    }
    return this.isPlayerInputDown(GameAction.LOOK_UP) && this.isTouchingLadder();
  }

  private startClimb(): void {
    this.vx = 0;
    this.vy = 0;
    this.grounded = false;
    this.wallSliding = false;
    this.touchingWallDir = 0;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.varJumpTimer = 0;
    this.doubleJumpAvailable = true;
    this.airDashAvailable = true;
    this.ladderCenterX = this.getCurrentLadderCenterX();
    this.moveRemainderX = 0;
    this.moveRemainderY = 0;
  }

  private stateClimb(dt: number): void {
    if (!this.isTouchingLadder()) {
      this.fsm.transition(this.grounded ? this.getGroundMovementState() : 'fall');
      return;
    }

    if (this.isPlayerInputJustPressed(GameAction.JUMP) && this.fsm.currentState !== 'climb') {
      this.startJumpMotion(JUMP_VELOCITY * 0.85);
      this._justJumpedGround = true;
      SFX.play('jump', 0, { speed: 0.95 + Math.random() * 0.1 });
      return;
    }

    const inputX = this.getHorizontalInputDirection();
    const inputY = (this.isPlayerInputDown(GameAction.LOOK_UP) ? -1 : 0)
      + (this.isPlayerInputDown(GameAction.LOOK_DOWN) ? 1 : 0);
    if (inputX !== 0 && inputY === 0) {
      this.vx = inputX * CLIMB_STEP_OFF_SPEED;
      this.vy = 0;
      this.fsm.transition(this.grounded ? this.getGroundMovementState() : 'fall');
      return;
    }

    this.vx = 0;
    this.vy = inputY * CLIMB_SPEED;
    const centerX = this.ladderCenterX ?? this.getCurrentLadderCenterX();
    if (centerX !== null) {
      const desiredX = centerX - this.width / 2;
      this.x += (desiredX - this.x) * Math.min(1, CLIMB_CENTER_LERP * dt / 16.67);
    }
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
        // ??∫Ïñ©????íÍ≥ï????speed ??Íæ©Ìç¢ ??Ï•??µÏπ∞?(??ÍπäÎíÑ ?? ??Á≠å‚ñ≥Î´Ä???
        SFX.play('jump', 0, { speed: 1.1 });
        return true;
      }
      this.jumpBufferTimer = 0;
      this.coyoteTimer = 0;
      // VFX: ground takeoff event (only fires for grounded jump ??coyote counts)
      this._justJumpedGround = true;
      // Á≠åÏôñ?Á≠???íÍ≥ï????speed 0.95~1.05 ??úÎòª???(??Œ≤??èÏóê?? ?∂ÏèÖ≈ä??.
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
      // ?Î¨ÖÎ´Ç??Ë¢? dash ??´ÍµùÔß???ÎΩ∞Ï†é????ÎΩ∞ÏÇÇ ??FSM dash.exit ????????? Á≠åÔΩåÍº??
    } else {
      this.airDashAvailable = false;
    }
    // ????sound ??speed 0.95~1.05 ??úÎòª???(?ÑÏèÜÍº??Ï≤???.
    SFX.play('dash', 0, { speed: 0.95 + Math.random() * 0.1 });
    rumbleGamepad(45, 0.15, 0.35);
    this.dashTimer = DASH_DURATION;
    // ??????´ÎîÖ?Ä 3?Ë¢Å‚ë•???50ms) ???æÌçô ??stateDash ????????????ÑÏéªÎ´öÂ†â??Ôßê„Öº????dashSpeed ??£ÎÅá??
    this.dashFreezeTimer = DASH_FREEZE_MS;
    // Variable jump ????????????Î∫§Ï®Æ ?????®ÏÄ¨Îµ• ??íÍ≥ï????®Î™ÉÎ±????úÎñØ? ??Á≠åÏï∏Îß????´ÍµùÔß?
    this.varJumpTimer = 0;

    if (this.isPlayerInputDown(GameAction.MOVE_RIGHT)) this.dashDirX = 1;
    else if (this.isPlayerInputDown(GameAction.MOVE_LEFT)) this.dashDirX = -1;
    else this.dashDirX = this.facingRight ? 1 : -1;

    // ???æÌçô ??åÎçâ?????àÌàß?? ?Ôß?. ?ÑÏéªÎ´öÂ†â?? freeze ??Í≥∏Ï†´ ??Î≥?ç¢ ??Ê∫??
    this.vx = 0;
    this.vy = 0;

    // VFX: dash start event (consumed by scene for boost puff)
    this._justDashed = true;
    this._dashDir = this.dashDirX;
  }

  private stateDash(dt: number): void {
    // Freeze ??åÎçâ?????ÑÏéªÎ´öÂ†â?Ï≠????∞Îªª????Ê∫?? ?????? Á≠åÎ°´???
    if (this.dashFreezeTimer > 0) {
      this.dashFreezeTimer -= dt;
        if (this.isPlayerInputDown(GameAction.MOVE_RIGHT)) this.dashDirX = 1;
      else if (this.isPlayerInputDown(GameAction.MOVE_LEFT)) this.dashDirX = -1;
      // ???ÜÏ†æ ??Í≥∏Î™µÁ≠??´Íø∏???dashDirX ??? (startDash ?????facing ?´Íø∏?°ËÄ????±Ï†ü).
      this.vx = 0;
      this.vy = 0;
      if (this.dashFreezeTimer <= 0) {
        // Freeze ??Í≥∏Ï†´ ?????±Ï†´ ???????úÏ¶≤ ??£ÎÅá??
        const dashSpeed = (DASH_DISTANCE / (DASH_DURATION / 1000)) * this.getCyroMoveMultiplier();
        this.vx = this.dashDirX * dashSpeed;
        this.vy = 0;
        this._dashDir = this.dashDirX; // VFX ?????(?ÑÏéªÎ´öÂ†â??∞Í∂∞??éÍªã?•Áî±???????±Î≤â)
      }
      return;
    }

    this.dashTimer -= dt;
    if (this.dashTimer <= 0) {
      this.vx = this.dashDirX * MOVE_SPEED * 0.5 * this.getCyroMoveMultiplier();
      // groundDashDelayTimer ??FSM dash.exit ????????? Á≠åÔΩåÍº??(È§ìŒªÏµé???éÍªã?•‰ª•???£ÎÅá??.
      if (this.grounded) {
        this.fsm.transition(this.getGroundMovementState());
      } else {
        // Á≠åÏôñ???????? ??§Î≤äÂ§???????Î©∏ÌÖ¢???†Îä∫ ??§Î≤äÂ§?????Î∫£Ï¶≤ ???Ï∂???ledge-drop ??®ÏÄ´Îáµ ?ÑÏéªÎ´?.
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
    const timeline = getPlayerAttackTimeline(this.comboIndex, this.grounded);
    const attackRange = this.getAttackRangeForTimeline(timeline);
    // Capture per-swing time scale = global slow-down ??(1 / weapon atkSpeed)
    // ??per-combo-step multiplier ("??ÍπÖÎ?-??: 3?? drawn out).
    const def = this.getEquippedWeaponDef();
    const wSpeed = def.atkSpeed > 0 ? def.atkSpeed : 1.0;
    const stepMul = COMBO_STEP_TIME_MUL[this.comboIndex] ?? 1.0;
    this.currentAttackTimeScale = (ATTACK_TIME_SCALE / wSpeed) * stepMul;
    this.currentAttackTimeline = timeline;
    this.attackElapsedMs = 0;
    this.attackVisualTotalMs = timeline.visualTotalMs === 'auto'
      ? this.getErdaRangeDurationMs(attackRange)
      : Math.max(1, timeline.visualTotalMs);
    this.attackHitStartMs = this.getErdaFrameMarkerStartMs(attackRange, timeline.hitStartFrame);
    this.attackHitEndMs = Math.max(this.attackHitStartMs + 1, this.getErdaFrameMarkerEndMs(attackRange, timeline.hitEndFrame));
    this.attackFxMs = this.getErdaFrameMarkerStartMs(attackRange, timeline.fxFrame);
    this.attackCancelStartMs = this.getErdaFrameMarkerStartMs(attackRange, timeline.cancelStartFrame);
    this.attackCancelEndMs = Math.max(this.attackCancelStartMs, this.getErdaFrameMarkerEndMs(attackRange, timeline.cancelEndFrame));
    this.attackMoveLockEndMs = this.getErdaFrameMarkerEndMs(attackRange, timeline.moveLockEndFrame);
    this.attackLungeStartMs = this.getErdaFrameMarkerStartMs(attackRange, timeline.lungeStartFrame);
    this.attackLungeEndMs = Math.max(this.attackLungeStartMs, this.getErdaFrameMarkerStartMs(attackRange, timeline.lungeEndFrame));
    this.attackTimer = this.attackVisualTotalMs;
    this.attackActive = false;
    this.attackHasActivated = false;
    this.attackFxTriggered = false;
    this.attackLungeRemainingPx = 0;
    this.attackLungeSpeedPxPerMs = 0;
    this.attackHitRecoilMs = 0;
    this.attackHitRecoilVx = 0;
    this.attackQueued = false;
    const lungePx = Math.max(0, step.lungePx) * (this.grounded ? 1 : AERIAL_ATTACK_LUNGE_MULT);
    this.attackLungeRemainingPx = lungePx;
    this.attackLungeSpeedPxPerMs = lungePx / Math.max(1, this.attackLungeEndMs - this.attackLungeStartMs);
    this.attackLungeDir = this.facingRight ? 1 : -1;
    this.hitList.clear();
    this.comboWindowTimer = 0;

    // Swing whoosh ??every attack swing (hit ???ÎÆ?miss ??úÎñØ?).
    // comboIndex 0/1/2 ??whoosh_01/02/03 ?????(Sfx.ASSET_BACKED_CUES ?ÑÏèÑ?£ËÇâ??ÔßèÍªä???.
    SFX.play('attack_swing', this.comboIndex);

    // Show attack hitbox visual
    this.attackSprite.visible = false;
    if (this.slashSprite) this.slashSprite.visible = false;
    this.slashToIdx = -1;
    // Slash FX ??comboIndex ????Î≥•Ï†É/?????
  }

  private stateAttack(dt: number): void {
    // Gravity already applied in update() before state dispatch ??no double gravity

    // 2???? pause ??hold the player in 'attack' state (air stall stays active
    // because comboIndex is already 2) without ticking attack/hitbox logic.
    // When the countdown elapses, fire startAttack() to begin 3??.
    if (this.preAttackDelay > 0) {
      this.preAttackDelay -= dt;
      if (this.preAttackDelay <= 0) {
        this.preAttackDelay = 0;
        this.startAttack();
      }
      return;
    }

    this.attackElapsedMs += dt;
    this.attackTimer = Math.max(0, this.attackVisualTotalMs - this.attackElapsedMs);

    const step = COMBO_STEPS[this.comboIndex];
    const timeline = this.currentAttackTimeline ?? getPlayerAttackTimeline(this.comboIndex, this.grounded);
    const elapsedMs = this.attackElapsedMs;
    if (elapsedMs >= this.attackLungeStartMs && elapsedMs < this.attackLungeEndMs) {
      this.applyAttackLunge(dt);
    } else if (elapsedMs < this.attackMoveLockEndMs) {
      this.vx = 0;
    }

    if (!this.attackFxTriggered && elapsedMs >= this.attackFxMs) {
      this.attackFxTriggered = true;
      this.triggerSlash(this.comboIndex);
    }

    if (!this.attackHasActivated && elapsedMs >= this.attackHitStartMs) {
      this.attackHasActivated = true;
      this.attackActive = true;
      this.updateAttackVisual();
    }

    // Deactivate hitbox after active frames
    if (this.attackHasActivated && elapsedMs >= this.attackHitEndMs) {
      this.attackActive = false;
      this.attackSprite.visible = false;
    }

    if (this.attackQueued && this.comboIndex < 2 && elapsedMs >= this.attackCancelStartMs && elapsedMs <= this.attackCancelEndMs) {
      this.attackActive = false;
      this.attackHasActivated = false;
      this.comboIndex++;
      this.attackQueued = false;
      if (this.comboIndex === 2) {
        const nextTimeline = getPlayerAttackTimeline(this.comboIndex, this.grounded);
        this.preAttackDelay = Math.max(0, nextTimeline.preDelayMs || COMBO_3_PRE_DELAY_MS);
      } else {
        this.startAttack();
      }
      return;
    }

    if (!this.attackQueued && elapsedMs >= this.attackCancelStartMs && elapsedMs <= this.attackCancelEndMs) {
      const wantsMovement = this.grounded
        ? this.getHorizontalInputDirection() !== 0
        : (
          this.getHorizontalInputDirection() !== 0
          || this.isPlayerInputJustPressed(GameAction.JUMP)
          || this.isPlayerInputJustPressed(GameAction.DASH)
        );
      if (wantsMovement) {
        this.attackActive = false;
        this.attackHasActivated = false;
        this.attackVisualReleased = true;
        this.erdaAnim = this.grounded ? this.getGroundMovementState() : 'air';
        this.erdaAnimFrame = 0;
        this.erdaAnimTimer = 0;
        this.hideAttackWeapon();
        this.attackSprite.visible = false;
        if (this.comboIndex >= 2) {
          this.endLagTimer = Math.max(0, timeline.endLagMs || COMBO3_END_LAG);
          this.comboIndex = 0;
        } else {
          this.comboIndex++;
          this.comboWindowTimer = Math.max(0, timeline.comboWindowMs || COMBO_WINDOW);
        }
        this.fsm.transition(this.grounded ? this.getGroundMovementState() : 'fall');
        return;
      }
    }

    // Attack animation finished
    if (elapsedMs >= this.attackVisualTotalMs) {
      this.attackActive = false;
      this.attackHasActivated = false;

      if (this.attackQueued && this.comboIndex < 2) {
        // Next combo step
        this.comboIndex++;
        this.attackQueued = false;
        if (this.comboIndex === 2) {
          // 2?? ??3??: insert "??ÍπÖÎ?(???? pause. stateAttack will fire
          // startAttack() once the delay countdown reaches 0.
          const nextTimeline = getPlayerAttackTimeline(this.comboIndex, this.grounded);
          this.preAttackDelay = Math.max(0, nextTimeline.preDelayMs || COMBO_3_PRE_DELAY_MS);
        } else {
          this.startAttack();
        }
        return;
      }

      // Attack done ??set combo window or end lag
      if (this.comboIndex >= 2) {
        // 3?? finished ??end lag
        this.endLagTimer = Math.max(0, timeline.endLagMs || COMBO3_END_LAG);
        this.comboIndex = 0;
      } else {
        // 1?? or 2?? ??combo window
        this.comboIndex++;
        this.comboWindowTimer = Math.max(0, timeline.comboWindowMs || COMBO_WINDOW);
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
    this.attackFxTriggered = false;
    this.attackVisualReleased = false;
    this.attackElapsedMs = 0;
    this.attackVisualTotalMs = 0;
    this.currentAttackTimeline = null;
    this.attackLungeRemainingPx = 0;
    this.attackLungeSpeedPxPerMs = 0;
    this.attackHitRecoilMs = 0;
    this.attackHitRecoilVx = 0;
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
    this.attackHitRecoilMs = 0;
    this.attackHitRecoilVx = 0;
    this.attackQueued = false;
    this.attackTimer = 0;
    this.attackElapsedMs = 0;
    this.attackVisualTotalMs = 0;
    this.currentAttackTimeline = null;
    this.attackFxTriggered = false;
    this.attackVisualReleased = false;
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

  onAttackHitRecoil(dirX: number, targetKnockbackX: number, heavy: boolean): void {
    this.attackLungeRemainingPx = 0;
    this.attackLungeSpeedPxPerMs = 0;
    this.attackHitRecoilMs = heavy ? 100 : 75;
    this.attackHitRecoilVx = -dirX * Math.max(15, targetKnockbackX * (heavy ? 0.06875 : 0.05625));
  }

  private moveAttackLungeBy(moveX: number): void {
    if (moveX === 0) return;
    const colOffX = (this.width - this.collisionW) / 2;
    const colOffY = this.height - this.collisionH;
    const physX = this.x + colOffX;
    const physY = this.y + colOffY;
    const slopeEligible = this.grounded || this.vy >= 0;
    const slopeSnapPx = SLOPE_2X1_GROUND_SNAP_PX;

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

    if (rx.collided && !rx.onSlope) {
      const correctedY = tryLedgeSnap(
        physX, physY, this.collisionW, this.collisionH,
        moveX, this.roomData, LEDGE_TOLERANCE,
      );
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
    if (rx.collided) {
      this.attackLungeRemainingPx = 0;
      this.attackLungeSpeedPxPerMs = 0;
    }
  }

  private applyAttackLunge(dt: number): void {
    if (this.attackHitRecoilMs > 0) {
      this.attackHitRecoilMs = Math.max(0, this.attackHitRecoilMs - dt);
      this.vx = this.attackHitRecoilVx;
      if (this.attackHitRecoilMs <= 0) this.attackHitRecoilVx = 0;
      return;
    }
    if (this.attackLungeRemainingPx <= 0 || dt <= 0) {
      return;
    }
    const movePx = Math.min(this.attackLungeRemainingPx, this.attackLungeSpeedPxPerMs * dt);
    this.attackLungeRemainingPx -= movePx;
    this.moveAttackLungeBy(this.attackLungeDir * movePx);
  }

  private canCancelAttackToDash(): boolean {
    if (this.preAttackDelay > 0) return false;
    if (!this.currentAttackTimeline) return false;
    const elapsedMs = this.attackElapsedMs;
    if (elapsedMs < this.attackCancelStartMs) return false;
    if (elapsedMs > this.attackCancelEndMs) return false;
    return true;
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
   * Debug: ?ÑÏèÜÎÆÜËÄ?feetRow) ?????±Î±Ω ?üÎ∞∏Ï±???ÎΩ?ì†????Î¨êÌÉ£??"col,row=tileId" Á≠åÎ§¥Î´ñ‰ª•??Í≥óÏ®Æ ?ÑÏèÜÍº??
   * groundSource==='grid' ?????????????ÍπÜÎµ† ??´ÎîÜÎª†ÁáÅ?¥Íº∂????? ??Î™Ö¬Ä??
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
    // ???ÖÎ±ú?ÑÏèÖÎ≤????∫Ïñ†?îÂüü??ÑÏèÖÎ≤???Debug.visible ??true ?????Ï∂???ÎΩ?ªª.
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
   * Erda ???àÎäÑ??ÍπÜÎµ†?????¨Áå∑?ÑÎ¨æ??•‚â™ÎÆÜË´≠?
   * ??????Î¥î¬Ä?????àÎ±ú??Í≥åÏæø ???àÏÜ≠ ??fallback ?? ?´Íø∏????Ë´?ÄÊ∫?placeholder ???.
   */
  private loadErdaSprite(): void {
    const path = assetPath('assets/characters/erda_atlas.png');
    Assets.load(path).then((tex: Texture) => {
      if (this.container.destroyed) return;
      // pixel-perfect ???ÖÎöØ?? ???øÎÆû??à¬Ä?????Îµ?Ë¢Å‚ë•Îµ??worldRT nearest)????ÍπäÎíÑ.
      tex.source.scaleMode = 'nearest';

      // Atlas ranges are resolved from erda_atlas.json frameTags when available.
      // Fallback constants below match the current exported strip.
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
      // ??È§ìŒªÏµê???´Íø∏??: ???ÖÎ±ú?ÑÏèÖÎ≤??14??4) ????Î°´Îºä È§ìŒªÏµê??????àÎäÑ??ÍπÜÎµ†?????Î¨??Ê§∞Íæ®???
      // 32??2 ???àÎäÑ??ÍπÜÎµ†?Ôß? ?ÑÏèÖÎ≤??àÌâ™?????∂Ïéõ???18px, ?ÔßèÍªãÏ®?8px ??£ÎÅâ???ÑÏèÖ?ΩËáæ??Í≥óÏ®Æ ???Ï£??Î•ÅÍ∏æ (??Î°´Ï¶≤).
      s.anchor.set(0.5, 1);
      s.x = this.width / 2;
      s.y = this.height;
      // attackSprite / flashOverlay ?∞Í∑£????Ë¢Å‚ë•????Ëπ??????ÖÎ±ú?ÑÏèÖÎ≤????∫Ïñ†?îÂüü????¥Ïíî???±Îµ†???∂Ïéõ??Í∑? ???ÖÏ¶≤??
      const weaponIdx = this.weaponSprite ? this.container.getChildIndex(this.weaponSprite) : -1;
      this.container.addChildAt(s, weaponIdx >= 0 ? weaponIdx + 1 : 0);
      this.erdaSprite = s;
      this.sprite.visible = false; // placeholder off.
    }).catch(() => {
      // ?•‚â™ÎÆÜË´≠????àÏÜ≠ ??placeholder ???.
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
        frames?: Array<{ duration?: number }> | Record<string, { duration?: number }>;
        meta?: {
          frameTags?: Array<{ name?: string; from?: number; to?: number }>;
          slices?: Array<{
            name?: string;
            keys?: Array<{
              bounds?: { x: number; y: number; w?: number; h?: number };
              pivot?: { x: number; y: number };
            }>;
          }>;
        };
      } | null) => {
        this.erdaFrameDurationsMs = this.readAsepriteFrameDurations(json?.frames);
        this.erdaFrameTags = this.readAsepriteFrameTags(json?.meta?.frameTags);
        if (!json?.meta?.slices) return;

        const posesByFrame = new Map(this.attackWeaponPoseByFrame);
        for (const slice of json.meta.slices) {
          const match = /^weapon_(\d+)_r(-?\d+)_s(\d+)(?:_z(front|back|f|b))?$/i.exec(slice.name ?? '');
          const key = slice.keys?.[0];
          if (!match || !key?.bounds) continue;

          const frameNo = Number(match[1]);
          if (!Number.isFinite(frameNo)) continue;
          posesByFrame.set(frameNo, {
            x: key.bounds.x + (key.pivot?.x ?? Math.floor((key.bounds.w ?? 1) / 2)),
            y: key.bounds.y + (key.pivot?.y ?? Math.floor((key.bounds.h ?? 1) / 2)),
            rotation: Number(match[2]) * Math.PI / 180 + WEAPON_ICON_BASE_ROTATION,
            scale: Number(match[3]) / 100,
            drawOrder: match[4]?.toLowerCase().startsWith('b') ? 'back' : 'front',
          });
        }
        this.attackWeaponPoseByFrame = posesByFrame;
      })
      .catch(() => {
        // Fall back to ATTACK_WEAPON_POSES when slice metadata is unavailable.
      });
  }

  private readAsepriteFrameTags(tags: Array<{ name?: string; from?: number; to?: number }> | undefined): Map<string, ErdaFrameRange> {
    const ranges = new Map<string, ErdaFrameRange>();
    for (const tag of tags ?? []) {
      const name = tag.name;
      const from = Number(tag.from);
      const to = Number(tag.to);
      if (!name || !Number.isFinite(from) || !Number.isFinite(to)) continue;
      const a = Math.max(0, Math.floor(Math.min(from, to)));
      const b = Math.max(0, Math.floor(Math.max(from, to)));
      ranges.set(name, { from: a, to: b, count: b - a + 1 });
    }
    return ranges;
  }

  private getErdaFrameRange(tagName: string, fallbackFrom: number, fallbackCount: number): ErdaFrameRange {
    const tagged = this.erdaFrameTags.get(tagName);
    if (tagged && tagged.count > 0) return tagged;
    const count = Math.max(1, fallbackCount);
    return { from: fallbackFrom, to: fallbackFrom + count - 1, count };
  }

  private hasErdaFrameRange(range: ErdaFrameRange): boolean {
    return this.erdaFrames.length > range.from;
  }

  private getCurrentErdaAttackRange(): ErdaFrameRange {
    if (!this.grounded) {
      return this.getErdaFrameRange('attack_air', ERDA_ATTACK_AIR_START, ERDA_ATTACK_AIR_FRAME_COUNT);
    }
    if (this.comboIndex === 2) {
      return this.getErdaFrameRange('attack2', ERDA_ATTACK2_GROUND_START, ERDA_ATTACK_GROUND_FRAME_COUNT);
    }
    return this.getErdaFrameRange('attack1', ERDA_ATTACK_GROUND_START, ERDA_ATTACK_GROUND_FRAME_COUNT);
  }

  private getAttackWeaponPose(frameIdx: number): AttackWeaponPose | null {
    const exact = this.attackWeaponPoseByFrame.get(frameIdx);
    if (exact) return exact;
    return null;
  }

  private readAsepriteFrameDurations(frames: Array<{ duration?: number }> | Record<string, { duration?: number }> | undefined): number[] {
    if (!frames) return [];
    const entries = Array.isArray(frames) ? frames : Object.values(frames);
    return entries.map(frame => {
      const duration = Number(frame?.duration);
      return Number.isFinite(duration) && duration > 0 ? duration : 0;
    });
  }

  private getErdaFrameDurationMs(frameIdx: number, fallbackMs: number): number {
    const duration = this.erdaFrameDurationsMs[frameIdx];
    return Number.isFinite(duration) && duration > 0 ? duration : fallbackMs;
  }

  private getErdaFrameByDurationProgress(range: ErdaFrameRange, progress: number, reverse: boolean): number {
    const availableCount = Math.max(1, Math.min(range.count, Math.max(1, this.erdaFrames.length - range.from)));
    const durations: number[] = [];
    let totalDuration = 0;
    for (let i = 0; i < availableCount; i++) {
      const frameIdx = range.from + i;
      const duration = this.erdaFrameDurationsMs[frameIdx];
      if (!Number.isFinite(duration) || duration <= 0) {
        totalDuration = 0;
        break;
      }
      durations.push(duration);
      totalDuration += duration;
    }

    if (totalDuration <= 0 || durations.length !== availableCount) {
      const forwardIdx = Math.min(availableCount - 1, Math.floor(progress * availableCount));
      const idx = reverse ? availableCount - 1 - forwardIdx : forwardIdx;
      return Math.max(0, Math.min(this.erdaFrames.length - 1, range.from + idx));
    }

    const normalizedProgress = reverse ? 1 - progress : progress;
    const cursor = Math.max(0, Math.min(totalDuration - 0.0001, normalizedProgress * totalDuration));
    let acc = 0;
    for (let i = 0; i < availableCount; i++) {
      acc += durations[i];
      if (cursor < acc) {
        return Math.max(0, Math.min(this.erdaFrames.length - 1, range.from + i));
      }
    }
    return Math.max(0, Math.min(this.erdaFrames.length - 1, range.from + availableCount - 1));
  }

  private getErdaRangeDurationMs(range: ErdaFrameRange): number {
    const availableCount = Math.max(1, Math.min(range.count, Math.max(1, this.erdaFrames.length - range.from)));
    let total = 0;
    for (let i = 0; i < availableCount; i++) {
      total += this.getErdaFrameDurationMs(range.from + i, 100);
    }
    return Math.max(1, total);
  }

  private getErdaFrameMarkerStartMs(range: ErdaFrameRange, frame: number): number {
    const availableCount = Math.max(1, Math.min(range.count, Math.max(1, this.erdaFrames.length - range.from)));
    const clampedFrame = Math.max(0, Math.min(availableCount - 1, Math.floor(frame)));
    let ms = 0;
    for (let i = 0; i < clampedFrame; i++) {
      ms += this.getErdaFrameDurationMs(range.from + i, 100);
    }
    return ms;
  }

  private getErdaFrameMarkerEndMs(range: ErdaFrameRange, frame: number): number {
    const availableCount = Math.max(1, Math.min(range.count, Math.max(1, this.erdaFrames.length - range.from)));
    const clampedFrame = Math.max(0, Math.min(availableCount - 1, Math.floor(frame)));
    return this.getErdaFrameMarkerStartMs(range, clampedFrame)
      + this.getErdaFrameDurationMs(range.from + clampedFrame, 100);
  }

  private getAttackRangeForTimeline(timeline: PlayerAttackTimeline): ErdaFrameRange {
    if (timeline.animTag === 'attack2') {
      return this.getErdaFrameRange('attack2', ERDA_ATTACK2_GROUND_START, ERDA_ATTACK_GROUND_FRAME_COUNT);
    }
    if (timeline.animTag === 'attack_air') {
      return this.getErdaFrameRange('attack_air', ERDA_ATTACK_AIR_START, ERDA_ATTACK_AIR_FRAME_COUNT);
    }
    return this.getErdaFrameRange(timeline.animTag, ERDA_ATTACK_GROUND_START, ERDA_ATTACK_GROUND_FRAME_COUNT);
  }

  private getAttackFrameAtElapsedMs(range: ErdaFrameRange, elapsedMs: number, reverse: boolean): number {
    const total = this.getErdaRangeDurationMs(range);
    const progress = Math.max(0, Math.min(0.9999, elapsedMs / total));
    return this.getErdaFrameByDurationProgress(range, progress, reverse);
  }

  private applyWakeUpFrame(frame: number): void {
    if (!this.erdaSprite) return;
    const range = this.getErdaFrameRange('wake_up', ERDA_WAKE_UP_START, ERDA_WAKE_UP_FRAME_COUNT);
    const frameCount = Math.min(range.count, Math.max(0, this.erdaFrames.length - range.from));
    if (frameCount > 0) {
      const idx = Math.max(0, Math.min(frameCount - 1, frame));
      this.erdaSprite.texture = this.erdaFrames[range.from + idx];
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

    const pose = this.getAttackWeaponPose(frameIdx);
    if (!pose) {
      s.visible = false;
      return;
    }
    const erdaLocalX = this.width / 2;
    const erdaLocalY = this.height;
    const erdaFrameW = ERDA_FRAME_W;
    const erdaFrameH = ERDA_FRAME_H;
    if (this.erdaSprite && !this.erdaSprite.destroyed && s.parent === this.container) {
      const erdaIdx = this.container.getChildIndex(this.erdaSprite);
      const weaponIdx = this.container.getChildIndex(s);
      const targetIdx = pose.drawOrder === 'back'
        ? Math.max(0, erdaIdx)
        : Math.min(this.container.children.length - 1, erdaIdx + 1);
      if (weaponIdx !== targetIdx) this.container.setChildIndex(s, targetIdx);
    }
    s.visible = true;
    s.x = this.facingRight
      ? erdaLocalX - erdaFrameW / 2 + pose.x
      : erdaLocalX + erdaFrameW / 2 - pose.x;
    s.y = erdaLocalY - erdaFrameH + pose.y;
    s.rotation = this.facingRight ? pose.rotation : -pose.rotation;
    s.scale.set(this.facingRight ? pose.scale : -pose.scale, pose.scale);
  }

  /**
   * Slash FX ?Ë¢???ÍπÖÎÆû ???¨Áå∑?ÑÎ¨æ??•‚â™ÎÆÜË´≠? 6 ?Ë¢Å‚ë•???32??2), ??ŒºÎµ?source ??§Î≤ä??.
   * ??Ê∫?? startAttack() ?????triggerSlash(comboIndex) ????ÎΩ∞ÏÇÇ, updateSlashFX() ?∂Ïéõ? ?Ë¢Å‚ë•???Á≠åÏöä?µÔßë?
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
      // ???Î¨? ?∂Ïéõ???È§ìŒªÏµê??0.5) + ?ÔßèÍªãÏ®?È§ìŒªÏµê??0.5) ????????Í≥∑ÏÑ† ?Ë™ò„ÇåÎµ?È§ìŒªÏµê???Á≠åÎùø????ÑÏèÑ???
      s.anchor.set(0, 0);
      s.visible = false;
      // attackSprite ????∫Ïñ†?îÂüü??ÑÏèÖÎ≤?????????≥Ï¶≤???üÎ∞∏Ï±∂Ê∫ê??Í≥ïÎñΩ?.
      this.container.addChild(s);
      this.slashSprite = s;
    }).catch(() => {
      // ???àÏÜ≠ ??FX Á≠???Î™ÑÏÖΩ. ?Ë¢Å„Çã??????????®Î∞∏????Í≥∏Î≤â.
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
   * ?Íæ†ÎÅá?????à¬Ä???slash FX ?ÔßèÍ∫øÎ¥∫Ê§∞? ???àÏùÉ SSoT:
   *   - ??§Î????????  COMBO_STEPS[step] ??attackHitboxMul
   *   - ??Î≥?çü FX:    resolveComboFx(equippedWeaponType, equippedRarity, step)
   *     ??? L1 sprite/scale/offset/color: Content_FX_WeaponType.csv
   *     ??? L2 tint:                     Content_Rarity.csv FxTint
   *
   * FxScaleX/Y ????úÎñØ??hitbox ?ÑÏèÑ???™¬Ä???®Î∫£Ïß? FX ???????§Î????ïÍ≥ï????????.
   */
  private triggerSlash(comboIndex: number): void {
    if (!PLAYER_SLASH_FX_ENABLED) return;
    if (!this.slashSprite || this.slashFrames.length === 0) return;
    const step = this.getAttackStep(comboIndex);
    if (!step) return;
    const s = this.slashSprite;

    // FX: type(L1) + rarity tint(L2).
    const fx = resolveComboFx(this.equippedWeaponType, this.equippedRarity, comboIndex);
    if (!fx) return;
    const range = FX_SLASH_FRAMES[fx.sprite];
    if (!range) return; // ???????©ÎÆâ ??Î≥•Ï†É ??FX ??Î™ÑÏÖΩ.
    const [from, to] = range;
    if (from < 0 || to < from || to >= this.slashFrames.length) return;

    this.slashFromIdx = from;
    this.slashToIdx = to;
    this.slashFrameIdx = from;
    this.slashTimer = 0;
    this.slashHitboxW = step.hitboxW;
    this.slashOffsetX = fx.offsetX;
    this.slashOffsetY = fx.offsetY;

    // FX ??Î≥?çü ???????§Î????ïÍ≥ï????????.
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
   * Á≠??Ë¢Å‚ë•???slash FX ?Ë¢Å‚ë∫???Ë¢Å‚ë•????∂ÏèÑ??? stateAttack È§ìŒªÏµê?âÎêµÏ≠???? ???±Î≤â.
   * slashToIdx === -1 ???????????
   */
  private updateSlashFX(dt: number): void {
    if (!this.slashSprite || this.slashToIdx < 0) return;
    const s = this.slashSprite;

    // È§ìŒªÏµê??= ???ÖÎ±ú?ÑÏèÖÎ≤??È§ìŒªÏµê??+ FxOffsetX(??´Ïä¶?????Î¥î¬Ä???ÑÏèÜÍº??. Y = ??????Í≥∑ÏÑ† ?Ë™ò„ÇåÎµ?È§ìŒªÏµê??+ FxOffsetY.
    const erdaTopLeftX = this.width / 2 - ERDA_FRAME_W / 2;
    const erdaTopLeftY = this.height - ERDA_FRAME_H;
    s.x = this.facingRight
      ? erdaTopLeftX - SLASH_FX_ERDA_REF_X + this.slashOffsetX
      : erdaTopLeftX + ERDA_FRAME_W + SLASH_FX_ERDA_REF_X - this.slashOffsetX;
    s.y = erdaTopLeftY - SLASH_FX_ERDA_REF_Y + this.slashOffsetY;
    if (s.scale.y < 0) {
      s.y += SLASH_FX_FRAME_H * Math.abs(s.scale.y);
    }
    // ?ÑÏéªÎ´öÂ†â???? (??§Î???È§?facing ???ÑÏèÖ?Ä???Ï∂????Á≠??∞Í∑£?????∂ÏèÑ???.
    const sx = Math.abs(s.scale.x);
    s.scale.x = this.facingRight ? sx : -sx;

    this.slashTimer += dt;
    const slashFrameMs = Player.ANIM_SLASH_FRAME_MS * this.currentAttackTimeScale;
    while (this.slashTimer >= slashFrameMs) {
      this.slashTimer -= slashFrameMs;
      this.slashFrameIdx++;
      if (this.slashFrameIdx > this.slashToIdx) {
        // ??Ê∫??Ë¢Å‚ë•???????.
        s.visible = false;
        this.slashToIdx = -1;
        return;
      }
    }
    s.texture = this.slashFrames[this.slashFrameIdx];
  }

  /**
   * ??´ÎîÖÎπçÁ≠åÎ°´ÎóÑ????∂ÏèÑ???
   *   grounded ?ÁØÄ? ?∂ÏèÖ≈ä? ??takeoff(???Ôß? / land(Á≠å‚ñ≥Î´?) ?ÔßèÍ∫øÎ¥∫Ê§∞?
   *   ????Î∫•Îãè ???à¬Ä??Íæ®Î±ú?∂Ïéõ? ????????????™Ïóê????±Î≤â ???à¬Ä??Íæ®Î±ú??Á≠åÏöä?µÔßë?
   *     idle (loop) ??leave??> takeoff ??80ms??> air ??land edge??> land(6,50ms) ??> land(7,50ms) ??> idle
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
      const wakeUpRange = this.getErdaFrameRange('wake_up', ERDA_WAKE_UP_START, ERDA_WAKE_UP_FRAME_COUNT);
      const frameCount = Math.min(wakeUpRange.count, Math.max(0, this.erdaFrames.length - wakeUpRange.from));
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

    // Dash ??®ÏÄ™Ìê® ??FSM state === 'dash' Á≠åÏöä????ÁØÄ?????´ÎîÖÎπçÁ≠åÎ°´ÎóÑ????Í∑êÎîÖ??
    // dash È§ìŒªÏµê??grounded ?ÁØÄ?(takeoff/land) ?Ë¢Å‚ëπÎµ??Ê§∞Íæ®????®ÏÄ´ÏÑ† 16??7 ???Ç¬Ä???? ?∞Í∑£???
    const fsmState = this.fsm.currentState;
    if (fsmState === 'climb') {
      this.hideAttackWeapon();
      const climbRange = this.getErdaFrameRange('climb', 5, 1);
      if (this.erdaAnim !== 'climb') {
        this.erdaAnim = 'climb';
        this.erdaAnimFrame = 0;
        this.erdaAnimTimer = 0;
      }
      if (this.hasErdaFrameRange(climbRange)) {
        const moving = Math.abs(this.vy) > 1;
        if (moving && climbRange.count > 1) {
          const frameMs = Math.max(60, 130 - Math.min(70, Math.abs(this.vy) * 0.12));
          this.erdaAnimTimer += dt;
          while (this.erdaAnimTimer >= frameMs) {
            this.erdaAnimTimer -= frameMs;
            this.erdaAnimFrame = (this.erdaAnimFrame + 1) % climbRange.count;
          }
        } else {
          this.erdaAnimFrame = 0;
          this.erdaAnimTimer = 0;
        }
        const climbFrame = Math.min(climbRange.from + this.erdaAnimFrame, this.erdaFrames.length - 1);
        this.erdaSprite.texture = this.erdaFrames[climbFrame];
      } else {
        this.erdaSprite.texture = this.erdaFrames[Math.min(5, this.erdaFrames.length - 1)];
      }
      this.erdaPrevGrounded = false;
      return;
    }

    if (fsmState === 'dash') {
      this.hideAttackWeapon();
      if (this.erdaAnim !== 'dash') {
        this.erdaAnim = 'dash';
        this.erdaAnimFrame = 0;
        this.erdaAnimTimer = 0;
      }
      this.erdaPrevGrounded = this.grounded;
      this.erdaAnimTimer += dt;
      // ?Ë¢Å‚ë•???16 (startup, 30ms) ??17 (linger, 120ms). ??∫ÏößÎß?? dash ??´ÍµùÔß??ÁØÄ?ÁππÎ®Æ?? ???.
      if (this.erdaAnimFrame === 0 && this.erdaAnimTimer >= Player.ANIM_DASH_STARTUP_MS) {
        this.erdaAnimFrame = 1;
        this.erdaAnimTimer = 0;
      }
      this.erdaSprite.texture = this.erdaFrames[16 + this.erdaAnimFrame];
      return;
    }
    if (this.erdaAnim === 'dash') {
      // dash ??´ÍµùÔß???Á≠åÏôñ?Á≠???§Î≤äÂ§????®Î∫§Îµ?idle/run/air ???∞Í∑£Î≤Ä?.
      this.erdaAnim = this.getGroundOrAirAnimationState();
      this.erdaAnimFrame = 0;
      this.erdaAnimTimer = 0;
    }
    if (this.erdaAnim === 'climb') {
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

    // Lift override while carrying a throwable container.
    // Walk cycle when ground locomotion is active; hold frame 35 when stationary.
    // Takes precedence over aim because hands are full.
    const liftRange = this.getErdaFrameRange('lift', ERDA_LIFT_START, 4);
    if (this.isLifting && this.hasErdaFrameRange(liftRange)) {
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
          this.erdaAnimFrame = (this.erdaAnimFrame + 1) % liftRange.count;
        }
      } else {
        this.erdaAnimFrame = 0;
        this.erdaAnimTimer = 0;
      }
      this.erdaSprite.texture = this.erdaFrames[Math.min(liftRange.from + this.erdaAnimFrame, this.erdaFrames.length - 1)];
      this.erdaPrevGrounded = this.grounded;
      return;
    }

    // Aim override while charging an Ego Shard. When ground locomotion is active, cycle the frames
    // as a walk-aim shuffle. When stationary, hold frame 30 (steady aim).
    // Higher priority than idle/run/jump but below dash.
    const aimRange = this.getErdaFrameRange('aim', ERDA_AIM_START, 4);
    if (this.isAiming && this.hasErdaFrameRange(aimRange)) {
      this.hideAttackWeapon();
      if (this.erdaAnim !== 'aim') {
        this.erdaAnim = 'aim';
        this.erdaAnimFrame = 0;
        this.erdaAnimTimer = 0;
      }
      // Mid-air aim ??dedicated `aim_jump` frame. Falls back to the steady
      // aim pose when the atlas hasn't been updated.
      if (!this.grounded) {
        const aimJumpRange = this.getErdaFrameRange('aim_jump', ERDA_AIM_JUMP_FRAME, 1);
        const airIdx = this.hasErdaFrameRange(aimJumpRange)
          ? aimJumpRange.from
          : aimRange.from;
        this.erdaSprite.texture = this.erdaFrames[airIdx];
        this.erdaPrevGrounded = this.grounded;
        return;
      }
      const moving = this.isGroundLocomotionActive();
      if (moving) {
        this.erdaAnimTimer += dt;
        const AIM_WALK_FRAME_MS = 110;   // 4 frames ??110 ??440ms cycle
        while (this.erdaAnimTimer >= AIM_WALK_FRAME_MS) {
          this.erdaAnimTimer -= AIM_WALK_FRAME_MS;
          this.erdaAnimFrame = (this.erdaAnimFrame + 1) % aimRange.count;
        }
      } else {
        this.erdaAnimFrame = 0;
        this.erdaAnimTimer = 0;
      }
      this.erdaSprite.texture = this.erdaFrames[Math.min(aimRange.from + this.erdaAnimFrame, this.erdaFrames.length - 1)];
      this.erdaPrevGrounded = this.grounded;
      return;
    }

    // Attack: each combo step scrubs the current atlas frameTag range from progress.
    // Grounded 1??/2?? use attack1, grounded 3?? uses attack2.
    // Airborne attacks always use attack_air so the finisher does not pop to a ground pose.
    if (fsmState === 'attack') {
      // 2?? pause(preAttackDelay) ???àÌàß Á≠åÏöä???frame + weapon pose hold.
      // attackTimer ?∂Ïéõ? 0 ??????Ë¢Å‚ë•??progress ??£Ïë¥Ê≤??0.9999 ??????frame jump ?ÑÏèÜÎÆáÊ∫ê????∂Ïéõ???Î∫§Ï®Æ Á≠å‚ñ≥Î´Ä??
      if (this.preAttackDelay > 0) {
        const attackRange = this.getCurrentErdaAttackRange();
        this.updateAttackWeaponPose(this.erdaAnimFrame > 0 ? this.erdaAnimFrame : attackRange.from);
        this.erdaPrevGrounded = this.grounded;
        return;
      }
      if (this.erdaAnim !== 'attack') {
        this.erdaAnim = 'attack';
        this.erdaAnimFrame = 0;
        this.erdaAnimTimer = 0;
      }
      this.erdaPrevGrounded = this.grounded;
      const timeline = this.currentAttackTimeline ?? getPlayerAttackTimeline(this.comboIndex, this.grounded);
      const attackRange = this.getAttackRangeForTimeline(timeline);
      const textureIdx = this.getAttackFrameAtElapsedMs(attackRange, this.attackElapsedMs, timeline.reverseAnim);
      this.erdaAnimFrame = textureIdx;
      this.erdaSprite.texture = this.erdaFrames[textureIdx];
      this.updateAttackWeaponPose(textureIdx);
      return;
    }
    // ?Íæ†ÎÅá??hold ??attack ??´ÍµùÔß?Á≠åÏöä????Íæ†ÎÅá?????àÏ¶≤?????ÎÆ?3?? endLag) ???àÌàß Á≠åÎùæ??Á≠?attack
    // frame ??hold ???????????+ weapon pose ???. ???±Î≤â ?Íæ†ÎÅá?????ÜÏ†æ ?????????¥Ïì¶??
    // ???±Î≤â swing ??Í≥óÏ®Æ ??®Îö≠?? ???àÏ¶≤??Á≠åÎùæ??ßù???íÍ≥ï???????Ê∫êÎÜÅÎ™µÂö•?Á≠?????Î°?ä∫ idle ???∞Í∑£Î≤Ä?.
    // ??íÍ≥ï?ÑÂ§∑????ÔΩãÔºê??Îπ≥Ëáæ? hold ÁππÎ?Î™????????Ë¢Å‚ëπÎµ?(fsmState ?∂Ïéõ???.
    if (this.erdaAnim === 'attack'
        && !this.attackVisualReleased
        && (this.comboWindowTimer > 0 || this.endLagTimer > 0)
        && this.grounded
        && (fsmState === 'idle' || fsmState === 'run')) {
      this.updateAttackWeaponPose(this.erdaAnimFrame);
      this.erdaPrevGrounded = this.grounded;
      return;
    }
    if (this.erdaAnim === 'attack') {
      // attack ??´ÍµùÔß???Á≠åÏôñ?Á≠???§Î≤äÂ§????®Î∫§Îµ?idle/run/air ???∞Í∑£Î≤Ä?.
      this.erdaAnim = this.getGroundOrAirAnimationState();
      this.erdaAnimFrame = 0;
      this.erdaAnimTimer = 0;
    }
    this.hideAttackWeapon();

    // ?ÁØÄ? ?∂ÏèÖ≈ä? ??grounded ?∞Í∂∞?????Î≥?ç¢???Ï∂???Î∫•Îãè ???à¬Ä??Íæ®Î±ú ?Ë¢Å‚ëπÎµ?
    if (this.erdaPrevGrounded && !this.grounded) {
      // ???Ôß? vy < 0 = ??íÍ≥ï?????ÜÏ†æ ??takeoff(4) ???Ç¬Ä???
      // vy ??0 = ?ïÍ≥ó??????∞Î¶≠ ????Î∫•Îãè ???à¬Ä??Íæ®Î±ú ?üÎ∞∏Ï±???idle) ???, ?Ë¢Å‚ë•?????Í≥óÏ†ª ??§Î≤äÂ§?????idle ??Â∑??Ôß?.
      this.erdaJumpedOff = this.vy < 0;
      if (this.erdaJumpedOff) {
        this.erdaAnim = 'takeoff';
        this.erdaAnimTimer = 0;
        this.erdaAnimFrame = 0;
      }
    } else if (!this.erdaPrevGrounded && this.grounded) {
      // Á≠å‚ñ≥Î´?. ??íÍ≥ï?????Í≤πÎä∫ 6??, ???∞Î¶≠????Í≤πÎä∫ 7Á≠???Ê∫?
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
        // ?ÑÏèÜÍº?????®ÏÄ™Ìê®: ??´Ïä£????????Ê§∞Íæ®Ï±?Í≥ªÏ≠ñ?land ????Íæ™¬Ä?run ??Í≥óÏ®Æ ??íÍ≥ï???
        // ????Ë¢Å‚ë§ÎÆ????±Î≤â ?Ë¢Å‚ë•???grounded ?ÁØÄ??∂Ïéõ? takeoff ?????Ïß??Ë¢Å‚ëπÎµ???™Î?.
        if (this.isGroundLocomotionActive()) {
          this.erdaAnim = 'run';
          this.erdaAnimFrame = 0;
          this.erdaAnimTimer = 0;
          textureIdx = 8;
          break;
        }
        // sub 0 ???Ë¢Å‚ë•???6, sub 1 ???Ë¢Å‚ë•???7.
        textureIdx = 6 + this.erdaAnimFrame;
        if (this.erdaAnimTimer >= Player.ANIM_LAND_FRAME_MS) {
          this.erdaAnimTimer = 0;
          if (this.erdaAnimFrame === 0) {
            this.erdaAnimFrame = 1;
          } else {
            // Á≠å‚ñ≥Î´? ?∞Í∑£Î≤Ä????´ÍµùÔß???idle ?Î£êÎ´Ç??Á≠åÏöä???
            this.erdaAnim = 'idle';
            this.erdaAnimFrame = 0;
          }
        }
        break;
      }
      case 'run': {
        // Á≠åÏôñ???®Î™ÑÎµ????Ï∂??Ë¢Å‚ë•???Á≠åÏöä?µÔßë????ïÍ≥ó??????∞Î¶≠ È§ìŒªÏµê??Á≠åÎùæ??Á≠?run ?Ë¢Å‚ë•??Ë¢Å‚ëπÎ±???§Î≤äÂ§????????.
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
        // Á≠åÏôñ???®Î™ÑÎµ????Ï∂??Ë¢Å‚ë•???Á≠åÏöä?µÔßë????ïÍ≥ó??????∞Î¶≠ È§ìŒªÏµê???Á≠åÎùæ??Á≠?idle ?Ë¢Å‚ë•??Ë¢Å‚ëπÎ±???§Î≤äÂ§????????.
        if (this.grounded) {
          while (this.erdaAnimTimer >= this.getErdaFrameDurationMs(this.erdaAnimFrame, Player.ANIM_IDLE_FRAME_MS)) {
            this.erdaAnimTimer -= this.getErdaFrameDurationMs(this.erdaAnimFrame, Player.ANIM_IDLE_FRAME_MS);
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

    // ??ÎΩ?âê ??Î≥?çü(Graphics placeholder ???ÎÆ?Sprite) Á≠å„ÄìÏ±∑????ÁππÎ®ØÎÆÜËÄ?????Îµ?????âÎµ¨ ????®Î™É????®Î™Ñ??
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
      // Sprite ??anchor(0.5, 1) ?´Íø∏????????scale.x Á≠????±Ï∂ø??Í≤πÎä∫ È§ìŒªÏµê?????????
      this.erdaSprite.scale.x = this.facingRight ? 1 : -1;
      if (this.weaponSprite?.visible && this.erdaAnim === 'attack') {
        this.updateAttackWeaponPose(this.erdaAnimFrame);
        this.weaponSprite.alpha = this.erdaSprite.alpha;
      }
    } else {
      // Placeholder Graphics ??top-left ?´Íø∏?? ??x ?∞Í∑£????Ë¢Å‚ëπ??(?´Íø∏????•‚â™ÎÆáÂΩõ????).
      this.sprite.scale.x = this.facingRight ? 1 : -1;
      this.sprite.x = this.facingRight ? 0 : this.width;
    }

    // Update attack visual position on flip. Debug ?????È§ìŒªÏµå????Í≥óÎàò?Á≠?Á≠åÏï∏Îß?????.
    this.attackSprite.visible = this.attackActive && Debug.visible;
    if (this.attackSprite.visible) {
      const step = this.getAttackStep(this.comboIndex) ?? COMBO_STEPS[this.comboIndex];
      this.attackSprite.x = this.facingRight ? this.width : -step.hitboxW;
    }
  }
}

