/**
 * AbsorbParticles.ts — Step 3 (2026-05-25) 무기 흡수 파티클.
 *
 * FloatingItemDrop 위치 (target) 주변에서 spawn → 방사형으로 시작 → target 중심으로
 * 빨려들어감 → fade out. 사용자 시나리오:
 *   "무기 주변에 무기로 흡수되는 파티클을 재생한다."
 *
 * 사용:
 *   const fx = new AbsorbParticles(targetX, targetY);
 *   entityLayer.addChild(fx.container);
 *   // update loop 안:
 *   fx.update(dt);
 *   // 종료 시:
 *   fx.destroy();
 */

import { Container, Graphics } from 'pixi.js';

const PARTICLE_COLOR_INNER = 0xfff2c4;    // 따뜻한 연한 골드
const PARTICLE_COLOR_OUTER = 0xffa41b;    // 브랜드 키 오렌지
const SPAWN_INTERVAL_MS = 35;
const PARTICLE_LIFE_MS = 850;
const SPAWN_RADIUS_MIN = 28;
const SPAWN_RADIUS_MAX = 84;

interface Particle {
  gfx: Graphics;
  startX: number;
  startY: number;
  age: number;
  life: number;
}

export class AbsorbParticles {
  readonly container: Container;
  private particles: Particle[] = [];
  private spawnTimer = 0;
  private active = true;

  /**
   * @param targetX 흡수 목적지 X (FloatingItemDrop.x)
   * @param targetY 흡수 목적지 Y (FloatingItemDrop 의 중심 — y - height/2)
   */
  constructor(private targetX: number, private targetY: number) {
    this.container = new Container();
  }

  /** 외부에서 active 토글 — 끝낼 시점 제어 (dissolve 종료 시 active=false). */
  setActive(v: boolean): void {
    this.active = v;
  }

  private spawnParticle(): void {
    const angle = Math.random() * Math.PI * 2;
    const r = SPAWN_RADIUS_MIN + Math.random() * (SPAWN_RADIUS_MAX - SPAWN_RADIUS_MIN);
    const startX = this.targetX + Math.cos(angle) * r;
    const startY = this.targetY + Math.sin(angle) * r;

    const gfx = new Graphics();
    // 작은 다이아 (1.5px) — outer 오렌지 + inner 골드.
    gfx.circle(0, 0, 2.2).fill({ color: PARTICLE_COLOR_OUTER, alpha: 0.55 });
    gfx.circle(0, 0, 1.2).fill({ color: PARTICLE_COLOR_INNER, alpha: 0.95 });
    gfx.x = startX;
    gfx.y = startY;
    this.container.addChild(gfx);

    this.particles.push({
      gfx,
      startX,
      startY,
      age: 0,
      life: PARTICLE_LIFE_MS,
    });
  }

  update(dt: number): void {
    if (this.active) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnParticle();
        this.spawnTimer = SPAWN_INTERVAL_MS;
      }
    }
    // 진행 + cleanup
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += dt;
      const t = Math.min(1, p.age / p.life);
      // ease-in 가속 (target 가까이 갈수록 빠름).
      const k = t * t;
      const x = p.startX + (this.targetX - p.startX) * k;
      const y = p.startY + (this.targetY - p.startY) * k;
      p.gfx.x = x;
      p.gfx.y = y;
      // 후반 30% 동안 alpha + scale fade.
      const fadeT = Math.max(0, (t - 0.7) / 0.3);
      const alphaMul = 1 - fadeT;
      const scale = 1 - fadeT * 0.5;
      p.gfx.alpha = alphaMul;
      p.gfx.scale.set(scale);
      if (t >= 1) {
        if (p.gfx.parent) p.gfx.parent.removeChild(p.gfx);
        p.gfx.destroy();
        this.particles.splice(i, 1);
      }
    }
  }

  /** 모든 입자가 사라졌는지 (외부 cleanup 판단용). */
  isDone(): boolean {
    return !this.active && this.particles.length === 0;
  }

  destroy(): void {
    for (const p of this.particles) {
      if (p.gfx.parent) p.gfx.parent.removeChild(p.gfx);
      p.gfx.destroy();
    }
    this.particles.length = 0;
    if (this.container.parent) this.container.parent.removeChild(this.container);
    this.container.destroy({ children: true });
  }
}
