import { Assets, Graphics, Rectangle, Sprite, Texture } from 'pixi.js';
import { Enemy } from './Enemy';
import { assetPath } from '@core/AssetLoader';
import { GlowFilter } from '@effects/GlowFilter';

const PATROL_RANGE_PX = 8 * 16;
const PATROL_SPEED_MULT = 0.45;
const DETECT_CONFIRM_MS = 300;
const ATTACK_TELL_MS = 300;
const ATTACK_ACTIVE_MS = 180;
const LOSE_TARGET_MS = 1000;
const BODY_COLOR = 0x8aa0a8;
const EYE_COLOR = 0xffc15a;
const FIN_COLOR = 0x566872;
const MAWDRONE_ATLAS_JSON_PATH = 'assets/characters/mawdrone_01_atlas.json';
const EYE_GLOW_COLOR = 0xff9a36;
const BOOSTER_SMOKE_COLOR = 0x9aa2a4;
const BOOSTER_SMOKE_INTERVAL_MS = 42;
const BOOSTER_SMOKE_LIFE_MS = 420;
const BOOSTER_SMOKE_MOVE_THRESHOLD = 8;

interface AtlasSlicePoint {
  x: number;
  y: number;
}

interface MawDroneAtlas {
  frames: Array<{ frame: { x: number; y: number; w: number; h: number } }>;
  meta: {
    image: string;
    slices?: Array<{
      name: string;
      keys?: Array<{
        bounds?: { x: number; y: number; w: number; h: number };
        pivot?: { x: number; y: number };
      }>;
    }>;
  };
}

interface SmokeParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

export class MawDrone extends Enemy {
  private spawnX = 0;
  private spawnY = 0;
  private patrolDir = 1;
  private detectTimer = 0;
  private loseTargetTimer = 0;
  private attackTimer = 0;
  private attackActive = false;
  private body: Graphics | null = null;
  private bodySprite: Sprite | null = null;
  private eyeGlow: Graphics | null = null;
  private smokeLayer: Graphics | null = null;
  private eyeSlice: AtlasSlicePoint | null = null;
  private boosterSlice: AtlasSlicePoint | null = null;
  private atlasFrameW = 32;
  private atlasFrameH = 32;
  private smokeParticles: SmokeParticle[] = [];
  private smokeAccumMs = 0;

  constructor(level = 1) {
    super({
      width: 22,
      height: 18,
      color: BODY_COLOR,
      hp: 1,
      atk: 1,
      def: 0,
      detectRange: 180,
      attackRange: 20,
      moveSpeed: 52,
      attackCooldown: 1000,
    });
    this.applyStats('MawDrone', level);
    this.sprite.visible = false;
    this.buildBody();
    void this.loadBodySprite();
  }

  protected setupStates(): void {
    this.fsm.addState({
      name: 'idle',
      enter: () => {
        this.vx = 0;
        this.vy = 0;
        this.spawnX = this.x;
        this.spawnY = this.y;
      },
      update: () => {
        this.vx = 0;
        this.vy = 0;
        if (this.distToTarget() <= this.detectRange) {
          this.fsm.transition('detect');
          return;
        }
        this.fsm.transition('patrol');
      },
    });

    this.fsm.addState({
      name: 'patrol',
      enter: () => {
        if (this.spawnX === 0) {
          this.spawnX = this.x;
          this.spawnY = this.y;
        }
      },
      update: () => {
        if (this.distToTarget() <= this.detectRange) {
          this.fsm.transition('detect');
          return;
        }

        this.vx = this.patrolDir * this.moveSpeed * PATROL_SPEED_MULT;
        this.vy = Math.sin(Date.now() * 0.004) * 10;

        if (this.x > this.spawnX + PATROL_RANGE_PX) this.patrolDir = -1;
        if (this.x < this.spawnX - PATROL_RANGE_PX) this.patrolDir = 1;
      },
    });

    this.fsm.addState({
      name: 'detect',
      enter: () => {
        this.vx = 0;
        this.vy = 0;
        this.detectTimer = DETECT_CONFIRM_MS;
      },
      update: (dt) => {
        this.vx = 0;
        this.vy = 0;
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

    this.fsm.addState({
      name: 'chase',
      enter: () => {
        this.loseTargetTimer = LOSE_TARGET_MS;
      },
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

        if (dist <= this.attackRange && this.cooldownTimer <= 0) {
          this.fsm.transition('attack');
        }
      },
    });

    this.fsm.addState({
      name: 'attack',
      enter: () => {
        this.attackTimer = ATTACK_TELL_MS + ATTACK_ACTIVE_MS;
        this.attackActive = false;
        this.vx = 0;
        this.vy = 0;
      },
      update: (dt) => {
        this.attackTimer -= dt;
        this.vx = 0;
        this.vy = 0;
        this.attackActive = this.attackTimer <= ATTACK_ACTIVE_MS && this.attackTimer > 0;
        if (this.attackTimer <= 0) {
          this.attackActive = false;
          this.cooldownTimer = this.attackCooldown;
          this.fsm.transition('cooldown');
        }
      },
      exit: () => {
        this.attackActive = false;
      },
    });

    this.fsm.addState({
      name: 'cooldown',
      update: () => {
        this.vx = 0;
        this.vy = 0;
        if (this.cooldownTimer <= 0) {
          this.fsm.transition('chase');
        }
      },
    });

    this.fsm.addState({ name: 'hit', update: (dt) => this.stateHitUpdate(dt) });
    this.fsm.addState({ name: 'death', update: () => {} });
  }

  override update(dt: number): void {
    super.update(dt);
    if (!this.alive) return;

    if (this.fsm.currentState === 'patrol') {
      this.facingRight = this.patrolDir > 0;
    } else if (this.target) {
      this.facingRight = this.target.x > this.x;
    }

    const facing = this.facingRight ? 1 : -1;
    if (this.bodySprite) {
      this.bodySprite.scale.x = facing;
      this.bodySprite.alpha = 1;
    }
    if (this.body) {
      this.body.scale.x = facing;
      this.body.alpha = 1;
    }
    this.updateSliceVfx(dt, facing);
  }

  isAttackActive(): boolean {
    return this.attackActive;
  }

  private buildBody(): void {
    const smokeLayer = new Graphics();
    this.container.addChildAt(smokeLayer, 0);
    this.smokeLayer = smokeLayer;

    const body = new Graphics();
    body.ellipse(0, 0, 11, 8).fill(BODY_COLOR);
    body.circle(6, -1, 2).fill(EYE_COLOR);
    body.moveTo(-10, -4).lineTo(-17, -8).lineTo(-12, 2).closePath().fill(FIN_COLOR);
    body.moveTo(-10, 4).lineTo(-17, 8).lineTo(-12, -2).closePath().fill(FIN_COLOR);
    body.x = this.width / 2;
    body.y = this.height / 2;
    this.container.addChildAt(body, 1);
    this.body = body;
  }

  private async loadBodySprite(): Promise<void> {
    try {
      const atlas = await fetch(assetPath(MAWDRONE_ATLAS_JSON_PATH)).then(r => r.json()) as MawDroneAtlas;
      const frame = atlas.frames[0]?.frame;
      if (!frame) return;
      this.atlasFrameW = frame.w;
      this.atlasFrameH = frame.h;
      this.eyeSlice = this.readSlicePoint(atlas, 'eye');
      this.boosterSlice = this.readSlicePoint(atlas, 'booster');
      const texture = await Assets.load<Texture>(assetPath(`assets/characters/${atlas.meta.image}`));
      if (this.container.destroyed) return;
      texture.source.scaleMode = 'nearest';
      const sprite = new Sprite(new Texture({
        source: texture.source,
        frame: new Rectangle(frame.x, frame.y, frame.w, frame.h),
      }));
      sprite.anchor.set(0.5, 1);
      sprite.x = this.width / 2;
      sprite.y = this.height + 3;
      this.container.addChildAt(sprite, this.smokeLayer ? 1 : 0);
      this.bodySprite = sprite;
      this.mainSprite = sprite;
      if (this.body) this.body.visible = false;
      this.createEyeGlow();
    } catch {
      // Keep placeholder body if the atlas is unavailable.
    }
  }

  private readSlicePoint(
    atlas: MawDroneAtlas,
    name: string,
  ): AtlasSlicePoint | null {
    const slice = atlas.meta?.slices?.find(s => s.name.toLowerCase() === name.toLowerCase());
    const key = slice?.keys?.[0];
    const bounds = key?.bounds;
    if (!bounds) return null;
    const pivot = key.pivot ?? { x: bounds.w / 2, y: bounds.h / 2 };
    return {
      x: bounds.x + pivot.x,
      y: bounds.y + pivot.y,
    };
  }

  private createEyeGlow(): void {
    if (!this.eyeSlice || this.eyeGlow) return;
    const eye = new Graphics();
    eye.circle(0, 0, 1.25).fill({ color: 0xffffff, alpha: 0.95 });
    eye.circle(0, 0, 2.2).fill({ color: EYE_GLOW_COLOR, alpha: 0.45 });
    eye.filters = [new GlowFilter({
      color: EYE_GLOW_COLOR,
      radius: 8,
      intensity: 2.4,
      coreBoost: 1.4,
    })];
    eye.blendMode = 'add';
    this.container.addChild(eye);
    this.eyeGlow = eye;
  }

  private slicePointToLocal(point: AtlasSlicePoint, facing: number): { x: number; y: number } {
    const spriteX = this.bodySprite?.x ?? this.width / 2;
    const spriteY = this.bodySprite?.y ?? this.height + 3;
    const halfW = this.atlasFrameW / 2;
    const x = facing >= 0
      ? spriteX - halfW + point.x
      : spriteX + halfW - point.x;
    const y = spriteY - this.atlasFrameH + point.y;
    return { x, y };
  }

  private updateSliceVfx(dt: number, facing: number): void {
    if (this.eyeGlow && this.eyeSlice) {
      const p = this.slicePointToLocal(this.eyeSlice, facing);
      this.eyeGlow.x = p.x;
      this.eyeGlow.y = p.y;
      this.eyeGlow.alpha = 0.78 + Math.sin(Date.now() * 0.008) * 0.18;
    }

    this.updateBoosterSmoke(dt, facing);
  }

  private updateBoosterSmoke(dt: number, facing: number): void {
    if (!this.smokeLayer) return;
    const dtSec = dt / 1000;
    const speed = Math.hypot(this.vx, this.vy);
    if (this.boosterSlice && speed > BOOSTER_SMOKE_MOVE_THRESHOLD && this.bodySprite) {
      this.smokeAccumMs += dt;
      while (this.smokeAccumMs >= BOOSTER_SMOKE_INTERVAL_MS) {
        this.smokeAccumMs -= BOOSTER_SMOKE_INTERVAL_MS;
        this.spawnBoosterSmoke(facing, speed);
      }
    } else {
      this.smokeAccumMs = Math.min(this.smokeAccumMs, BOOSTER_SMOKE_INTERVAL_MS);
    }

    for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
      const p = this.smokeParticles[i];
      p.life += dt;
      p.x += p.vx * dtSec;
      p.y += p.vy * dtSec;
      p.vx *= 0.985;
      p.vy -= 3 * dtSec;
      if (p.life >= p.maxLife) this.smokeParticles.splice(i, 1);
    }

    this.smokeLayer.clear();
    for (const p of this.smokeParticles) {
      const t = p.life / p.maxLife;
      const alpha = (1 - t) * 0.42;
      const r = p.size + t * 3.2;
      this.smokeLayer.circle(p.x, p.y, r).fill({ color: BOOSTER_SMOKE_COLOR, alpha });
      this.smokeLayer.circle(p.x - 0.5, p.y - 0.5, r * 0.45).fill({ color: 0xd4d0c8, alpha: alpha * 0.42 });
    }
  }

  private spawnBoosterSmoke(facing: number, speed: number): void {
    if (!this.boosterSlice) return;
    const p = this.slicePointToLocal(this.boosterSlice, facing);
    const speedScale = Math.min(1.4, Math.max(0.45, speed / 80));
    this.smokeParticles.push({
      x: p.x + (Math.random() - 0.5) * 1.5,
      y: p.y + (Math.random() - 0.5) * 2.0,
      vx: -facing * (12 + Math.random() * 18) * speedScale,
      vy: (Math.random() - 0.5) * 10 - 4,
      life: 0,
      maxLife: BOOSTER_SMOKE_LIFE_MS + Math.random() * 160,
      size: 1.0 + Math.random() * 1.2,
    });
    if (this.smokeParticles.length > 18) this.smokeParticles.shift();
  }
}
