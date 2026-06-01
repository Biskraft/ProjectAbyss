import { Assets, Rectangle, Sprite, Texture } from 'pixi.js';
import { Enemy } from './Enemy';
import { GlowFilter } from '@effects/GlowFilter';
import { hasGroundSupportAtFoot } from '@core/Physics';
import { assetPath } from '@core/AssetLoader';
import type { Rarity } from '@data/weapons';

const TILE_SIZE = 16;
const ATTACK_FRAMES = 10;
const FRAME_MS = 1000 / 60;
const DETECT_CONFIRM_MS = 1000;
const PATROL_SPEED_MULT = 0.5;
const LOSE_TARGET_MS = 1500;

// ── Skeleton atlas reuse — identical layout to Skeleton.ts. ──
// 512×32 = 16 × 32×32. idle 0-3 / walk 4-11 / jump 12-15.
// GoldenMonster wears this skin and is differentiated by a gold GlowFilter.
const SKELETON_ATLAS_PNG_PATH = 'assets/characters/skeleton_01_atlas.png';
const SKELETON_FRAME_W = 32;
const SKELETON_FRAME_H = 32;
const SKELETON_FRAME_COUNT = 16;
const SKELETON_ANIM_FRAME_MS = 100;

type GoldAnim = 'idle' | 'walk' | 'jump';
const ANIM_RANGES: Record<GoldAnim, { from: number; to: number }> = {
  idle: { from: 0, to: 3 },
  walk: { from: 4, to: 11 },
  jump: { from: 12, to: 15 },
};

// Gold glow params — strong enough to read at a glance vs regular Skeleton.
const GOLD_GLOW_COLOR = 0xFFD700;
const GOLD_GLOW_RADIUS = 3;
const GOLD_GLOW_INTENSITY = 0.5;
const GOLD_GLOW_CORE_BOOST = 0.15;

/** Rarity weights by difficulty tier */
const RARITY_WEIGHTS: Record<string, [Rarity, number][]> = {
  low: [['normal', 70], ['magic', 25], ['rare', 5]],
  mid: [['normal', 30], ['magic', 40], ['rare', 25], ['legendary', 5]],
  high: [['magic', 20], ['rare', 40], ['legendary', 30], ['ancient', 10]],
};

function pickRarity(difficulty: 'low' | 'mid' | 'high'): Rarity {
  const weights = RARITY_WEIGHTS[difficulty];
  const total = weights.reduce((s, [, w]) => s + w, 0);
  let roll = Math.random() * total;
  for (const [rarity, weight] of weights) {
    roll -= weight;
    if (roll <= 0) return rarity;
  }
  return weights[weights.length - 1][0];
}

export function getDifficultyTier(distanceFromStart: number): 'low' | 'mid' | 'high' {
  if (distanceFromStart <= 2) return 'low';
  if (distanceFromStart <= 5) return 'mid';
  return 'high';
}

export class GoldenMonster extends Enemy {
  private attackTimer = 0;
  private attackActive = false;
  private spawnX = 0;
  private patrolDir = 1;
  private patrolRangePx = 4 * TILE_SIZE;
  private detectTimer = 0;
  private loseTargetTimer = 0;

  /** Skeleton atlas overlay — identical sprite to Skeleton, gold-glowed. */
  private skeletonSprite: Sprite | null = null;
  private skeletonFrames: Texture[] = [];
  private currentAnim: GoldAnim = 'idle';
  private animFrameIndex = 0;
  private animTimer = 0;

  /** The rarity of the portal this monster will drop */
  readonly portalRarity: Rarity;

  /** Callback when this monster dies — WorldScene uses this to spawn a portal */
  onDeathCallback: ((x: number, y: number, rarity: Rarity) => void) | null = null;

  constructor(difficulty: 'low' | 'mid' | 'high', level = 1) {
    super({
      width: 18,
      height: 26,
      color: 0xffd700,
      hp: 1, atk: 1, def: 0,
      detectRange: 200, attackRange: 20,
      moveSpeed: 90, attackCooldown: 1000,
    });
    this.applyStats('GoldenMonster', level);

    this.portalRarity = pickRarity(difficulty);

    void this.loadSkeletonSprite();
  }

  /**
   * Loads skeleton_01_atlas.png and attaches a gold GlowFilter to the sprite
   * — same atlas as Skeleton, the glow is the only visual differentiator.
   * Falls back to base Graphics on load failure.
   */
  private async loadSkeletonSprite(): Promise<void> {
    try {
      const tex = await Assets.load<Texture>(assetPath(SKELETON_ATLAS_PNG_PATH));
      if (this.container.destroyed) return;
      tex.source.scaleMode = 'nearest';

      this.skeletonFrames = [];
      for (let i = 0; i < SKELETON_FRAME_COUNT; i++) {
        this.skeletonFrames.push(new Texture({
          source: tex.source,
          frame: new Rectangle(i * SKELETON_FRAME_W, 0, SKELETON_FRAME_W, SKELETON_FRAME_H),
        }));
      }

      const s = new Sprite(this.skeletonFrames[0]);
      // Foot-anchored — sprite (32×32) is wider than 18×26 collision box.
      s.anchor.set(0.5, 1);
      s.x = this.width / 2;
      s.y = this.height;

      // Gold glow — readable at a glance, distinguishes from regular Skeleton.
      s.filters = [new GlowFilter({
        color: GOLD_GLOW_COLOR,
        radius: GOLD_GLOW_RADIUS,
        intensity: GOLD_GLOW_INTENSITY,
        coreBoost: GOLD_GLOW_CORE_BOOST,
      })];

      this.container.addChildAt(s, 0);
      this.skeletonSprite = s;
      this.mainSprite = s;  // Enemy.render hit-flash overlays this sprite
      this.sprite.visible = false;
    } catch {
      // Load failed → keep Graphics placeholder.
    }
  }

  /** Physics-state → animation pick (matches Skeleton). */
  private decideAnim(): GoldAnim {
    if (!this.grounded) return 'jump';
    if (Math.abs(this.vx) > 1) return 'walk';
    return 'idle';
  }

  private setAnim(next: GoldAnim): void {
    if (this.currentAnim === next) return;
    this.currentAnim = next;
    this.animFrameIndex = 0;
    this.animTimer = 0;
  }

  /** Per-frame anim tick (matches Skeleton.updateSkeletonAnim). */
  private updateSkeletonAnim(dt: number): void {
    if (!this.skeletonSprite || this.skeletonFrames.length === 0) return;

    this.setAnim(this.decideAnim());
    this.animTimer += dt;
    while (this.animTimer >= SKELETON_ANIM_FRAME_MS) {
      this.animTimer -= SKELETON_ANIM_FRAME_MS;
      const range = ANIM_RANGES[this.currentAnim];
      const span = range.to - range.from + 1;
      this.animFrameIndex = (this.animFrameIndex + 1) % span;
    }

    const range = ANIM_RANGES[this.currentAnim];
    const tex = this.skeletonFrames[range.from + this.animFrameIndex];
    if (tex) this.skeletonSprite.texture = tex;
    this.skeletonSprite.scale.x = this.facingRight ? 1 : -1;
  }

  override update(dt: number): void {
    super.update(dt);
    // patrol facing override — base Enemy targets player but patrol wanders.
    if (this.fsm.currentState === 'patrol') {
      this.facingRight = this.patrolDir > 0;
    }
    if (!this.isFrozen()) this.updateSkeletonAnim(dt);
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
        if (this.distToTarget() <= this.detectRange) {
          this.fsm.transition('detect');
          return;
        }
        const patrolSpeed = this.moveSpeed * PATROL_SPEED_MULT;
        this.vx = this.patrolDir * patrolSpeed;
        if (!this.grounded) return;

        if (this.x > this.spawnX + this.patrolRangePx) this.patrolDir = -1;
        if (this.x < this.spawnX - this.patrolRangePx) this.patrolDir = 1;

        const probeX = this.x + this.width / 2 + this.patrolDir * 8;
        const feetY = this.y + this.height;
        if (!hasGroundSupportAtFoot(probeX, feetY, this.roomData)) {
          this.patrolDir *= -1;
          this.vx = this.patrolDir * patrolSpeed;
        }
      },
    });

    // ── Detect: brief pause before chasing ──
    this.fsm.addState({
      name: 'detect',
      enter: () => { this.vx = 0; this.detectTimer = DETECT_CONFIRM_MS; },
      update: (dt) => {
        this.vx = 0;
        this.detectTimer -= dt;
        if (this.distToTarget() > this.detectRange) {
          this.fsm.transition('patrol');
          return;
        }
        if (this.detectTimer <= 0) {
          this.fsm.transition('chase');
        }
      },
    });

    // ── Chase: move toward player ──
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
        this.attackTimer = ATTACK_FRAMES * FRAME_MS;
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

  onDeath(): void {
    super.onDeath();
    if (this.onDeathCallback) {
      this.onDeathCallback(this.x + this.width / 2, this.y, this.portalRarity);
    }
  }
}
