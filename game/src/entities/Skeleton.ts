import { Assets, Rectangle, Sprite, Texture } from 'pixi.js';
import { Enemy } from './Enemy';
import { isSolid } from '@core/Physics';
import { assetPath } from '@core/AssetLoader';

const TILE_SIZE = 16;
const SKELETON_ATTACK_FRAMES = 10;
const FRAME_MS = 1000 / 60;
const DETECT_CONFIRM_MS = 1000;  // long pause when spotting player
const PATROL_SPEED_MULT = 0.5;  // patrol_speed / chase_speed ratio
const LOSE_TARGET_MS = 1500;    // GDD §4.1: lose_target_delay_ms

/** Atlas: 384×32 (12 × 32×32). idle 0-3 / walk 4-7 / jump 8-11. */
const SKELETON_ATLAS_PNG_PATH = 'assets/characters/skeleton_01_atlas.png';
const SKELETON_FRAME_W = 32;
const SKELETON_FRAME_H = 32;
const SKELETON_FRAME_COUNT = 12;
/** JSON 의 duration 100ms 와 일치. 모든 anim 동일. */
const SKELETON_ANIM_FRAME_MS = 100;

type SkeletonAnim = 'idle' | 'walk' | 'jump';
const SKELETON_ANIM_RANGES: Record<SkeletonAnim, { from: number; to: number }> = {
  idle: { from: 0, to: 3 },
  walk: { from: 4, to: 7 },
  jump: { from: 8, to: 11 },
};

export class Skeleton extends Enemy {
  private attackTimer = 0;
  private attackActive = false;
  // Patrol state
  private spawnX = 0;
  private patrolDir = 1;
  private patrolRangePx = 4 * TILE_SIZE; // 4 tiles
  // Detect state
  private detectTimer = 0;
  // Lose target timer (Chase → Patrol fallback)
  private loseTargetTimer = 0;
  /** Atlas sprite — placeholder Graphics 를 가린다. */
  private skeletonSprite: Sprite | null = null;
  /** 12 frames (32×32) split from the 384×32 atlas. */
  private skeletonFrames: Texture[] = [];
  /** 현재 재생 중인 anim. */
  private currentAnim: SkeletonAnim = 'idle';
  /** 현재 anim 의 frame 인덱스 (range 안에서 0..count-1). */
  private animFrameIndex = 0;
  /** 현재 frame 의 누적 시간 (ms). 100ms 마다 다음 frame. */
  private animTimer = 0;

  constructor(level = 1) {
    super({
      width: 16,
      height: 24,
      color: 0xcc3333,
      hp: 1, atk: 1, def: 0,
      detectRange: 160, attackRange: 18,
      moveSpeed: 60, attackCooldown: 1200,
    });
    this.applyStats('Skeleton', level);
    void this.loadSkeletonSprite();
  }

  /**
   * skeleton_01_atlas.png (384×32 = 12 × 32×32) 비동기 로드 + frame 분할.
   * idle 0-3 / walk 4-7 / jump 8-11 (atlas JSON 의 frameTags 와 일치).
   * 로드 실패 시 base Graphics placeholder 가 그대로 보임 (안전 fallback).
   */
  private async loadSkeletonSprite(): Promise<void> {
    try {
      const tex = await Assets.load<Texture>(assetPath(SKELETON_ATLAS_PNG_PATH));
      if (this.container.destroyed) return;
      tex.source.scaleMode = 'nearest';

      // 12 frames 분할 — 가로 일렬, 32px 간격.
      this.skeletonFrames = [];
      for (let i = 0; i < SKELETON_FRAME_COUNT; i++) {
        this.skeletonFrames.push(new Texture({
          source: tex.source,
          frame: new Rectangle(i * SKELETON_FRAME_W, 0, SKELETON_FRAME_W, SKELETON_FRAME_H),
        }));
      }

      const s = new Sprite(this.skeletonFrames[0]);
      // 발 중앙 기준 — 32×32 sprite 가 16×24 collision 박스보다 커서 살짝 삐져나옴.
      s.anchor.set(0.5, 1);
      s.x = this.width / 2;
      s.y = this.height;
      this.container.addChildAt(s, 0);
      this.skeletonSprite = s;
      this.sprite.visible = false;
    } catch {
      // 로드 실패 → placeholder 유지.
    }
  }

  /**
   * 현재 fsm/물리 상태 → SkeletonAnim 결정.
   *   - airborne (grounded=false 또는 vy != 0): jump
   *   - 이동 중 (|vx| > 1): walk
   *   - 그 외: idle
   *
   * fsm state (idle / patrol / detect / chase / attack / cooldown / hit / death) 보다
   * 물리 상태 우선 — patrol 중 멈춰있으면 idle 로, attack 중에도 이동 시 walk.
   */
  private decideAnim(): SkeletonAnim {
    if (!this.grounded) return 'jump';
    if (Math.abs(this.vx) > 1) return 'walk';
    return 'idle';
  }

  /** Anim transition: frame index reset + timer 0. */
  private setAnim(next: SkeletonAnim): void {
    if (this.currentAnim === next) return;
    this.currentAnim = next;
    this.animFrameIndex = 0;
    this.animTimer = 0;
  }

  /**
   * Atlas 기반 sprite 갱신. 매 프레임 호출.
   *   1) decideAnim() → setAnim() 으로 전환 (필요 시)
   *   2) animTimer 누적 → 100ms 마다 frameIndex++ (range 안에서 wrap = loop)
   *   3) sprite.texture = frames[from + frameIndex]
   *   4) facing flip (anchor 0.5, 1 기준)
   */
  private updateSkeletonAnim(dt: number): void {
    if (!this.skeletonSprite || this.skeletonFrames.length === 0) return;

    this.setAnim(this.decideAnim());
    this.animTimer += dt;
    while (this.animTimer >= SKELETON_ANIM_FRAME_MS) {
      this.animTimer -= SKELETON_ANIM_FRAME_MS;
      const range = SKELETON_ANIM_RANGES[this.currentAnim];
      const span = range.to - range.from + 1;
      this.animFrameIndex = (this.animFrameIndex + 1) % span;
    }

    const range = SKELETON_ANIM_RANGES[this.currentAnim];
    const tex = this.skeletonFrames[range.from + this.animFrameIndex];
    if (tex) this.skeletonSprite.texture = tex;
    this.skeletonSprite.scale.x = this.facingRight ? 1 : -1;
  }

  /**
   * Base Enemy.update 가 protected sprite (Graphics) 의 facing flip 을 처리하나
   * skeletonSprite 는 anchor (0.5, 1) 기반이라 별도 처리. update 끝에 호출.
   *
   * 사용자 결정 (2026-05-03): patrol 중에는 patrolDir 기반 facing 강제. base
   * Enemy.update 가 target.x > this.x 로 facingRight 를 항상 갱신하지만 patrol
   * 중엔 player 가 멀리 있어도 임의 방향으로 잡혀 어색. patrol state 에서만
   * 덮어써 이동 방향과 facing 일치.
   */
  override update(dt: number): void {
    super.update(dt);
    if (this.fsm.currentState === 'patrol') {
      this.facingRight = this.patrolDir > 0;
    }
    this.updateSkeletonAnim(dt);
  }

  protected setupStates(): void {
    // ── Idle: spawn grace, then → Patrol ──
    this.fsm.addState({
      name: 'idle',
      enter: () => { this.vx = 0; this.spawnX = this.x; },
      update: () => {
        this.vx = 0;
        if (this.distToTarget() <= this.detectRange) {
          this.fsm.transition('detect');
          return;
        }
        this.fsm.transition('patrol');
      },
    });

    // ── Patrol: wander within patrol range, reverse at edge ──
    this.fsm.addState({
      name: 'patrol',
      enter: () => { if (this.spawnX === 0) this.spawnX = this.x; },
      update: () => {
        // Check for player detection
        if (this.distToTarget() <= this.detectRange) {
          this.fsm.transition('detect');
          return;
        }
        // Patrol movement
        const patrolSpeed = this.moveSpeed * PATROL_SPEED_MULT;
        this.vx = this.patrolDir * patrolSpeed;

        // Reverse at patrol range boundary
        if (this.x > this.spawnX + this.patrolRangePx) this.patrolDir = -1;
        if (this.x < this.spawnX - this.patrolRangePx) this.patrolDir = 1;

        // Reverse at platform edge (ground enemies don't fall during patrol)
        const feetCol = Math.floor((this.x + this.width / 2 + this.patrolDir * 8) / TILE_SIZE);
        const feetRow = Math.floor((this.y + this.height) / TILE_SIZE);
        const belowTile = this.roomData[feetRow]?.[feetCol] ?? 0;
        if (!isSolid(belowTile) && belowTile !== 3) { // no floor ahead
          this.patrolDir *= -1;
          this.vx = this.patrolDir * patrolSpeed;
        }
      },
    });

    // ── Detect: brief pause before chasing (GDD: 200ms confirm) ──
    this.fsm.addState({
      name: 'detect',
      enter: () => { this.vx = 0; this.detectTimer = DETECT_CONFIRM_MS; },
      update: (dt) => {
        this.vx = 0;
        this.detectTimer -= dt;
        // Player left detection range during confirm
        if (this.distToTarget() > this.detectRange) {
          this.fsm.transition('patrol');
          return;
        }
        if (this.detectTimer <= 0) {
          this.fsm.transition('chase');
        }
      },
    });

    // ── Chase: move toward player, body contact = damage ──
    this.fsm.addState({
      name: 'chase',
      enter: () => { this.loseTargetTimer = LOSE_TARGET_MS; },
      update: (dt) => {
        const dist = this.distToTarget();
        if (dist > this.detectRange * 1.5) {
          this.loseTargetTimer -= dt;
          if (this.loseTargetTimer <= 0) {
            this.fsm.transition('patrol');
            return;
          }
        } else {
          this.loseTargetTimer = LOSE_TARGET_MS;
        }
        this.moveTowardTarget(this.moveSpeed);
      },
    });

    // ── Attack ──
    this.fsm.addState({
      name: 'attack',
      enter: () => {
        this.attackTimer = SKELETON_ATTACK_FRAMES * FRAME_MS;
        this.attackActive = true;
        this.vx = 0;
      },
      update: (dt) => {
        this.attackTimer -= dt;
        if (this.attackTimer <= 0) {
          this.attackActive = false;
          this.cooldownTimer = this.attackCooldown;
          this.fsm.transition('cooldown');
        }
      },
      exit: () => { this.attackActive = false; },
    });

    // ── Cooldown ──
    this.fsm.addState({
      name: 'cooldown',
      update: () => {
        this.vx = 0;
        if (this.cooldownTimer <= 0) {
          this.fsm.transition('chase');
        }
      },
    });

    // ── Hit / Death ──
    this.fsm.addState({ name: 'hit', update: (dt) => this.stateHitUpdate(dt) });
    this.fsm.addState({ name: 'death', update: () => {} });
  }

  isAttackActive(): boolean {
    return this.attackActive;
  }
}
