import { Container, Graphics } from 'pixi.js';
import { destroyDisplayObject } from '../scenes/shared/DisplayObjectLifecycleHelpers';
import { clampEffect01 } from './EffectNumeric';

interface SuctionParticle {
  /** 현재 위치 (링 로컬 좌표 — container 가 portal 중심에 anchor). */
  x: number;
  y: number;
  /** 시작 반경 (외곽 spawn). */
  startR: number;
  /** 각도 (radian). */
  angle: number;
  /** 잔여 수명 (ms). */
  life: number;
  /** 최초 수명 (ms). */
  maxLife: number;
}

const PARTICLE_MAX = 24;
const PARTICLE_SPAWN_PER_SEC_MAX = 80;
const PARTICLE_LIFE_MS = 380;
const PARTICLE_START_RADIUS_MIN = 32;
const PARTICLE_START_RADIUS_RANGE = 28;

export class PortalRingEffect {
  readonly container = new Container();
  private readonly gfx = new Graphics();
  private readonly particleGfx = new Graphics();
  private particles: SuctionParticle[] = [];
  private spawnCarry = 0;
  private timer = 0;

  constructor(
    private readonly portalX: number,
    private readonly portalY: number,
    private readonly color: number,
    private readonly portalContainer: Container | null,
  ) {
    this.container.addChild(this.particleGfx);
    this.container.addChild(this.gfx);
    this.container.position.set(portalX, portalY);
  }

  update(dt: number, intensity: number): void {
    this.timer += dt;
    const p = clampEffect01(intensity);
    const pulse = 1 + Math.sin(this.timer * 0.018) * 0.08 + p * 0.18;
    const radius = 18 + p * 14;
    this.gfx.clear();
    this.gfx.circle(0, 0, radius * pulse)
      .stroke({ color: this.color, width: 2 + p * 2, alpha: 0.35 + p * 0.45 });
    this.gfx.circle(0, 0, radius * 0.55 * pulse)
      .fill({ color: 0xffffff, alpha: 0.08 + p * 0.14 });

    this.updateSuctionParticles(dt, p);

    // portalContainer(=anvil 또는 portal entity) 의 scale 변경은 제거됨
    // (2026-05-20 사용자 요청 — 무기/anvil 본래 크기 유지). alpha 만 보장.
    if (this.portalContainer) {
      this.portalContainer.alpha = 1;
    }
  }

  destroy(): void {
    if (this.portalContainer) {
      this.portalContainer.alpha = 1;
    }
    this.particles = [];
    destroyDisplayObject(this.container, { children: true });
  }

  /**
   * 외곽에서 링 중심으로 흡인되는 파티클 — activate/peel 동안 active.
   * 각 파티클은 startR 에서 r=0 으로 시간에 따라 줄어들며 가속.
   */
  private updateSuctionParticles(dt: number, intensity: number): void {
    // Spawn — intensity 가 0 일 때 0, 1 일 때 PARTICLE_SPAWN_PER_SEC_MAX.
    const spawnPerSec = PARTICLE_SPAWN_PER_SEC_MAX * intensity;
    this.spawnCarry += spawnPerSec * (dt / 1000);
    while (this.spawnCarry >= 1 && this.particles.length < PARTICLE_MAX) {
      this.spawnCarry -= 1;
      const startR = PARTICLE_START_RADIUS_MIN + Math.random() * PARTICLE_START_RADIUS_RANGE;
      const angle = Math.random() * Math.PI * 2;
      this.particles.push({
        x: Math.cos(angle) * startR,
        y: Math.sin(angle) * startR,
        startR,
        angle,
        life: PARTICLE_LIFE_MS,
        maxLife: PARTICLE_LIFE_MS,
      });
    }

    // Tick + draw.
    this.particleGfx.clear();
    const alive: SuctionParticle[] = [];
    for (const pt of this.particles) {
      pt.life -= dt;
      if (pt.life <= 0) continue;
      const k = pt.life / pt.maxLife;            // 1 → 0
      // 가속 곡선 — k^2 로 끌려들어감.
      const r = pt.startR * (k * k);
      pt.x = Math.cos(pt.angle) * r;
      pt.y = Math.sin(pt.angle) * r;
      const a = Math.min(1, k * 1.3);
      this.particleGfx
        .rect(Math.round(pt.x), Math.round(pt.y), 2, 2)
        .fill({ color: this.color, alpha: 0.45 + a * 0.4 });
      this.particleGfx
        .rect(Math.round(pt.x), Math.round(pt.y), 1, 1)
        .fill({ color: 0xffffff, alpha: 0.55 * a });
      alive.push(pt);
    }
    this.particles = alive;
  }
}
