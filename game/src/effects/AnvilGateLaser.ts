import { Container, Graphics } from 'pixi.js';
import { GlowFilter } from '@effects/GlowFilter';

type LaserPhase = 'hold' | 'burst' | 'max_hold' | 'decay' | 'done';

interface BeamParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  r: number;
  color: number;
}

const HOLD_THICKNESS = 1.5;
const MAX_BURST_HALF_WIDTH = 55;
const MAX_BURST_HOLD_MS = 1000;
const BURST_GROWTH_PER_MS = 1.1;
const DECAY_PER_MS = 0.13;
const SOURCE_TAPER_PIXELS = 38;

export class LegacyAnvilGateLaser {
  readonly container = new Container();

  private readonly sourceLight = new Graphics();
  private readonly beam = new Graphics();
  private readonly impact = new Graphics();
  private readonly particleGfx = new Graphics();
  private readonly sourceX: number;
  private readonly sourceY: number;
  private readonly targetX: number;
  private readonly length: number;
  private phase: LaserPhase = 'hold';
  private holdElapsed = 0;
  private maxHoldElapsed = 0;
  private beamHalfWidth = HOLD_THICKNESS;
  private flash = 0;
  private impactGlow = 0;
  private sourceBurst = 0;
  private shake = 0;
  private particles: BeamParticle[] = [];

  get isDone(): boolean {
    return this.phase === 'done';
  }

  constructor(sourceX: number, sourceY: number, targetX: number) {
    this.sourceX = sourceX;
    this.sourceY = sourceY;
    this.targetX = Math.max(sourceX + 16, targetX);
    this.length = this.targetX - this.sourceX;
    this.container.blendMode = 'add';
    this.container.filters = [new GlowFilter({
      color: 0xffa23a,
      radius: 18,
      intensity: 1.7,
      coreBoost: 0.75,
    })];
    this.container.addChild(this.sourceLight, this.beam, this.impact, this.particleGfx);
  }

  update(dtMs: number): void {
    if (this.phase === 'done') return;

    if (this.phase === 'hold') {
      this.holdElapsed += dtMs;
      this.beamHalfWidth = HOLD_THICKNESS + Math.sin(performance.now() * 0.04) * 0.4;
      this.impactGlow = Math.min(0.45, this.holdElapsed / 1000 * 0.7);
    } else if (this.phase === 'burst') {
      this.beamHalfWidth = Math.min(MAX_BURST_HALF_WIDTH, this.beamHalfWidth + dtMs * BURST_GROWTH_PER_MS);
      this.flash = Math.max(0.24, this.flash - dtMs * 0.007);
      this.sourceBurst = Math.max(0.5, this.sourceBurst - dtMs * 0.0045);
      this.shake = Math.max(0, this.shake - dtMs * 0.005);
      this.impactGlow = Math.max(0.75, this.impactGlow - dtMs * 0.003);
      if (this.beamHalfWidth >= MAX_BURST_HALF_WIDTH) {
        this.beamHalfWidth = MAX_BURST_HALF_WIDTH;
        this.maxHoldElapsed = 0;
        this.phase = 'max_hold';
      }
    } else if (this.phase === 'max_hold') {
      this.maxHoldElapsed += dtMs;
      this.beamHalfWidth = MAX_BURST_HALF_WIDTH;
      const pulse = (Math.sin(performance.now() * 0.08) + 1) * 0.5;
      this.flash = 0.14 + pulse * 0.08;
      this.sourceBurst = 0.36 + pulse * 0.14;
      this.shake = Math.max(0, this.shake - dtMs * 0.006);
      this.impactGlow = 0.72 + pulse * 0.16;
      if (this.maxHoldElapsed >= MAX_BURST_HOLD_MS) this.phase = 'decay';
    } else if (this.phase === 'decay') {
      this.beamHalfWidth = Math.max(0, this.beamHalfWidth - dtMs * DECAY_PER_MS);
      this.flash = Math.max(0, this.flash - dtMs * 0.004);
      this.impactGlow = Math.max(0, this.impactGlow - dtMs * 0.0015);
      this.sourceBurst = Math.max(0, this.sourceBurst - dtMs * 0.002);
      if (this.beamHalfWidth <= 0) this.phase = 'done';
    }

    this.updateParticles(dtMs / 1000);
    this.render();
  }

  burst(): void {
    if (this.phase !== 'hold') return;
    this.phase = 'burst';
    this.maxHoldElapsed = 0;
    this.flash = 1;
    this.sourceBurst = 1;
    this.shake = 18;
    this.impactGlow = 1;
    for (let i = 0; i < 52; i++) this.spawnParticle();
  }

  consumeShake(): number {
    if (this.phase === 'burst') return this.shake * 0.18;
    if (this.phase === 'max_hold') return this.shake * 0.08;
    return 0;
  }

  private spawnParticle(): void {
    const a = (Math.random() - 0.5) * Math.PI * 1.3;
    const speed = 70 + Math.random() * 210;
    this.particles.push({
      x: this.targetX,
      y: this.sourceY + (Math.random() - 0.5) * 20,
      vx: -Math.abs(Math.cos(a) * speed),
      vy: Math.sin(a) * speed,
      life: 0,
      maxLife: 0.35 + Math.random() * 0.35,
      r: 1 + Math.random() * 2.5,
      color: Math.random() < 0.4 ? 0xffffff : 0xffa24a,
    });
  }

  private updateParticles(dt: number): void {
    for (const p of this.particles) {
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 300 * dt;
    }
    this.particles = this.particles.filter(p => p.life < p.maxLife);
  }

  private render(): void {
    this.sourceLight.clear();
    this.beam.clear();
    this.impact.clear();
    this.particleGfx.clear();
    if (this.phase === 'done') return;

    this.renderSourceLight();

    const hw = Math.max(0, this.beamHalfWidth);
    const glowR = hw * 4;
    const haloAlpha = Math.min(0.55, hw * 0.009) + this.flash * 0.15;
    const beamStartX = this.sourceX + Math.min(SOURCE_TAPER_PIXELS, this.length * 0.45);

    if (hw > 1) {
      this.beam
        .poly([
          this.sourceX, this.sourceY - Math.max(2, glowR * 0.12),
          beamStartX, this.sourceY - glowR,
          this.targetX, this.sourceY - glowR,
          this.targetX, this.sourceY + glowR,
          beamStartX, this.sourceY + glowR,
          this.sourceX, this.sourceY + Math.max(2, glowR * 0.12),
        ])
        .fill({ color: 0xff5a28, alpha: haloAlpha * 0.35 });
      this.beam
        .poly([
          this.sourceX, this.sourceY - Math.max(1, hw * 0.16),
          beamStartX, this.sourceY - hw * 1.7,
          this.targetX, this.sourceY - hw * 1.7,
          this.targetX, this.sourceY + hw * 1.7,
          beamStartX, this.sourceY + hw * 1.7,
          this.sourceX, this.sourceY + Math.max(1, hw * 0.16),
        ])
        .fill({ color: 0xff8a30, alpha: Math.min(0.85, 0.25 + hw * 0.012) });
    }

    const coreHalf = Math.max(1, hw * 0.28);
    const hotHalf = Math.max(1, hw * 0.12);
    this.beam
      .poly([
        this.sourceX, this.sourceY - Math.max(0.6, coreHalf * 0.18),
        beamStartX, this.sourceY - coreHalf,
        this.targetX, this.sourceY - coreHalf,
        this.targetX, this.sourceY + coreHalf,
        beamStartX, this.sourceY + coreHalf,
        this.sourceX, this.sourceY + Math.max(0.6, coreHalf * 0.18),
      ])
      .fill({ color: 0xffffff, alpha: 0.92 });
    this.beam
      .poly([
        this.sourceX, this.sourceY - Math.max(0.5, hotHalf * 0.15),
        beamStartX, this.sourceY - hotHalf,
        this.targetX, this.sourceY - hotHalf,
        this.targetX, this.sourceY + hotHalf,
        beamStartX, this.sourceY + hotHalf,
        this.sourceX, this.sourceY + Math.max(0.5, hotHalf * 0.15),
      ])
      .fill({ color: 0xfff2a0, alpha: 0.95 });

    const impactR = 16 + this.impactGlow * 52 + this.flash * 28;
    this.impact
      .circle(this.targetX, this.sourceY, impactR)
      .fill({ color: 0xff3b22, alpha: Math.min(0.55, this.impactGlow * 0.55 + this.flash * 0.3) });
    this.impact
      .circle(this.targetX, this.sourceY, Math.max(5, impactR * 0.35))
      .fill({ color: 0xffffff, alpha: Math.min(0.85, this.impactGlow * 0.75 + this.flash * 0.6) });

    for (const p of this.particles) {
      const k = 1 - p.life / p.maxLife;
      this.particleGfx
        .circle(p.x, p.y, p.r * k)
        .fill({ color: p.color, alpha: Math.max(0, k) });
    }
  }

  private renderSourceLight(): void {
    const now = performance.now();
    const pulse = (Math.sin(now * 0.055) + 1) * 0.5;
    const pulseFast = (Math.sin(now * 0.11) + 1) * 0.5;
    const activeAlpha = this.phase === 'hold' ? 1 : Math.max(this.flash, this.sourceBurst);
    const burstRadius = this.sourceBurst * 72;
    const baseRadius = 18 + pulse * 9;
    const ringRadius = 32 + pulseFast * 20 + burstRadius;

    this.sourceLight
      .circle(this.sourceX, this.sourceY, 54 + burstRadius * 0.75)
      .fill({ color: 0xff3b22, alpha: activeAlpha * (0.14 + this.sourceBurst * 0.2) });
    this.sourceLight
      .circle(this.sourceX, this.sourceY, ringRadius)
      .fill({ color: 0xff8a30, alpha: activeAlpha * (0.18 + pulse * 0.16) });
    this.sourceLight
      .circle(this.sourceX, this.sourceY, baseRadius + this.sourceBurst * 34)
      .fill({ color: 0xfff0a8, alpha: activeAlpha * 0.46 });
    this.sourceLight
      .circle(this.sourceX, this.sourceY, 7 + pulseFast * 3 + this.sourceBurst * 16)
      .fill({ color: 0xffffff, alpha: activeAlpha * 0.92 });
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
