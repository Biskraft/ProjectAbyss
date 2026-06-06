/**
 * Slime.ts
 *
 * Small passive enemy that wanders nearby. Half the size of a Skeleton (8×12).
 * Does not attack first — only has idle and wander behavior.
 * Hops randomly on a short timer when grounded.
 */

import { Assets, Graphics, Rectangle, Sprite, Texture } from 'pixi.js';
import { Enemy } from './Enemy';
import { assetPath } from '@core/AssetLoader';
import { GlowFilter } from '@effects/GlowFilter';

const HOP_VY = -180;
const WANDER_SPEED = 30;
const HOP_TIMER_MIN = 1500;
const HOP_TIMER_MAX = 3000;
const WANDER_RANGE = 4 * 16; // 4 tiles

const SLIME_SPRITE_PATH = 'assets/characters/slime_01_atlas.png';
const SLIME_FRAME_W = 32;
const SLIME_FRAME_H = 32;
const SLIME_FRAME_COUNT = 12;       // 384 / 32
const SLIME_ANIM_FRAME_MS = 110;

/** 4-4-4 분할 — 1-indexed Aseprite 기준 frame 1-4 idle / 5-8 walk / 9-12 run. */
type SlimeAnim = 'idle' | 'walk' | 'run';
const SLIME_ANIM_RANGES: Record<SlimeAnim, { from: number; to: number }> = {
  idle: { from: 0, to: 3 },
  walk: { from: 4, to: 7 },
  run:  { from: 8, to: 11 },
};
/** vx 임계값 — wander baseline = 30 → walk. 60 이상 → run (현재는 reserved). */
const SLIME_WALK_THRESHOLD = 1;
const SLIME_RUN_THRESHOLD = 60;

// ── Eye glow — 단일 발광 눈 (cyclops). sprite 머리 dome 중앙에 한 점.
// container 의 child Graphics 에만 filter 적용 — 본체 sprite 누출 0%.
const SLIME_EYE_DOT_RADIUS = 1.2;
const SLIME_EYE_DOT_COLOR = 0xFFD060;        // 따뜻한 yellow core
const SLIME_EYE_GLOW_COLOR = 0xFFA830;       // amber halo
const SLIME_EYE_GLOW_RADIUS = 10;
const SLIME_EYE_GLOW_INTENSITY = 6.4;
const SLIME_EYE_GLOW_CORE_BOOST = 4.0;
/** sprite frame (23, 16) 위치 — frame center x=16 기준 +7, sprite top container y=-8 + frame y=16 = 8. */
const SLIME_EYE_OFFSET_X = 7;
const SLIME_EYE_OFFSET_Y = 8;

export class Slime extends Enemy {
  private hopTimer: number;
  private wanderDir = 1;
  private spawnX = 0;
  /** Atlas sprite — placeholder Graphics 를 가린다. */
  private slimeSprite: Sprite | null = null;
  /** 좌우 대칭 두 눈 발광 Graphics — facing 무관 (좌우 대칭이라 mirror 불필요). */
  private eyeGlow: Graphics | null = null;
  /** 12 frames (32×32) — idle/walk/run 4-4-4 분할. */
  private slimeFrames: Texture[] = [];
  private currentAnim: SlimeAnim = 'idle';
  private animTimer = 0;
  private animFrameIndex = 0;

  constructor(level = 1) {
    super({
      // 사용자 결정 (2026-05-04): 16 → 24px (이미지 사이즈 확장에 맞춤).
      width: 24,
      height: 24,
      color: 0x44cc44,
      hp: 1, atk: 1, def: 0,          // placeholder — overwritten by applyStats
      detectRange: 0, attackRange: 0,
      moveSpeed: WANDER_SPEED,
      attackCooldown: 0,
    });
    this.applyStats('Slime', level);

    this.hopTimer = HOP_TIMER_MIN + Math.random() * (HOP_TIMER_MAX - HOP_TIMER_MIN);
    if (Math.random() < 0.5) this.wanderDir = -1;
    void this.loadSlimeSprite();
  }

  /**
   * slime_01_atlas.png (384×32 = 12 × 32×32) 비동기 로드 + frame 분할.
   * idle/walk/run 4-4-4. 로드 실패 시 placeholder Graphics 유지.
   */
  private async loadSlimeSprite(): Promise<void> {
    try {
      const tex = await Assets.load<Texture>(assetPath(SLIME_SPRITE_PATH));
      if (this.container.destroyed) return;
      tex.source.scaleMode = 'nearest';
      this.slimeFrames = [];
      for (let i = 0; i < SLIME_FRAME_COUNT; i++) {
        this.slimeFrames.push(new Texture({
          source: tex.source,
          frame: new Rectangle(i * SLIME_FRAME_W, 0, SLIME_FRAME_W, SLIME_FRAME_H),
        }));
      }
      const s = new Sprite(this.slimeFrames[0]);
      // 발 중앙 기준 — sprite 가 collision 박스 발 바닥에 정렬.
      s.anchor.set(0.5, 1);
      s.x = this.width / 2;
      s.y = this.height;
      this.container.addChildAt(s, 0);
      this.slimeSprite = s;
      this.mainSprite = s; // Enemy.render hit flash 가 알파 채널 모양 따라 발광
      this.sprite.visible = false;

      // Eye glow — sprite frame (23, 16) 위치 단일 발광점. center 에서 +7 offset 라
      // facing flip 시 sprite content 와 같이 mirror 되도록 eyes.scale.x 도 update 에서 동기.
      const eyes = new Graphics();
      eyes.circle(SLIME_EYE_OFFSET_X, 0, SLIME_EYE_DOT_RADIUS).fill(SLIME_EYE_DOT_COLOR);
      eyes.x = this.width / 2;
      eyes.y = SLIME_EYE_OFFSET_Y;
      eyes.filters = [new GlowFilter({
        color: SLIME_EYE_GLOW_COLOR,
        radius: SLIME_EYE_GLOW_RADIUS,
        intensity: SLIME_EYE_GLOW_INTENSITY,
        coreBoost: SLIME_EYE_GLOW_CORE_BOOST,
      })];
      this.container.addChild(eyes);
      this.eyeGlow = eyes;
    } catch {
      // 로드 실패 → placeholder 유지.
    }
  }

  /** 현재 vx 기반 anim 결정. wander baseline = 30 → walk. ≥ 60 → run (예약). */
  private decideAnim(): SlimeAnim {
    const ax = Math.abs(this.vx);
    if (ax < SLIME_WALK_THRESHOLD) return 'idle';
    if (ax >= SLIME_RUN_THRESHOLD) return 'run';
    return 'walk';
  }

  private setAnim(next: SlimeAnim): void {
    if (this.currentAnim === next) return;
    this.currentAnim = next;
    this.animFrameIndex = 0;
    this.animTimer = 0;
  }

  /** 매 프레임 anim 진행. Skeleton.ts updateSkeletonAnim 패턴. */
  private updateSlimeAnim(dt: number): void {
    if (!this.slimeSprite || this.slimeFrames.length === 0) return;
    this.setAnim(this.decideAnim());
    this.animTimer += dt;
    while (this.animTimer >= SLIME_ANIM_FRAME_MS) {
      this.animTimer -= SLIME_ANIM_FRAME_MS;
      const range = SLIME_ANIM_RANGES[this.currentAnim];
      const span = range.to - range.from + 1;
      this.animFrameIndex = (this.animFrameIndex + 1) % span;
    }
    const range = SLIME_ANIM_RANGES[this.currentAnim];
    const tex = this.slimeFrames[range.from + this.animFrameIndex];
    if (tex) this.slimeSprite.texture = tex;
  }

  /**
   * Base Enemy.update 의 sprite flip 은 Graphics anchor (0,0) 기반이라 Sprite 에
   * 부적절. wanderDir 기반으로 facing 결정 후 별도 flip.
   */
  override update(dt: number): void {
    super.update(dt);
    // Slime 은 detectRange=0 이라 base 의 target 기반 facing 가 항상 같은 방향.
    // wanderDir 기반으로 강제 갱신.
    this.facingRight = this.wanderDir > 0;
    if (!this.isFrozen()) this.updateSlimeAnim(dt);
    const facing = this.facingRight ? 1 : -1;
    if (this.slimeSprite) this.slimeSprite.scale.x = facing;
    // 눈도 sprite content 와 함께 mirror (offset 이 center 아니므로 facing 따라야).
    if (this.eyeGlow) this.eyeGlow.scale.x = facing;
  }

  protected setupStates(): void {
    this.spawnX = this.x;

    this.fsm.addState({
      name: 'idle',
      update: (dt) => {
        // Lazy init spawnX (x is set after constructor)
        if (this.spawnX === 0) this.spawnX = this.x;

        this.vx = this.wanderDir * WANDER_SPEED;

        // Reverse direction at wander boundary
        if (this.x > this.spawnX + WANDER_RANGE) this.wanderDir = -1;
        else if (this.x < this.spawnX - WANDER_RANGE) this.wanderDir = 1;

        this.hopTimer -= dt;
        if (this.hopTimer <= 0 && this.grounded) {
          this.vy = HOP_VY;
          this.hopTimer = HOP_TIMER_MIN + Math.random() * (HOP_TIMER_MAX - HOP_TIMER_MIN);
          if (Math.random() < 0.3) this.wanderDir *= -1;
        }
      },
    });

    this.fsm.addState({
      name: 'chase',
      update: () => { this.fsm.transition('idle'); },
    });

    this.fsm.addState({
      name: 'hit',
      update: (dt) => this.stateHitUpdate(dt),
    });

    this.fsm.addState({
      name: 'death',
      update: () => {},
    });

    this.fsm.addState({ name: 'attack',   update: () => {} });
    this.fsm.addState({ name: 'cooldown', update: () => {} });
  }

  isAttackActive(): boolean {
    return false;
  }
}
