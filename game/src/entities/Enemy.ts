import { BitmapText, Graphics, Sprite } from 'pixi.js';
import { Entity } from './Entity';
import {
  resolveX,
  resolveY,
  resolveXPixelStep,
  resolveYPixelStep,
  resolveXPixelStepWithSlopes2x1,
  resolveYPixelStepWithSlopes2x1,
  isInWater,
  isOnIce,
  getTile,
  isSolid,
} from '@core/Physics';
import { StateMachine } from '@utils/StateMachine';
import type { CombatEntity } from '@combat/HitManager';
import { getEnemyStats, type MovementType } from '@data/enemyStats';
import { EnemyConst } from '@data/constData';
import { PIXEL_FONT } from '@ui/fonts';
import { type ElementAffinity, elementGroup } from '@combat/ElementAffinity';
import { CYRO_FROZEN_SLOW_PCT } from '@systems/TileHazards';
import { isBossEnemy } from '@entities/EnemyMetadata';
import { destroyDisplayObject } from '@scenes/shared/DisplayObjectLifecycleHelpers';
import { Debug } from '@core/Debug';

const GRAVITY = 980;
const MAX_FALL_SPEED = EnemyConst.MaxFallSpeed;
const TILE_SIZE = 16;
const ENEMY_SLOPE_2X1_SNAP_PX = 4;

/**
 * Chase ???좏쉶 hysteresis + cooldown + 愿???뺤? (?ъ슜??寃곗젙 2026-05-04, Q1+Q3).
 * base Enemy.moveTowardTarget ??same-level 遺꾧린媛 留??꾨젅??dir ???ш퀎?고빐
 * ?뚮젅?댁뼱媛 諛붾줈 ??寃뱀튇 ?곹깭?먯꽌 sub-pixel ?꾩튂 李⑥씠濡?vx 媛 +/- ?ㅺ?硫?
 * 醫뚯슦濡?"?뚮컮諛붾갊" ?⑤━???꾩긽 李⑤떒. 紐⑤뱺 ground ?겶룸낫??怨듯넻 ?곸슜.
 *
 *   - HYSTERESIS_PX:  ?뚮젅?댁뼱媛 ??嫄곕━ ?덉뿉 ?덉쑝硫?chaseDir ?좎?
 *   - COOLDOWN_MS:    ?쒕쾲 ?좏쉶?????ㅼ쓬 ?좏쉶源뚯? 媛뺤젣 ?湲?
 *   - PAUSE_MS:       ?좏쉶 吏곹썑 vx=0 ?쇰줈 吏㏐쾶 硫덉떠 紐⑥뀡 ??媛뺤“ (?? ?꾨젅??
 */
const CHASE_TURN_HYSTERESIS_PX = 8;
const CHASE_TURN_COOLDOWN_MS = 300;
const CHASE_TURN_PAUSE_MS = 33;

export type EnemyState = 'idle' | 'patrol' | 'detect' | 'chase' | 'retreat' | 'attack' | 'cooldown' | 'scatter' | 'hit' | 'death';
export type SurfaceAttachment = 'ceiling' | 'leftWall' | 'rightWall';

interface JumpCandidate {
  x: number;
  y: number;
  score: number;
}

interface JumpPlan {
  vx: number;
  vy: number;
  durationMs: number;
  targetX: number;
  targetY: number;
}

interface PlatformSegment {
  id: number;
  row: number;
  leftCol: number;
  rightCol: number;
}

interface PlatformJumpEdge {
  takeoffX: number;
  startX: number;
  startY: number;
  landing: JumpCandidate;
  plan: JumpPlan;
  score: number;
}

type PlatformEdgeKind = 'jump' | 'drop';

interface PlatformNavStep {
  kind: PlatformEdgeKind;
  fromId: number;
  toId: number;
  takeoffX: number;
  startX?: number;
  startY?: number;
  landing?: JumpCandidate;
  plan?: JumpPlan;
  score: number;
}

export abstract class Enemy<S extends string = EnemyState> extends Entity implements CombatEntity {
  fsm: StateMachine<S>;
  protected sprite: Graphics;

  // Stats
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  /** EXP awarded to player on kill (from CSV; 0 = use scene fallback) */
  exp = 0;
  /** Movement type from CSV: 'ground' = wall/floor collision, 'flying' = solids only */
  movementType: MovementType = 'ground';
  protected surfaceAttachment: SurfaceAttachment = 'ceiling';
  monsterType = '';
  facingRight = false;
  alive = true;

  // Tile hazard status (TileHazards.ts HazardTarget ?명솚).
  // GDD: Documents/System/System_World_TileSystem.md 짠2.6-2.13
  burnRemainingMs = 0;
  burnTickAccum = 0;
  chargedTickAccum = 0;
  acidTickAccum = 0;
  chargedStateMs = 0;
  cyroTickAccum = 0;
  cyroSlowRemainingMs = 0;
  prevInElectric = false;
  /**
   * Frozen status ??set by Ice Ego Shard impact. While > 0 the enemy is
   * fully halted: AI tick skipped, vx zeroed, body tinted blue. Decrements
   * each frame. 0 = normal.
   */
  frozenRemainingMs = 0;
  isFrozen(): boolean {
    return this.frozenRemainingMs > 0;
  }
  /**
   * Oil-slip residue. Refreshed by FluidResidueManager.applyEffects when
   * the enemy AABB overlaps an oil blot. Mirrors Player.oilSlipRemainingMs.
   * Scene-side handler can use this to dampen friction or skid the AI.
   */
  oilSlipRemainingMs = 0;

  // ?????????????????????????????????????????????????????????????
  // Element affinity (per-enemy elemental identity for resistance
  // / immunity / weakness). Subclasses override the default
  // `affinity = 'neutral'` in their constructor (or via CSV stats
  // later). Explicit Sets win over family-affinity default.
  // ?????????????????????????????????????????????????????????????
  /** Enemy's elemental family. 'neutral' means no innate resist/weak. */
  affinity: ElementAffinity = 'neutral';
  /** Sources that deal 0 damage regardless of family rules. */
  elementImmune: Set<ElementAffinity> | null = null;
  /** Sources that deal 0.5횞 damage. */
  elementResist: Set<ElementAffinity> | null = null;
  /** Sources that deal 1.5횞 damage. */
  elementWeak: Set<ElementAffinity> | null = null;

  /**
   * Multiplier applied to incoming damage of a given element. Order:
   *   1. explicit immune set    ??0
   *   2. explicit resist set    ??0.5
   *   3. explicit weak set      ??1.5
   *   4. same family as affinity ??0 (family immunity)
   *   5. default                ??1.0
   */
  elementMultiplier(source: ElementAffinity): number {
    if (this.elementImmune?.has(source)) return 0;
    if (this.elementResist?.has(source)) return 0.5;
    if (this.elementWeak?.has(source))   return 1.5;
    if (this.affinity !== 'neutral'
        && elementGroup(this.affinity) === elementGroup(source)) return 0;
    return 1.0;
  }

  // Physics
  protected grounded = false;
  private moveRemainderX = 0;
  private moveRemainderY = 0;

  // Environment state (for VFX: WaterSplash / WaterBubbles / IceSkidStreak).
  // Player ? ?숈씪???섎?瑜??좎??쒕떎:
  //  - inWater: AABB 以묒떖??water ?????
  //  - submerged: 癒몃━源뚯? ?좉? (以묒떖?먯꽌 2 ????꾨룄 water)
  //  - waterTransition: ?대쾲 ?꾨젅?꾩쓽 enter(+1) / exit(-1) / none(0)
  inWater = false;
  submerged = false;
  waterTransition: 0 | 1 | -1 = 0;
  private prevInWater = false;

  // Ground/jump transition events ??Player ? ?숈씪??consume ?⑦꽩.
  //  - landedFallSpeed: ?대쾲 ?꾨젅?꾩뿉 李⑹??덉쑝硫?|?댁쟾 vy|, ?꾨땲硫?null
  //  - jumpedThisFrame: ?대쾲 ?꾨젅?꾩뿉 grounded ?먯꽌 ?대쪠?덇퀬 vy < 0
  private landedFallSpeed: number | null = null;
  private jumpedThisFrame = false;
  private prevGrounded = false;
  private prevVy = 0;

  // AI
  protected detectRange: number;
  protected attackRange: number;
  protected moveSpeed: number;
  protected attackCooldown: number;
  protected cooldownTimer = 0;

  // Chase ?좏쉶 ?곹깭 ??base moveTowardTarget ??same-level 遺꾧린?먯꽌 ?ъ슜.
  /** ?꾩옱 ?좉릿 ?섑룊 異붽꺽 諛⑺뼢. 留??꾨젅???ш퀎?고븯吏 ?딄퀬 hysteresis + cooldown ?쇰줈 媛깆떊. */
  protected chaseDir: 1 | -1 = 1;
  /** ?ㅼ쓬 ?좏쉶 媛?κ퉴吏 ?⑥? ?쒓컙 (ms). */
  protected turnCooldownMs = 0;
  /** ?좏쉶 吏곹썑 vx=0 ?쇰줈 硫덉텛???붿뿬 ?쒓컙 (ms). 紐⑥뀡 ?? */
  protected turnPauseMs = 0;

  // Super armor ??if true, hits don't interrupt actions (no hitstun/knockback)
  superArmor = false;

  // Navigation jump ??when blocked by wall during chase, jump to clear obstacle
  /** Max jump height in tiles (0 = no jumping). Override in subclass. */
  protected jumpTiles = 0;
  private wallBlockedTimer = 0;
  private static readonly WALL_BLOCK_THRESHOLD = EnemyConst.WallBlockThresholdMs;
  private static readonly JUMP_COOLDOWN = EnemyConst.JumpCooldownMs;
  private jumpCooldownTimer = 0;
  private navJumpCarryDir: 1 | -1 = 1;
  private navJumpCarryTimer = 0;
  private plannedJumpVx = 0;
  private plannedJumpTimer = 0;
  private plannedJumpTargetX = 0;
  private plannedJumpTargetY = 0;
  private plannedJumpActive = false;
  private jumpStartX = 0;
  private jumpStartY = 0;
  private jumpFailCooldownMs = 0;
  private lastJumpDebugReason = '';
  private lastJumpDebugX = 0;
  private lastJumpDebugY = 0;

  // Target reference
  target: CombatEntity | null = null;
  roomData: number[][] = [];

  bindSpawnContext(collisionGrid: number[][], target: CombatEntity): void {
    this.roomData = collisionGrid;
    this.target = target;
  }

  setSurfaceAttachment(attachment: SurfaceAttachment): void {
    this.surfaceAttachment = attachment;
  }

  protected chooseNearestSurfaceAttachment(): void {
    if (this.roomData.length === 0) return;
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;
    const topRow = Math.floor((this.y - 1) / TILE_SIZE);
    const leftCol = Math.floor((this.x - 1) / TILE_SIZE);
    const rightCol = Math.floor((this.x + this.width) / TILE_SIZE);
    const centerCol = Math.floor(centerX / TILE_SIZE);
    const centerRow = Math.floor(centerY / TILE_SIZE);
    const candidates: Array<{ attachment: SurfaceAttachment; distance: number }> = [];
    for (let offset = 0; offset <= 3; offset++) {
      if (isSolid(getTile(this.roomData, centerCol, topRow - offset))) {
        candidates.push({ attachment: 'ceiling', distance: offset });
        break;
      }
    }
    for (let offset = 0; offset <= 3; offset++) {
      if (isSolid(getTile(this.roomData, leftCol - offset, centerRow))) {
        candidates.push({ attachment: 'leftWall', distance: offset });
        break;
      }
    }
    for (let offset = 0; offset <= 3; offset++) {
      if (isSolid(getTile(this.roomData, rightCol + offset, centerRow))) {
        candidates.push({ attachment: 'rightWall', distance: offset });
        break;
      }
    }
    candidates.sort((a, b) => a.distance - b.distance);
    if (candidates[0]) this.surfaceAttachment = candidates[0].attachment;
  }

  // Hit
  private _hitstunTimer = 0;

  // HP bar
  private hpBarContainer: Graphics;
  private debugMonsterTypeLabel: BitmapText;
  private readonly debugRayGfx = new Graphics();
  private hpBarVisible = false;
  private hpBarTimer = 0;
  private readonly HP_BAR_SHOW_DURATION = EnemyConst.HpBarShowMs;
  /** Subclasses with taller-than-collision sprites can shift the HP bar up
   *  by setting this in their constructor. Negative = upward in screen space. */
  protected hpBarOffsetY = 0;

  // Death
  private deathTimer = 0;
  private readonly DEATH_FADE = EnemyConst.DeathFadeMs;

  // Sakurai: Flash overlay for hit feedback
  private flashOverlay: Sprite | Graphics | null = null;
  /**
   * ?먯떇 ?대옒?ㅺ? own PNG/Atlas Sprite 瑜??깅줉?섎㈃ hit flash 媛 洹?sprite ??
   * ?뚰뙆 梨꾨꼸 紐⑥뼇 洹몃?濡??곗깋?쇰줈 諛쒓킅 (?ъ슜??寃곗젙 2026-05-04). 誘몃벑濡앹씠硫?
   * 湲곗〈 Graphics rect fallback.
   */
  protected mainSprite: Sprite | null = null;

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

    this.debugMonsterTypeLabel = new BitmapText({
      text: '',
      style: { fontFamily: PIXEL_FONT, fontSize: 14, fill: 0xffd166 },
    });
    this.debugMonsterTypeLabel.anchor.set(0.5, 1);
    this.debugMonsterTypeLabel.x = this.width / 2;
    this.debugMonsterTypeLabel.y = -2;
    this.debugMonsterTypeLabel.visible = false;
    this.container.addChild(this.debugMonsterTypeLabel);
    this.container.addChild(this.debugRayGfx);

    this.fsm = new StateMachine<S>();
    this.setupStates();
    this.fsm.transition('idle' as S);
  }

  /** Apply stats from CSV table. Call in subclass constructor after super(). */
  applyStats(type: string, level: number): void {
    const s = getEnemyStats(type, level);
    this.monsterType = type;
    this.debugMonsterTypeLabel.text = type;
    this.debugMonsterTypeLabel.x = this.width / 2;
    this.debugMonsterTypeLabel.y = -2;
    this.hp = s.hp;
    this.maxHp = s.hp;
    this.atk = s.atk;
    this.def = s.def;
    this.detectRange = s.detectRange;
    this.attackRange = s.attackRange;
    this.moveSpeed = s.moveSpeed;
    this.attackCooldown = s.attackCooldown;
    this.jumpTiles = s.jumpTiles;
    this.exp = s.exp;
    this.movementType = s.movementType;
  }

  setDebugMonsterTypeVisible(show: boolean): void {
    this.debugMonsterTypeLabel.visible = show && this.monsterType.length > 0 && this.alive;
  }

  protected abstract setupStates(): void;

  isAttackActive(): boolean {
    return false;
  }

  getAttackAABB(): { x: number; y: number; width: number; height: number } | null {
    return null;
  }

  update(dt: number): void {
    if (!this.alive) {
      this.deathTimer += dt;
      this.sprite.alpha = Math.max(0, 1 - this.deathTimer / this.DEATH_FADE);
      return;
    }

    this.savePrevPosition();
    this.updateInvincibility(dt);
    const dtSec = dt / 1000;
    const cyroMoveMult = this.cyroSlowRemainingMs > 0 ? 1 - CYRO_FROZEN_SLOW_PCT : 1;

    // HP bar timer
    if (this.hpBarTimer > 0) {
      this.hpBarTimer -= dt;
      if (this.hpBarTimer <= 0) {
        this.hpBarVisible = false;
        this.hpBarContainer.visible = false;
      }
    }

    if (this.cooldownTimer > 0) this.cooldownTimer -= dt;
    if (this.turnCooldownMs > 0) this.turnCooldownMs = Math.max(0, this.turnCooldownMs - dt);
    if (this.turnPauseMs > 0) this.turnPauseMs = Math.max(0, this.turnPauseMs - dt);

    // Frozen status ??skip AI tick + zero motion. Gravity still applies
    // via the movement block below (frozen enemies in the air will fall).
    if (this.frozenRemainingMs > 0) {
      this.frozenRemainingMs = Math.max(0, this.frozenRemainingMs - dt);
      this.vx = 0;
      this.sprite.tint = 0x88ccff;
    } else {
      // Restore tint once unfrozen, but leave other tints (e.g. invincible
      // flash) untouched by checking the current tint isn't ice-blue.
      if (this.sprite.tint === 0x88ccff) this.sprite.tint = 0xffffff;
      this.fsm.update(dt);
    }

    if (this.movementType === 'surface') {
      this.updateSurfaceMovement(dtSec, cyroMoveMult);
    } else if (this.movementType === 'flying') {
      // Flying enemies: no gravity, free movement. Only solid walls block.
      if (this.roomData.length > 0) {
        const rx = resolveX(this.x, this.y, this.width, this.height, this.vx * dtSec * cyroMoveMult, this.roomData);
        this.x = rx.x;
        if (rx.collided) this.vx = 0;

        const ry = resolveY(this.x, this.y, this.width, this.height, this.vy * dtSec * cyroMoveMult, this.roomData);
        this.y = ry.y;
        if (ry.collided) this.vy = 0;
      } else {
        this.x += this.vx * dtSec * cyroMoveMult;
        this.y += this.vy * dtSec * cyroMoveMult;
      }
      this.grounded = false;
    } else {
      // Ground enemies: gravity + full collision (wall, platform, one-way).
      if (this.jumpFailCooldownMs > 0) this.jumpFailCooldownMs = Math.max(0, this.jumpFailCooldownMs - dt);
      if (this.plannedJumpTimer > 0) {
        this.plannedJumpTimer = Math.max(0, this.plannedJumpTimer - dt);
        if (this.grounded || this.fsm.currentState === 'hit' || this.fsm.currentState === 'death') {
          this.plannedJumpTimer = 0;
        } else {
          this.vx = this.plannedJumpVx;
        }
      }
      if (this.navJumpCarryTimer > 0) {
        this.navJumpCarryTimer = Math.max(0, this.navJumpCarryTimer - dt);
        if (this.grounded || this.fsm.currentState === 'hit' || this.fsm.currentState === 'death') {
          this.navJumpCarryTimer = 0;
        } else if (this.vy < 80) {
          this.vx = this.navJumpCarryDir * Math.max(Math.abs(this.vx), this.moveSpeed);
        }
      }

      this.vy += GRAVITY * dtSec;
      if (this.vy > MAX_FALL_SPEED) this.vy = MAX_FALL_SPEED;
      if (this.grounded && this.vy < -1) this.grounded = false;

      if (this.roomData.length > 0) {
        const intendedVx = this.vx;
        const horizontalIntent = Math.abs(intendedVx) > 1;
        const moveX = this.consumePixelMoveX(intendedVx * dtSec * cyroMoveMult);
        const slopeEligibleX = this.grounded || this.vy >= 0;
        let rx = {
          ...resolveXPixelStep(this.x, this.y, this.width, this.height, moveX, this.roomData),
          y: this.y,
          onSlope: false,
        };
        if (rx.collided && slopeEligibleX && moveX !== 0) {
          rx = resolveXPixelStepWithSlopes2x1(
            this.x, this.y, this.width, this.height,
            moveX, this.roomData, ENEMY_SLOPE_2X1_SNAP_PX,
          );
        }
        this.x = rx.x;
        this.y = rx.y;

        const moveDir: 1 | -1 = intendedVx > 0 ? 1 : -1;
        const wallBlocked = horizontalIntent &&
          (rx.collided || (moveX === 0 && this.isWallBlockedAhead(moveDir)));

        // Wall-blocked jump: scan wall height, jump just enough to clear it
        if (wallBlocked) {
          this.vx = 0;
          if (this.jumpTiles > 0 && this.grounded && this.jumpCooldownTimer <= 0 && this.jumpFailCooldownMs <= 0) {
            this.wallBlockedTimer += dt;
            if (this.wallBlockedTimer >= Enemy.WALL_BLOCK_THRESHOLD) {
              const jumpPlan = this.findWallBlockedJumpPlan(moveDir);
          if (jumpPlan) {
            this.startPlannedJump(jumpPlan);
            this.wallBlockedTimer = 0;
            this.jumpCooldownTimer = Enemy.JUMP_COOLDOWN;
          } else {
            this.wallBlockedTimer = 0;
            this.jumpCooldownTimer = Enemy.JUMP_COOLDOWN * 2;
            this.jumpFailCooldownMs = 900;
          }
        }
      }
        } else {
          this.wallBlockedTimer = 0;
        }
        if (rx.collided) this.vx = 0;
        if (this.plannedJumpTimer > 0 && this.vy < 120) {
          this.vx = this.plannedJumpVx;
        } else if (this.navJumpCarryTimer > 0 && this.vy < 80) {
          this.vx = this.navJumpCarryDir * Math.max(Math.abs(this.vx), this.moveSpeed);
        }

        const moveY = this.consumePixelMoveY(this.vy * dtSec);
        const slopeEligibleY = this.grounded || this.vy >= 0;
        const ry = slopeEligibleY
          ? resolveYPixelStepWithSlopes2x1(
            this.x, this.y, this.width, this.height,
            moveY, this.roomData, false, ENEMY_SLOPE_2X1_SNAP_PX,
          )
          : {
            ...resolveYPixelStep(this.x, this.y, this.width, this.height, moveY, this.roomData),
            onSlope: false,
          };
        this.y = ry.y;
        const upwardMotion = moveY < 0 || this.vy < -1;
        const groundedBySlope = !upwardMotion && (rx.onSlope || ry.onSlope);
        this.grounded = ry.grounded || groundedBySlope;
        if (ry.collided) {
          this.vy = 0;
        } else if ((rx.onSlope || ry.onSlope) && this.vy > 0) {
          this.vy = 0;
        }
      }
    }

    // Jump cooldown
    if (this.jumpCooldownTimer > 0) this.jumpCooldownTimer -= dt;

    // Facing ??chase / attack / cooldown / hit / detect ?숈븞 chaseDir 濡??좉툑.
    // target.x 吏곸젒 異붿쟻? player 媛 媛源뚯씠??醫뚯슦濡??吏곸씠嫄곕굹 ?꾨줈 ?먰봽?섎㈃
    // dx 遺?멸? 留??꾨젅???ㅼ쭛? "鍮숆?鍮숆?" facing 源쒕묀???좊컻.
    // patrol ? subclass 媛 super ?몄텧 ??patrolDir 濡???뼱?대떎 (Skeleton).
    if (this.target) {
      const s = this.fsm.currentState;
      if (s === 'chase' || s === 'attack' || s === 'cooldown' || s === 'hit' || s === 'detect') {
        this.facingRight = this.chaseDir > 0;
      } else {
        this.facingRight = this.target.x > this.x;
      }
    }

    // Water/submerged ?곹깭 + enter/exit ?꾩씠 湲곕줉 ???ъ뿉??留??꾨젅??enemy 瑜?
    // ?쒗쉶?섎ŉ VFX(WaterSplash / WaterBubbles) 瑜??몃━嫄고븷 ???ъ슜.
    if (this.roomData.length > 0) {
      this.inWater = isInWater(this.x, this.y, this.width, this.height, this.roomData);
      // 癒몃━ 遺??以묒떖?먯꽌 -2 ??? ??water 硫?submerged
      const headInWater = isInWater(
        this.x, this.y - TILE_SIZE * 2, this.width, this.height, this.roomData,
      );
      this.submerged = this.inWater && headInWater;
    } else {
      this.inWater = false;
      this.submerged = false;
    }
    if (this.inWater && !this.prevInWater) this.waterTransition = 1;
    else if (!this.inWater && this.prevInWater) this.waterTransition = -1;
    else this.waterTransition = 0;
    this.prevInWater = this.inWater;

    // Land/jump ?꾩씠 媛먯? (flying ? grounded 媛 ??긽 false ?대?濡??먯뿰?ㅻ읇寃??쒖쇅??
    if (!this.prevGrounded && this.grounded && this.prevVy > 0) {
      this.landedFallSpeed = this.prevVy;
      this.resolvePlannedJumpLanding();
    }
    if (this.prevGrounded && !this.grounded && this.vy < -50) {
      this.jumpedThisFrame = true;
    }
    this.prevGrounded = this.grounded;
    this.prevVy = this.vy;
  }

  /** Consumes the land event from this frame. Returns fall speed (px/s) or null. */
  consumeLandedEvent(): number | null {
    const v = this.landedFallSpeed;
    this.landedFallSpeed = null;
    return v;
  }

  /** Consumes the ground jump event from this frame. */
  consumeGroundJumpEvent(): boolean {
    const v = this.jumpedThisFrame;
    this.jumpedThisFrame = false;
    return v;
  }

  /** True when the enemy is grounded on an ice tile (for IceSkidStreak VFX). */
  isStandingOnIce(): boolean {
    if (this.roomData.length === 0) return false;
    return this.grounded && isOnIce(this.x, this.y, this.width, this.height, this.roomData);
  }

  /** Expose vx for VFX direction calculations (IceSkidStreak ??. */
  getVx(): number {
    return this.vx;
  }

  render(alpha: number): void {
    if (!this.container.destroyed) {
      super.render(alpha);
      this.renderDebugRay();
      this.sprite.scale.x = this.facingRight ? 1 : -1;
      this.sprite.x = this.facingRight ? 0 : this.width;

      // Sakurai: White flash overlay on hit (emphasize impact moment).
      // mainSprite ?깅줉 ??媛숈? texture ??Sprite overlay + blendMode 'add' 濡?
      // ?뚰뙆 梨꾨꼸 紐⑥뼇 洹몃?濡??곗깋 諛쒓킅. 誘몃벑濡앹씠硫?湲곗〈 Graphics rect fallback.
      if (this.flashTimer > 0) {
        const intensity = Math.min(0.8, this.flashTimer / 40);
        if (this.mainSprite) {
          // Sprite-shaped flash
          if (!(this.flashOverlay instanceof Sprite)) {
            if (this.flashOverlay) {
              destroyDisplayObject(this.flashOverlay);
            }
            const flash = new Sprite(this.mainSprite.texture);
            flash.anchor.copyFrom(this.mainSprite.anchor);
            flash.x = this.mainSprite.x;
            flash.y = this.mainSprite.y;
            flash.blendMode = 'add';
            this.container.addChild(flash);
            this.flashOverlay = flash;
          }
          // 留??꾨젅??媛깆떊 ??atlas frame 蹂寃?+ facing flip 異붿쟻.
          this.flashOverlay.texture = this.mainSprite.texture;
          this.flashOverlay.scale.x = this.mainSprite.scale.x;
          this.flashOverlay.scale.y = this.mainSprite.scale.y;
          this.flashOverlay.alpha = intensity;
          this.flashOverlay.visible = true;
        } else {
          // Graphics rect fallback
          if (!(this.flashOverlay instanceof Graphics)) {
            if (this.flashOverlay) {
              destroyDisplayObject(this.flashOverlay);
            }
            this.flashOverlay = new Graphics();
            this.container.addChild(this.flashOverlay);
          }
          this.flashOverlay.clear();
          this.flashOverlay.rect(0, 0, this.width, this.height)
            .fill({ color: 0xffffff, alpha: intensity });
          this.flashOverlay.visible = true;
        }
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

    // Show HP bar on hit (skip for bosses ??HUD bar handles it)
    if (!isBossEnemy(this)) {
      this.hpBarVisible = true;
      this.hpBarTimer = this.HP_BAR_SHOW_DURATION;
      this.hpBarContainer.visible = true;
      this.updateHpBar();
    }
  }

  /**
   * Briefly flash the HP bar (same duration as onHit) without applying any
   * knockback / FSM transition. Used by hazard tick callbacks (magma DOT,
   * acid tick, charged pulse, burn, fluid residue) so the player gets clear
   * visual feedback that the elemental damage is landing on the enemy.
   */
  showHpBarFlash(): void {
    if (isBossEnemy(this)) return; // bosses use the HUD bar
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

  private updateSurfaceMovement(dtSec: number, cyroMoveMult: number): void {
    this.grounded = false;
    this.vy = this.surfaceAttachment === 'ceiling' ? 0 : this.vy;
    if (this.roomData.length === 0) {
      this.x += this.vx * dtSec * cyroMoveMult;
      this.y += this.vy * dtSec * cyroMoveMult;
      return;
    }

    if (this.surfaceAttachment === 'ceiling') {
      const rx = resolveX(this.x, this.y, this.width, this.height, this.vx * dtSec * cyroMoveMult, this.roomData);
      this.x = rx.x;
      if (rx.collided) this.vx = 0;
      this.snapToCeiling();
      this.vy = 0;
      return;
    }

    const ry = resolveY(this.x, this.y, this.width, this.height, this.vy * dtSec * cyroMoveMult, this.roomData);
    this.y = ry.y;
    if (ry.collided) this.vy = 0;
    if (this.surfaceAttachment === 'leftWall') this.snapToLeftWall();
    else this.snapToRightWall();
    this.vx = 0;
  }

  private snapToCeiling(): void {
    const colA = Math.floor((this.x + 2) / TILE_SIZE);
    const colB = Math.floor((this.x + this.width - 2) / TILE_SIZE);
    const currentTopRow = Math.floor((this.y - 1) / TILE_SIZE);
    for (let offset = 0; offset <= 2; offset++) {
      const row = currentTopRow - offset;
      if (isSolid(getTile(this.roomData, colA, row)) || isSolid(getTile(this.roomData, colB, row))) {
        this.y = (row + 1) * TILE_SIZE;
        return;
      }
    }
    for (let offset = 1; offset <= 2; offset++) {
      const row = currentTopRow + offset;
      if (isSolid(getTile(this.roomData, colA, row)) || isSolid(getTile(this.roomData, colB, row))) {
        this.y = (row + 1) * TILE_SIZE;
        return;
      }
    }
  }

  private snapToLeftWall(): void {
    const rowA = Math.floor((this.y + 2) / TILE_SIZE);
    const rowB = Math.floor((this.y + this.height - 2) / TILE_SIZE);
    const currentLeftCol = Math.floor((this.x - 1) / TILE_SIZE);
    for (let offset = 0; offset <= 2; offset++) {
      const col = currentLeftCol - offset;
      if (isSolid(getTile(this.roomData, col, rowA)) || isSolid(getTile(this.roomData, col, rowB))) {
        this.x = (col + 1) * TILE_SIZE;
        return;
      }
    }
    for (let offset = 1; offset <= 2; offset++) {
      const col = currentLeftCol + offset;
      if (isSolid(getTile(this.roomData, col, rowA)) || isSolid(getTile(this.roomData, col, rowB))) {
        this.x = (col + 1) * TILE_SIZE;
        return;
      }
    }
  }

  private snapToRightWall(): void {
    const rowA = Math.floor((this.y + 2) / TILE_SIZE);
    const rowB = Math.floor((this.y + this.height - 2) / TILE_SIZE);
    const currentRightCol = Math.floor((this.x + this.width) / TILE_SIZE);
    for (let offset = 0; offset <= 2; offset++) {
      const col = currentRightCol + offset;
      if (isSolid(getTile(this.roomData, col, rowA)) || isSolid(getTile(this.roomData, col, rowB))) {
        this.x = col * TILE_SIZE - this.width;
        return;
      }
    }
    for (let offset = 1; offset <= 2; offset++) {
      const col = currentRightCol - offset;
      if (isSolid(getTile(this.roomData, col, rowA)) || isSolid(getTile(this.roomData, col, rowB))) {
        this.x = col * TILE_SIZE - this.width;
        return;
      }
    }
  }

  private renderDebugRay(): void {
    this.debugRayGfx.clear();
    if (!Debug.infoVisible || !this.alive || !this.target) return;
    const startX = this.width / 2;
    const startY = this.height / 2;
    const targetX = this.target.x + this.target.width / 2 - this.x;
    const targetY = this.target.y + this.target.height / 2 - this.y;
    const canSee = this.hasLineOfSightToTarget();
    this.debugRayGfx
      .moveTo(startX, startY)
      .lineTo(targetX, targetY)
      .stroke({ color: canSee ? 0x36ff6b : 0xff3b30, alpha: 0.9, width: 1 });
    this.debugRayGfx.circle(startX, startY, 2).fill({ color: 0x36ff6b, alpha: 0.95 });
    this.debugRayGfx.circle(targetX, targetY, 2).fill({ color: 0xffd166, alpha: 0.95 });
    if (this.lastJumpDebugReason) {
      this.debugRayGfx
        .circle(this.lastJumpDebugX - this.x, this.lastJumpDebugY - this.y, 4)
        .stroke({ color: this.lastJumpDebugReason === 'planned' ? 0x36ff6b : 0xff3b30, alpha: 0.95, width: 1 });
    }
    this.renderPlatformNavDebug();
  }

  private renderPlatformNavDebug(): void {
    if (!this.target || this.roomData.length === 0 || this.jumpTiles <= 0) return;
    const segments = this.buildPlatformSegments();
    if (segments.length <= 1) return;
    const current = this.findPlatformForPoint(segments, this.x + this.width / 2, this.y + this.height);
    const target = this.findPlatformForPoint(
      segments,
      this.target.x + this.target.width / 2,
      this.target.y + this.target.height,
    );
    if (!current || !target) return;
    const step = current.id === target.id ? null : this.findPlatformNavStep(segments, current, target);

    for (const segment of segments) {
      const y = segment.row * TILE_SIZE - this.y;
      const x0 = segment.leftCol * TILE_SIZE - this.x;
      const x1 = (segment.rightCol + 1) * TILE_SIZE - this.x;
      const isCurrent = segment.id === current.id;
      const isTarget = segment.id === target.id;
      const color = isCurrent ? 0xffd166 : isTarget ? 0xff8a3d : 0x36c9ff;
      const alpha = isCurrent || isTarget ? 0.95 : 0.35;
      const width = isCurrent || isTarget ? 2 : 1;
      this.debugRayGfx.moveTo(x0, y).lineTo(x1, y).stroke({ color, alpha, width });
    }

    if (!step) return;
    const takeoffLocalX = step.takeoffX - this.x;
    const takeoffLocalY = current.row * TILE_SIZE - this.y;
    const edgeColor = step.kind === 'jump' ? 0x36ff6b : 0xffd166;
    this.debugRayGfx.circle(takeoffLocalX, takeoffLocalY, 4).fill({ color: edgeColor, alpha: 0.85 });

    if (step.kind === 'drop') {
      const to = segments.find(segment => segment.id === step.toId);
      if (!to) return;
      const dropY = to.row * TILE_SIZE - this.y;
      this.debugRayGfx
        .moveTo(takeoffLocalX, takeoffLocalY)
        .lineTo(takeoffLocalX, dropY)
        .stroke({ color: edgeColor, alpha: 0.85, width: 1 });
      this.debugRayGfx
        .moveTo(takeoffLocalX - 3, dropY - 5)
        .lineTo(takeoffLocalX, dropY)
        .lineTo(takeoffLocalX + 3, dropY - 5)
        .stroke({ color: edgeColor, alpha: 0.85, width: 1 });
      return;
    }

    if (!step.landing || !step.plan || step.startX === undefined || step.startY === undefined) return;
    const plan = step.plan;
    const startX = step.startX;
    const startY = step.startY;
    const durationSec = plan.durationMs / 1000;
    const steps = Math.max(8, Math.ceil(plan.durationMs / 50));
    let prevX = startX + this.width / 2 - this.x;
    let prevY = startY + this.height / 2 - this.y;
    for (let i = 1; i <= steps; i++) {
      const t = durationSec * (i / steps);
      const x = startX + plan.vx * t + this.width / 2 - this.x;
      const y = startY + plan.vy * t + 0.5 * GRAVITY * t * t + this.height / 2 - this.y;
      this.debugRayGfx.moveTo(prevX, prevY).lineTo(x, y).stroke({ color: edgeColor, alpha: 0.85, width: 1 });
      prevX = x;
      prevY = y;
    }
    this.debugRayGfx
      .circle(step.landing.x + this.width / 2 - this.x, step.landing.y + this.height - this.y, 4)
      .stroke({ color: edgeColor, alpha: 0.95, width: 1 });
  }

  protected hasLineOfSightToTarget(): boolean {
    if (!this.target) return false;
    return this.hasLineOfSightToPoint(
      this.target.x + this.target.width / 2,
      this.target.y + this.target.height / 2,
    );
  }

  protected hasLineOfSightToPoint(targetX: number, targetY: number): boolean {
    if (this.roomData.length === 0) return true;
    const startX = this.x + this.width / 2;
    const startY = this.y + this.height / 2;
    const dx = targetX - startX;
    const dy = targetY - startY;
    const dist = Math.hypot(dx, dy);
    if (dist <= 0.001) return true;
    const steps = Math.max(1, Math.ceil(dist / (TILE_SIZE / 2)));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const col = Math.floor((startX + dx * t) / TILE_SIZE);
      const row = Math.floor((startY + dy * t) / TILE_SIZE);
      if (isSolid(getTile(this.roomData, col, row))) return false;
    }
    return true;
  }

  protected moveTowardTarget(speed: number): void {
    if (!this.target) return;

    // Flying enemies: direct XY movement toward target (짠2.4)
    if (this.movementType === 'flying') {
      this.moveTowardTargetFlying(speed);
      return;
    }

    // Ground enemies ??怨듭쨷(?먰봽/?숉븯 ?꾩쨷)?먯꽑 異붽꺽 ?ш퀎???ㅽ궢.
    // ???섎뒗 ?먰봽 ?숈븞 player ???X 李⑥씠媛 遺??吏꾨룞?섎㈃ chaseDir ??留??꾨젅??
    // ?ㅼ쭛? 醫뚯슦濡??⑤━???꾩긽 (?ъ슜??寃곗젙 2026-05-08). ?대쪠 ??vx/chaseDir
    // ??怨좎젙??梨꾨줈 ?щЪ???대룞留??섑뻾, 李⑹? ???ㅼ떆 異붽꺽 ?됯?.
    if (!this.grounded) return;

    // Ground enemies: vertical chase rules (짠2.2-A)
    const targetCY = this.target.y + this.target.height / 2;
    const myCY = this.y + this.height / 2;
    const heightDiff = targetCY - myCY; // positive = player below
    const HEIGHT_THRESHOLD = TILE_SIZE * 2;

    if (heightDiff > HEIGHT_THRESHOLD) {
      // Player is below ??find floor gap and drop (짠2.2-A Case 2)
      this.moveTowardEdgeDrop(speed);
    } else if (heightDiff < -HEIGHT_THRESHOLD && this.jumpTiles > 0) {
      // Player is above: use lightweight platform graph first, then legacy gap search.
      if (!this.moveTowardPlatformPath(speed)) {
        this.moveTowardCeilingGap(speed);
      }
    } else {
      // Same level ??horizontal chase (짠2.2-A Case 3) + ?좏쉶 hysteresis + cooldown + pause.
      // ?좏쉶 吏곹썑 turnPauseMs ?숈븞 vx=0 ?쇰줈 吏㏐쾶 硫덉땄 (紐⑥뀡 ??媛뺤“ + ?⑤┝ 李⑤떒).
      if (this.turnPauseMs > 0) {
        this.vx = 0;
        return;
      }
      const dx = (this.target.x + this.target.width / 2) - (this.x + this.width / 2);
      if (Math.abs(dx) > CHASE_TURN_HYSTERESIS_PX) {
        const wantDir: 1 | -1 = dx > 0 ? 1 : -1;
        if (wantDir !== this.chaseDir && this.turnCooldownMs <= 0) {
          this.chaseDir = wantDir;
          this.turnCooldownMs = CHASE_TURN_COOLDOWN_MS;
          this.turnPauseMs = CHASE_TURN_PAUSE_MS;
          this.vx = 0;
          return;
        }
      }
      this.vx = this.chaseDir * speed;
    }
  }

  /**
   * Subclass ??chase state enter() ?먯꽌 ?몄텧 沅뚯옣. chaseDir ??利됱떆 target
   * ?꾩튂 湲곗??쇰줈 ?↔퀬 cooldown/pause 0 ??吏꾩엯 泥??꾨젅?꾩뿉 ?섎룄移??딆?
   * vx=0 pause 媛 諛쒖깮?섏? ?딅룄濡?
   */
  protected initChaseDir(): void {
    if (!this.target) return;
    this.chaseDir = this.target.x > this.x ? 1 : -1;
    this.turnCooldownMs = 0;
    this.turnPauseMs = 0;
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

  /**
   * Flying enemy: move toward target in both X and Y (direct line).
   * Wall collision handled by the base update()'s resolveX/Y for flying.
   */
  private moveTowardTargetFlying(speed: number): void {
    if (!this.target) return;
    const dx = (this.target.x + this.target.width / 2) - (this.x + this.width / 2);
    const dy = (this.target.y + this.target.height / 2) - (this.y + this.height / 2);
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return;
    this.vx = (dx / dist) * speed;
    this.vy = (dy / dist) * speed;
  }

  /**
   * Ground enemy: player is below. Find the nearest air tile (gap/hole) in the
   * floor row beneath the enemy's feet and walk INTO it ??gravity does the rest.
   * Scans outward from current position so the enemy always picks the closest gap.
   */
  private moveTowardEdgeDrop(speed: number): void {
    if (!this.target || this.roomData.length === 0) return;
    const feetRow = Math.floor((this.y + this.height) / TILE_SIZE);
    const myCol = Math.floor((this.x + this.width / 2) / TILE_SIZE);
    const gridW = this.roomData[0]?.length ?? 0;

    // Scan outward from enemy position for nearest air tile in feetRow
    for (let offset = 1; offset < gridW; offset++) {
      const r = myCol + offset;
      const l = myCol - offset;
      if (r < gridW && this.roomData[feetRow]?.[r] === 0) {
        this.vx = speed;  // move right toward gap
        return;
      }
      if (l >= 0 && this.roomData[feetRow]?.[l] === 0) {
        this.vx = -speed; // move left toward gap
        return;
      }
    }
    // No gap found ??floor is completely sealed. Cannot reach player.
    this.vx = 0;
  }

  /**
   * Ground enemy: player is above. Find the nearest air tile in the ceiling row
   * (headRow - 1) and walk under it so wall-blocked jump can launch through.
   * Mirror logic of moveTowardEdgeDrop but scans the row ABOVE the enemy's head.
   */
  private moveTowardCeilingGap(speed: number): void {
    if (!this.target || this.roomData.length === 0) return;
    const headRow = Math.floor(this.y / TILE_SIZE);
    const myCol = Math.floor((this.x + this.width / 2) / TILE_SIZE);
    const gridW = this.roomData[0]?.length ?? 0;

    // Scan outward for nearest air tile in the row above head
    for (let offset = 0; offset < gridW; offset++) {
      const r = myCol + offset;
      const l = myCol - offset;
      if (r < gridW && this.roomData[headRow]?.[r] === 0) {
        const gapX = r * TILE_SIZE + TILE_SIZE / 2;
        const myX = this.x + this.width / 2;
        if (Math.abs(gapX - myX) < TILE_SIZE) {
          // Already under the gap: jump only when a real upper landing arc exists.
          this.tryStartCeilingGapJump(gapX, speed);
        } else {
          this.vx = gapX > myX ? speed : -speed;
        }
        return;
      }
      if (l >= 0 && this.roomData[headRow]?.[l] === 0) {
        const gapX = l * TILE_SIZE + TILE_SIZE / 2;
        const myX = this.x + this.width / 2;
        if (Math.abs(gapX - myX) < TILE_SIZE) {
          this.tryStartCeilingGapJump(gapX, speed);
        } else {
          this.vx = gapX > myX ? speed : -speed;
        }
        return;
      }
    }
    // No ceiling gap ??move toward player X as fallback
    const dir = this.target.x > this.x ? 1 : -1;
    this.vx = dir * speed;
  }

  private updateHpBar(): void {
    this.hpBarContainer.clear();
    const barW = this.width + 4;
    const barH = 3;
    const barX = (this.width - barW) / 2;
    const barY = -6 + this.hpBarOffsetY;

    // Background
    this.hpBarContainer.rect(barX, barY, barW, barH).fill(0x333333);
    // HP fill
    const ratio = Math.max(0, this.hp / this.maxHp);
    const color = ratio > 0.5 ? 0x22cc22 : ratio > 0.25 ? 0xcccc22 : 0xcc2222;
    this.hpBarContainer.rect(barX, barY, barW * ratio, barH).fill(color);
  }

  /**
   * JumpTiles is a maximum capability. Pick the smallest jump impulse that can
   * clear the immediate obstacle and roughly match a higher target elevation.
   */
  private computeAdaptiveJumpTiles(dir: 1 | -1, wallHeightTiles: number): number {
    if (this.jumpTiles <= 0 || !this.grounded) return 0;
    const wallRequirement = wallHeightTiles > 0 ? wallHeightTiles + 1 : 0;
    const targetRequirement = this.computeTargetElevationJumpTiles();
    const requiredTiles = Math.max(1, wallRequirement, targetRequirement);
    if (requiredTiles > this.jumpTiles) return 0;
    if (wallHeightTiles > 0 && !this.hasForwardLandingCandidate(dir, requiredTiles)) {
      return Math.min(requiredTiles, Math.max(1, wallHeightTiles + 1));
    }
    return Math.min(this.jumpTiles, requiredTiles);
  }

  private computeTargetElevationJumpTiles(): number {
    if (!this.target) return 0;
    const targetFeet = this.target.y + this.target.height;
    const myFeet = this.y + this.height;
    const upwardPx = myFeet - targetFeet;
    if (upwardPx <= TILE_SIZE) return 0;
    return Math.ceil(upwardPx / TILE_SIZE) + 1;
  }

  private findWallBlockedJumpPlan(dir: 1 | -1): JumpPlan | null {
    const wallHeight = this.scanWallHeight(dir);
    const jumpTiles = this.computeAdaptiveJumpTiles(dir, wallHeight);
    if (jumpTiles <= 0) {
      this.markJumpDebug('no-height', this.x + this.width / 2, this.y + this.height);
      return null;
    }
    const candidate = this.findJumpLandingCandidate(dir, jumpTiles);
    if (!candidate) {
      this.markJumpDebug('no-candidate', this.x + this.width / 2 + dir * TILE_SIZE, this.y + this.height);
      return null;
    }
    const plan = this.createJumpPlan(candidate);
    if (!plan) this.markJumpDebug('blocked-arc', candidate.x + this.width / 2, candidate.y + this.height);
    return plan;
  }

  private findJumpLandingCandidate(dir: 1 | -1, jumpTiles: number): JumpCandidate | null {
    if (this.roomData.length === 0) return null;
    const startCol = Math.floor((this.x + this.width / 2) / TILE_SIZE);
    const feetRow = Math.floor((this.y + this.height - 1) / TILE_SIZE);
    const gridH = this.roomData.length;
    const gridW = this.roomData[0]?.length ?? 0;
    const maxForward = Math.min(7, Math.max(3, jumpTiles));
    const minRow = Math.max(1, feetRow - jumpTiles - 1);
    const maxRow = Math.min(gridH - 1, feetRow + 2);
    let best: JumpCandidate | null = null;
    for (let ahead = 1; ahead <= maxForward; ahead++) {
      const col = startCol + dir * ahead;
      if (col < 0 || col >= gridW) continue;
      for (let floorRow = minRow; floorRow <= maxRow; floorRow++) {
        const x = col * TILE_SIZE + TILE_SIZE / 2 - this.width / 2;
        const y = floorRow * TILE_SIZE - this.height;
        if (!this.canStandAtPixel(x, y)) continue;
        if (!this.isJumpCandidateProgress(x, y)) continue;
        const targetScore = this.scoreJumpCandidate(x, y, ahead, floorRow);
        const candidate = { x, y, score: targetScore };
        if (!best || candidate.score < best.score) best = candidate;
      }
    }
    return best;
  }

  private canOccupyAtPixel(x: number, y: number): boolean {
    if (this.roomData.length === 0) return false;
    const gridH = this.roomData.length;
    const gridW = this.roomData[0]?.length ?? 0;
    const leftCol = Math.floor(x / TILE_SIZE);
    const rightCol = Math.floor((x + this.width - 1) / TILE_SIZE);
    const topRow = Math.floor(y / TILE_SIZE);
    const bottomRow = Math.floor((y + this.height - 1) / TILE_SIZE);
    if (leftCol < 0 || rightCol >= gridW || topRow < 0 || bottomRow >= gridH) return false;
    for (let r = topRow; r <= bottomRow; r++) {
      for (let c = leftCol; c <= rightCol; c++) {
        if (isSolid(getTile(this.roomData, c, r))) return false;
      }
    }
    return true;
  }

  private hasFloorBelowAtPixel(x: number, y: number): boolean {
    if (this.roomData.length === 0) return false;
    const gridH = this.roomData.length;
    const gridW = this.roomData[0]?.length ?? 0;
    const floorRow = Math.floor((y + this.height) / TILE_SIZE);
    if (floorRow < 0 || floorRow >= gridH) return false;
    const inset = Math.min(3, Math.max(1, Math.floor(this.width * 0.15)));
    const leftCol = Math.floor((x + inset) / TILE_SIZE);
    const rightCol = Math.floor((x + this.width - 1 - inset) / TILE_SIZE);
    if (leftCol < 0 || rightCol >= gridW) return false;
    for (let c = leftCol; c <= rightCol; c++) {
      if (isSolid(getTile(this.roomData, c, floorRow))) return true;
    }
    return false;
  }

  private canStandAtPixel(x: number, y: number): boolean {
    return this.canOccupyAtPixel(x, y) && this.hasFloorBelowAtPixel(x, y);
  }

  private isJumpCandidateProgress(x: number, y: number): boolean {
    if (!this.target) return true;
    const targetCx = this.target.x + this.target.width / 2;
    const targetCy = this.target.y + this.target.height / 2;
    const before = Math.hypot(targetCx - (this.x + this.width / 2), targetCy - (this.y + this.height / 2));
    const after = Math.hypot(targetCx - (x + this.width / 2), targetCy - (y + this.height / 2));
    return after < before - 4;
  }

  private tryStartCeilingGapJump(gapX: number, speed: number): void {
    if (!this.target || !this.grounded || this.jumpCooldownTimer > 0 || this.jumpFailCooldownMs > 0) return;
    const dir = this.target.x + this.target.width / 2 > this.x + this.width / 2 ? 1 : -1;
    const jumpTiles = this.computeAdaptiveJumpTiles(dir, 1);
    if (jumpTiles <= 0) {
      this.jumpCooldownTimer = Enemy.JUMP_COOLDOWN;
      this.jumpFailCooldownMs = 900;
      this.markJumpDebug('no-height', gapX, this.y);
      return;
    }
    const plan = this.findCeilingGapJumpPlan(gapX, jumpTiles);
    if (!plan) {
      this.jumpCooldownTimer = Enemy.JUMP_COOLDOWN * 2;
      this.jumpFailCooldownMs = 1200;
      this.markJumpDebug('no-gap-arc', gapX, this.y);
      return;
    }
    this.startPlannedJump(plan);
    this.jumpCooldownTimer = Enemy.JUMP_COOLDOWN;
    this.vx = Math.abs(plan.vx) > 1 ? plan.vx : (dir * speed);
  }

  private findCeilingGapJumpPlan(gapX: number, jumpTiles: number): JumpPlan | null {
    if (this.roomData.length === 0) return null;
    const gridH = this.roomData.length;
    const gridW = this.roomData[0]?.length ?? 0;
    const gapCol = Math.floor(gapX / TILE_SIZE);
    const feetRow = Math.floor((this.y + this.height - 1) / TILE_SIZE);
    const minRow = Math.max(1, feetRow - jumpTiles - 1);
    const maxRow = Math.max(minRow, feetRow - 1);
    let best: JumpCandidate | null = null;
    for (let offset = 0; offset <= 3; offset++) {
      for (const sign of offset === 0 ? [0] : [-1, 1]) {
        const col = gapCol + sign * offset;
        if (col < 0 || col >= gridW) continue;
        for (let floorRow = minRow; floorRow <= Math.min(gridH - 1, maxRow); floorRow++) {
          const x = col * TILE_SIZE + TILE_SIZE / 2 - this.width / 2;
          const y = floorRow * TILE_SIZE - this.height;
          if (y >= this.y - TILE_SIZE / 2) continue;
          if (!this.canStandAtPixel(x, y)) continue;
          if (!this.isJumpCandidateProgress(x, y)) continue;
          const candidate = { x, y, score: Math.abs(col - gapCol) * 10 + floorRow };
          if (!best || candidate.score < best.score) best = candidate;
        }
      }
    }
    if (!best) return null;
    const plan = this.createJumpPlan(best);
    if (!plan) this.markJumpDebug('blocked-arc', best.x + this.width / 2, best.y + this.height);
    return plan;
  }

  private scoreJumpCandidate(x: number, y: number, ahead: number, floorRow: number): number {
    let score = ahead * 10;
    const currentFeetRow = Math.floor((this.y + this.height - 1) / TILE_SIZE);
    score += Math.max(0, currentFeetRow - floorRow) * 4;
    if (this.target) {
      const before = Math.hypot(
        (this.target.x + this.target.width / 2) - (this.x + this.width / 2),
        (this.target.y + this.target.height / 2) - (this.y + this.height / 2),
      );
      const after = Math.hypot(
        (this.target.x + this.target.width / 2) - (x + this.width / 2),
        (this.target.y + this.target.height / 2) - (y + this.height / 2),
      );
      score += (after - before) * 0.1;
    }
    return score;
  }

  private moveTowardPlatformPath(speed: number): boolean {
    if (!this.target || this.roomData.length === 0 || this.jumpTiles <= 0) return false;
    const segments = this.buildPlatformSegments();
    if (segments.length <= 1) return false;
    const current = this.findPlatformForPoint(segments, this.x + this.width / 2, this.y + this.height);
    const target = this.findPlatformForPoint(
      segments,
      this.target.x + this.target.width / 2,
      this.target.y + this.target.height,
    );
    if (!current || !target || current.id === target.id) return false;

    const step = this.findPlatformNavStep(segments, current, target);
    if (!step) {
      this.markJumpDebug('no-nav-step', this.target.x + this.target.width / 2, this.target.y + this.target.height);
      return false;
    }

    const centerX = this.x + this.width / 2;
    if (Math.abs(centerX - step.takeoffX) > TILE_SIZE * 0.5) {
      this.vx = step.takeoffX > centerX ? speed : -speed;
      this.markJumpDebug(step.kind === 'jump' ? 'nav-jump-walk' : 'nav-drop-walk', step.takeoffX, current.row * TILE_SIZE);
      return true;
    }

    if (step.kind === 'drop') {
      this.vx = step.takeoffX > centerX ? speed : -speed;
      this.markJumpDebug('nav-drop', step.takeoffX, current.row * TILE_SIZE);
      return true;
    }

    if (!step.landing || !step.plan || step.startX === undefined || step.startY === undefined) {
      this.markJumpDebug('nav-plan-missing', step.takeoffX, current.row * TILE_SIZE);
      return false;
    }
    if (!this.grounded || this.jumpCooldownTimer > 0 || this.jumpFailCooldownMs > 0) {
      this.vx = 0;
      return true;
    }

    if (!this.canStandAtPixel(step.startX, step.startY)) {
      this.jumpCooldownTimer = Enemy.JUMP_COOLDOWN * 2;
      this.jumpFailCooldownMs = 1200;
      this.markJumpDebug('nav-snap-blocked', step.startX + this.width / 2, step.startY + this.height);
      return true;
    }

    this.x = step.startX;
    this.y = step.startY;
    this.prevX = this.x;
    this.prevY = this.y;
    this.moveRemainderX = 0;
    this.moveRemainderY = 0;
    this.startPlannedJump(step.plan);
    this.jumpCooldownTimer = Enemy.JUMP_COOLDOWN;
    return true;
  }

  private buildPlatformSegments(): PlatformSegment[] {
    const segments: PlatformSegment[] = [];
    if (this.roomData.length === 0) return segments;
    const gridH = this.roomData.length;
    const gridW = this.roomData[0]?.length ?? 0;
    let id = 0;
    for (let row = 1; row < gridH; row++) {
      let startCol = -1;
      for (let col = 0; col <= gridW; col++) {
        const x = col * TILE_SIZE + TILE_SIZE / 2 - this.width / 2;
        const y = row * TILE_SIZE - this.height;
        const standable = col < gridW && this.canStandAtPixel(x, y);
        if (standable && startCol < 0) startCol = col;
        if ((!standable || col === gridW) && startCol >= 0) {
          segments.push({ id: id++, row, leftCol: startCol, rightCol: col - 1 });
          startCol = -1;
        }
      }
    }
    return segments;
  }

  private findPlatformForPoint(segments: PlatformSegment[], x: number, feetY: number): PlatformSegment | null {
    const col = Math.floor(x / TILE_SIZE);
    const row = Math.floor(feetY / TILE_SIZE);
    let best: PlatformSegment | null = null;
    let bestScore = Infinity;
    for (const segment of segments) {
      const insideX = col >= segment.leftCol && col <= segment.rightCol;
      const dx = insideX ? 0 : Math.min(Math.abs(col - segment.leftCol), Math.abs(col - segment.rightCol));
      const dy = Math.abs(row - segment.row);
      const score = dx * 3 + dy * 12;
      if (score < bestScore) {
        bestScore = score;
        best = segment;
      }
    }
    return best;
  }

  private findPlatformNavStep(segments: PlatformSegment[], current: PlatformSegment, target: PlatformSegment): PlatformNavStep | null {
    const queue: PlatformSegment[] = [current];
    const visited = new Set<number>([current.id]);
    const firstStep = new Map<number, PlatformNavStep>();
    const maxVisited = Math.min(segments.length, 80);

    while (queue.length > 0 && visited.size <= maxVisited) {
      const from = queue.shift()!;
      const edges = this.findPlatformEdgesFrom(from, segments, target);
      edges.sort((a, b) => a.score - b.score);
      for (const edge of edges) {
        if (visited.has(edge.toId)) continue;
        const root = from.id === current.id ? edge : firstStep.get(from.id);
        if (!root) continue;
        firstStep.set(edge.toId, root);
        if (edge.toId === target.id) return root;
        visited.add(edge.toId);
        const next = segments.find(segment => segment.id === edge.toId);
        if (next) queue.push(next);
      }
    }

    return null;
  }

  private findPlatformEdgesFrom(from: PlatformSegment, segments: PlatformSegment[], target: PlatformSegment): PlatformNavStep[] {
    const edges: PlatformNavStep[] = [];
    for (const to of segments) {
      if (to.id === from.id) continue;
      if (!this.shouldConsiderPlatformEdge(from, to, target)) continue;

      const jump = this.findPlatformJumpEdge(from, to);
      if (jump) {
        edges.push({
          kind: 'jump',
          fromId: from.id,
          toId: to.id,
          takeoffX: jump.takeoffX,
          startX: jump.startX,
          startY: jump.startY,
          landing: jump.landing,
          plan: jump.plan,
          score: jump.score + this.scorePlatformTowardTarget(to, target),
        });
        continue;
      }

      const drop = this.findPlatformDropEdge(from, to);
      if (drop) {
        edges.push({
          ...drop,
          score: drop.score + this.scorePlatformTowardTarget(to, target),
        });
      }
    }
    return edges;
  }

  private shouldConsiderPlatformEdge(from: PlatformSegment, to: PlatformSegment, target: PlatformSegment): boolean {
    const rowDelta = to.row - from.row;
    const upTiles = from.row - to.row;
    if (upTiles > this.jumpTiles + 1) return false;
    if (rowDelta > Math.max(8, this.jumpTiles + 2)) return false;
    const horizontalGap = Math.max(0, Math.max(to.leftCol - from.rightCol, from.leftCol - to.rightCol));
    if (horizontalGap > Math.max(10, this.jumpTiles + 4)) return false;
    const currentTargetDist = Math.abs(from.row - target.row) * 4 + Math.abs((from.leftCol + from.rightCol) - (target.leftCol + target.rightCol));
    const nextTargetDist = Math.abs(to.row - target.row) * 4 + Math.abs((to.leftCol + to.rightCol) - (target.leftCol + target.rightCol));
    return nextTargetDist <= currentTargetDist + 8;
  }

  private scorePlatformTowardTarget(segment: PlatformSegment, target: PlatformSegment): number {
    const center = (segment.leftCol + segment.rightCol) * 0.5;
    const targetCenter = (target.leftCol + target.rightCol) * 0.5;
    return Math.abs(segment.row - target.row) * 24 + Math.abs(center - targetCenter) * 2;
  }

  private findPlatformDropEdge(from: PlatformSegment, to: PlatformSegment): PlatformNavStep | null {
    if (to.row <= from.row) return null;
    const overlapLeft = Math.max(from.leftCol, to.leftCol);
    const overlapRight = Math.min(from.rightCol, to.rightCol);
    let takeoffCol: number;
    if (overlapLeft <= overlapRight) {
      takeoffCol = Math.floor((overlapLeft + overlapRight) / 2);
    } else if (to.rightCol < from.leftCol) {
      takeoffCol = from.leftCol;
    } else if (to.leftCol > from.rightCol) {
      takeoffCol = from.rightCol;
    } else {
      return null;
    }
    const takeoffX = takeoffCol * TILE_SIZE + TILE_SIZE / 2;
    const verticalScore = (to.row - from.row) * 8;
    const horizontalScore = Math.max(0, Math.max(to.leftCol - from.rightCol, from.leftCol - to.rightCol)) * 4;
    return {
      kind: 'drop',
      fromId: from.id,
      toId: to.id,
      takeoffX,
      score: verticalScore + horizontalScore,
    };
  }

  private findPlatformJumpEdge(current: PlatformSegment, target: PlatformSegment): PlatformJumpEdge | null {
    const currentY = current.row * TILE_SIZE - this.height;
    const targetCenterX = (target.leftCol + target.rightCol + 1) * TILE_SIZE / 2;
    let best: PlatformJumpEdge | null = null;
    for (let landingCol = target.leftCol; landingCol <= target.rightCol; landingCol++) {
      const landingX = landingCol * TILE_SIZE + TILE_SIZE / 2 - this.width / 2;
      const landingY = target.row * TILE_SIZE - this.height;
      if (!this.canStandAtPixel(landingX, landingY)) continue;
      const landing: JumpCandidate = {
        x: landingX,
        y: landingY,
        score: Math.abs((landingX + this.width / 2) - targetCenterX),
      };
      for (let takeoffCol = current.leftCol; takeoffCol <= current.rightCol; takeoffCol++) {
        const takeoffX = takeoffCol * TILE_SIZE + TILE_SIZE / 2;
        const startX = takeoffX - this.width / 2;
        if (!this.canStandAtPixel(startX, currentY)) continue;
        const plan = this.createJumpPlanFrom(startX, currentY, landing);
        if (!plan) continue;
        const currentCenterX = this.x + this.width / 2;
        const score = Math.abs(takeoffX - currentCenterX) + landing.score * 0.5 + Math.max(0, target.row - current.row) * 64;
        const edge = { takeoffX, startX, startY: currentY, landing, plan, score };
        if (!best || edge.score < best.score) best = edge;
      }
    }
    return best;
  }

  private createJumpPlan(candidate: JumpCandidate): JumpPlan | null {
    return this.createJumpPlanFrom(this.x, this.y, candidate);
  }

  private createJumpPlanFrom(startX: number, startY: number, candidate: JumpCandidate): JumpPlan | null {
    const dx = candidate.x - startX;
    const dy = candidate.y - startY;
    const horizontalDistance = Math.max(1, Math.abs(dx));
    const baseSpeed = Math.max(this.moveSpeed, 36);
    const time = Math.max(0.35, Math.min(0.9, horizontalDistance / (baseSpeed * 1.35)));
    const vx = dx / time;
    const vy = (dy - 0.5 * GRAVITY * time * time) / time;
    const maxVx = Math.max(this.moveSpeed * 2.6, 120);
    const maxJumpHeight = this.jumpTiles * TILE_SIZE;
    if (Math.abs(vx) > maxVx) return null;
    if (vy >= -80) return null;
    if ((vy * vy) / (2 * GRAVITY) > maxJumpHeight + TILE_SIZE) return null;
    const plan = {
      vx,
      vy,
      durationMs: time * 1000,
      targetX: candidate.x,
      targetY: candidate.y,
    };
    if (!this.hasClearJumpArcFrom(startX, startY, plan)) return null;
    return plan;
  }

  private hasClearJumpArc(plan: JumpPlan): boolean {
    return this.hasClearJumpArcFrom(this.x, this.y, plan);
  }

  private hasClearJumpArcFrom(startX: number, startY: number, plan: JumpPlan): boolean {
    const durationSec = plan.durationMs / 1000;
    const steps = Math.max(8, Math.ceil(plan.durationMs / 50));
    for (let i = 1; i <= steps; i++) {
      const t = durationSec * (i / steps);
      const x = startX + plan.vx * t;
      const y = startY + plan.vy * t + 0.5 * GRAVITY * t * t;
      if (!this.canOccupyAtPixel(x, y)) return false;
    }
    return this.canStandAtPixel(plan.targetX, plan.targetY);
  }

  private markJumpDebug(reason: string, x: number, y: number): void {
    this.lastJumpDebugReason = reason;
    this.lastJumpDebugX = x;
    this.lastJumpDebugY = y;
  }


  private startPlannedJump(plan: JumpPlan): void {
    this.plannedJumpVx = plan.vx;
    this.plannedJumpTimer = plan.durationMs;
    this.plannedJumpTargetX = plan.targetX;
    this.plannedJumpTargetY = plan.targetY;
    this.plannedJumpActive = true;
    this.jumpStartX = this.x;
    this.jumpStartY = this.y;
    this.vx = plan.vx;
    this.vy = plan.vy;
    this.grounded = false;
    this.navJumpCarryTimer = 0;
    this.markJumpDebug('planned', plan.targetX + this.width / 2, plan.targetY + this.height);
  }

  private resolvePlannedJumpLanding(): void {
    if (!this.plannedJumpActive) return;
    const moved = Math.hypot(this.x - this.jumpStartX, this.y - this.jumpStartY);
    const targetDist = Math.hypot(this.x - this.plannedJumpTargetX, this.y - this.plannedJumpTargetY);
    if (moved < 12 || targetDist > TILE_SIZE * 2.5) {
      this.jumpFailCooldownMs = 1500;
    }
    this.plannedJumpTimer = 0;
    this.plannedJumpTargetX = 0;
    this.plannedJumpTargetY = 0;
    this.plannedJumpActive = false;
  }

  private hasForwardLandingCandidate(dir: 1 | -1, jumpTiles: number): boolean {
    if (this.roomData.length === 0) return true;
    const startCol = Math.floor((this.x + this.width / 2) / TILE_SIZE);
    const feetRow = Math.floor((this.y + this.height - 1) / TILE_SIZE);
    const gridH = this.roomData.length;
    const gridW = this.roomData[0]?.length ?? 0;
    const maxForward = Math.min(5, Math.max(2, jumpTiles));
    for (let ahead = 1; ahead <= maxForward; ahead++) {
      const col = startCol + dir * ahead;
      if (col < 0 || col >= gridW) continue;
      const minRow = Math.max(0, feetRow - jumpTiles - 1);
      const maxRow = Math.min(gridH - 1, feetRow + 2);
      for (let row = minRow; row <= maxRow; row++) {
        const x = col * TILE_SIZE + TILE_SIZE / 2 - this.width / 2;
        const y = row * TILE_SIZE - this.height;
        if (this.canStandAtPixel(x, y)) return true;
      }
    }
    return false;
  }

  /**
   * Scan the wall in front of the enemy to measure its height in tiles.
   * Returns 0 if no wall, or the number of solid tiles stacked vertically.
   */
  private scanWallHeight(dir: 1 | -1 = this.facingRight ? 1 : -1): number {
    if (this.roomData.length === 0) return 0;
    const TILE = 16;
    // Check column in front of the enemy
    const checkCol = dir > 0
      ? Math.floor((this.x + this.width + 2) / TILE)
      : Math.floor((this.x - 2) / TILE);
    const feetRow = Math.floor((this.y + this.height - 1) / TILE);
    const gridH = this.roomData.length;
    const gridW = this.roomData[0]?.length ?? 0;

    if (checkCol < 0 || checkCol >= gridW) return 0;

    // Count solid tiles upward from feet level
    let height = 0;
    for (let row = feetRow; row >= 0; row--) {
      if (isSolid(this.roomData[row]?.[checkCol] ?? 1)) {
        height++;
      } else {
        break; // found air ??wall ends here
      }
    }
    return height;
  }

  private isWallBlockedAhead(dir: 1 | -1): boolean {
    if (this.roomData.length === 0) return false;
    const leadX = dir > 0 ? this.x + this.width + 1 : this.x - 1;
    const checkCol = Math.floor(leadX / TILE_SIZE);
    const topRow = Math.floor(this.y / TILE_SIZE);
    const bottomRow = Math.floor((this.y + this.height - 1) / TILE_SIZE);
    for (let row = topRow; row <= bottomRow; row++) {
      if (isSolid(this.roomData[row]?.[checkCol] ?? 1)) return true;
    }
    return false;
  }

  protected stateHitUpdate(dt: number): void {
    this._hitstunTimer -= dt;
    this.vx *= 0.9;
    if (this._hitstunTimer <= 0) {
      this.fsm.transition('idle' as S);
    }
  }
}

