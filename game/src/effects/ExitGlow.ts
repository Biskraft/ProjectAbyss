/**
 * ExitGlow.ts
 *
 * Room-transition Light Bleed — 주황 글로우가 방 출구(열린 가장자리 타일 구간)
 * 에서 방 안쪽으로 번져 나오는 시각 언어. "주황빛이 새어 나오는 곳 = 출구"의
 * 공통 규칙을 확립해 플레이어가 화면 가장자리를 벽으로 오인하는 현상을 줄인다.
 *
 * 근거: Documents/Research/RoomTransition_Readability_Research.md 2층(A2)
 *
 * 현재 스펙:
 *  - 글로우 두께 `GLOW_REACH` = 40px 고정 (거리 확장 없음 — 이전 확장 방식은
 *    "잡아먹히는" 느낌을 줬다는 플레이테스트 피드백 반영).
 *  - 맥동 alpha = 0.3 + sin(t)*0.1 (전투 시야 방해 최소화).
 *  - 거리 반응은 **먼지 파티클**로 옮김. 출구에서 안쪽 10타일(160px) 구간에
 *    작은 먼지 입자들이 떠다니며, 플레이어가 가까울수록 alpha 0 → 0.39 로
 *    페이드인 → "출구에서 무언가 새어 나온다"는 힌트를 유지하면서
 *    공간감(= 공기 흐름)을 연출한다.
 *
 * 구현:
 *  - 방향별(left/right/up/down) 직사각형 stack(5 band)으로 근사 gradient.
 *  - ADD 블렌드 모드로 "빛이 스며드는" 인상 강조.
 *  - 포지션·길이는 LdtkWorldScene이 collisionGrid 에지 스캔으로 계산해 주입.
 *  - 매 프레임 `setPlayer(px, py)` 로 플레이어 월드 좌표를 받아 먼지 알파 갱신.
 */

import { Container, Graphics } from 'pixi.js';

const GLOW_COLOR = 0xe07028;
const GLOW_REACH = 40;            // px inward from edge (고정)
const GLOW_BANDS = 5;             // quantized gradient bands
const PULSE_PERIOD_MS = 1000;
const PULSE_BASE = 0.6;   // 0.3 * 2 — 가시성 2배 강화
const PULSE_AMP = 0.2;    // 0.1 * 2 — 맥동 폭도 동일 비율

// --- Dust particles ---------------------------------------------------------
/** 먼지가 퍼지는 방 안쪽 깊이 (10 타일 = 원본 4타일의 2.5배). */
const DUST_REACH_TILES = 10;
const DUST_REACH = DUST_REACH_TILES * 16;
/** 에지 1타일(16px)당 먼지 개수 — span 길이에 비례해 총량 결정. */
const DUST_PER_TILE = 2.2;
const DUST_MIN_COUNT = 8;
const DUST_MAX_COUNT = 56;
const DUST_COLOR = 0xffd8a8;
/** 거리 반응: 이 거리 이하 → 최대 알파. */
const DUST_CLOSE_DIST = 48;
/** 이 거리 이상 → 알파 0. */
const DUST_FAR_DIST = 256;
const DUST_MAX_ALPHA = 0.39;     // 0.3 * 1.3 — 30% 진하게
const DUST_ALPHA_LERP = 0.08;     // 프레임당 그룹 알파 보간
/**
 * proximityFactor=1 일 때 먼지 드리프트 속도 배수.
 * "가까이 갈수록 바람이 세진다" 감각의 핵심 파라미터.
 */
const DUST_DRIFT_CLOSE_MULT = 2.5;
/**
 * 예비 파티클 풀 배수. 기본 개수 대비 이 배수만큼 더 생성하고,
 * 예비 파티클은 proximityFactor 에 비례해 알파로 페이드인 —
 * 근접 시 "밀도가 올라간다" 체감.
 */
const DUST_DENSITY_BOOST = 1.8;
/** 개별 입자 반경(px). 1~2. */
const DUST_RADIUS_MIN = 0.6;
const DUST_RADIUS_MAX = 1.4;
/** 입자 드리프트 속도(px/ms) — 방 안쪽으로 천천히. */
const DUST_DRIFT_MIN = 0.004;
const DUST_DRIFT_MAX = 0.012;
/** 입자 수명(ms). 태어날 때 랜덤. */
const DUST_LIFE_MIN = 1800;
const DUST_LIFE_MAX = 3600;

export type ExitGlowDir = 'left' | 'right' | 'up' | 'down';

interface DustParticle {
  /** Position in container-local coordinates. */
  x: number;
  y: number;
  /** Drift direction (unit) * speed. */
  vx: number;
  vy: number;
  r: number;
  lifeMs: number;
  ageMs: number;
}

export class ExitGlow {
  readonly container: Container;
  private gfx: Graphics;
  private dustGfx: Graphics;
  private span: number;
  private dir: ExitGlowDir;

  /** 에지 선분의 양 끝점 (월드 좌표). setPlayer 거리 계산용. */
  private ax: number;
  private ay: number;
  private bx: number;
  private by: number;

  private particles: DustParticle[] = [];

  /** 거리 기반 먼지 그룹 알파 — 0 → DUST_MAX_ALPHA 사이 lerp 추종. */
  private dustAlpha = 0;
  private dustTargetAlpha = 0;
  /** 0(far) → 1(close). setPlayer 에서 계산되어 드리프트/밀도에 반영. */
  private proximityFactor = 0;
  /** 기본 파티클 개수(예비 풀 분리 기준). spawnInitialParticles 에서 캐시. */
  private baseCount = 0;

  /**
   * @param dir   which edge the opening belongs to. Light points from edge
   *              into the room (i.e. 'right' edge → glow bleeds leftward).
   * @param x,y   world-space anchor of the opening (top-left of the edge run).
   * @param span  length of the opening along the edge in pixels (= tiles*16).
   */
  constructor(dir: ExitGlowDir, x: number, y: number, span: number) {
    this.dir = dir;
    this.span = span;
    this.container = new Container();
    this.container.x = x;
    this.container.y = y;
    // Additive so the glow feels like emitted light, not painted fill.
    this.container.blendMode = 'add';

    this.gfx = new Graphics();
    this.container.addChild(this.gfx);

    // Dust 레이어: 그룹 알파를 container 알파와 분리해서 독립 제어.
    this.dustGfx = new Graphics();
    this.dustGfx.alpha = 0;
    this.container.addChild(this.dustGfx);

    // Compute edge segment endpoints in world space.
    this.ax = x;
    this.ay = y;
    if (dir === 'right' || dir === 'left') {
      this.bx = x;
      this.by = y + span;
    } else {
      this.bx = x + span;
      this.by = y;
    }

    this.spawnInitialParticles();
    this.draw(PULSE_BASE);
    this.drawDust();
  }

  /**
   * 플레이어의 월드 좌표(캐릭터 중앙)를 매 프레임 주입.
   * 에지 선분에 대한 최단거리를 계산해 먼지 알파 목표값을 갱신.
   */
  setPlayer(playerX: number, playerY: number): void {
    const dist = this.pointToSegmentDist(playerX, playerY);
    const t = clamp01((DUST_FAR_DIST - dist) / (DUST_FAR_DIST - DUST_CLOSE_DIST));
    this.dustTargetAlpha = DUST_MAX_ALPHA * t;
    this.proximityFactor = t;
  }

  update(dt: number): void {
    // 공용 시계로 위상 계산 — 모든 ExitGlow 인스턴스가 같은 박자로 숨쉰다.
    // 내부 누적 시간을 쓰면 인스턴스 생성 시점에 따라 위상이 갈려
    // 여러 출구가 제각각 맥동 → "출구들이 살아있다" 통일감이 깨진다.
    const phase = (performance.now() % PULSE_PERIOD_MS) / PULSE_PERIOD_MS;
    const alpha = PULSE_BASE + PULSE_AMP * Math.sin(phase * Math.PI * 2);
    this.draw(alpha);

    // 먼지 그룹 알파 보간 + 파티클 시뮬 + 렌더.
    this.dustAlpha += (this.dustTargetAlpha - this.dustAlpha) * DUST_ALPHA_LERP;
    this.dustGfx.alpha = this.dustAlpha;
    this.updateParticles(dt);
    this.drawDust();
  }

  // -------------------------------------------------------------------------
  // Particle system
  // -------------------------------------------------------------------------

  private particleCount(): number {
    const raw = Math.round((this.span / 16) * DUST_PER_TILE);
    return clamp(raw, DUST_MIN_COUNT, DUST_MAX_COUNT);
  }

  private spawnInitialParticles(): void {
    this.baseCount = this.particleCount();
    const total = Math.round(this.baseCount * DUST_DENSITY_BOOST);
    for (let i = 0; i < total; i++) {
      this.particles.push(this.makeParticle(true));
    }
  }

  /**
   * 새 파티클 생성. `stagger=true` 이면 에지~4타일 구간에 골고루 분포 (초기 spawn).
   * `stagger=false` 이면 에지 근처에서 태어나 바깥쪽으로 드리프트 (respawn).
   */
  private makeParticle(stagger: boolean): DustParticle {
    // 드리프트 단위벡터 — 에지 안쪽 방향.
    let dx = 0, dy = 0;
    if (this.dir === 'right') dx = -1;
    else if (this.dir === 'left') dx = 1;
    else if (this.dir === 'down') dy = -1;
    else dy = 1; // up

    // 에지 축에 따른 랜덤 위치.
    const alongT = Math.random();
    const depthT = stagger ? Math.random() : Math.random() * 0.2; // respawn 은 edge 근처
    const depth = depthT * DUST_REACH;

    // container-local 좌표로 변환.
    let px = 0, py = 0;
    if (this.dir === 'right') {
      px = -depth;                  // inward = -x
      py = alongT * this.span;
    } else if (this.dir === 'left') {
      px = depth;                   // inward = +x
      py = alongT * this.span;
    } else if (this.dir === 'down') {
      px = alongT * this.span;
      py = -depth;                  // inward = -y
    } else { // up
      px = alongT * this.span;
      py = depth;                   // inward = +y
    }

    const speed = randRange(DUST_DRIFT_MIN, DUST_DRIFT_MAX);
    // 살짝 수직 jitter로 "떠다니는" 느낌.
    const jitter = (Math.random() - 0.5) * speed * 0.3;
    let vx: number, vy: number;
    if (this.dir === 'right' || this.dir === 'left') {
      vx = dx * speed;
      vy = jitter;
    } else {
      vx = jitter;
      vy = dy * speed;
    }

    return {
      x: px,
      y: py,
      vx, vy,
      r: randRange(DUST_RADIUS_MIN, DUST_RADIUS_MAX),
      lifeMs: randRange(DUST_LIFE_MIN, DUST_LIFE_MAX),
      ageMs: stagger ? Math.random() * DUST_LIFE_MIN : 0,
    };
  }

  private updateParticles(dt: number): void {
    // 플레이어가 가까우면 바람이 세지는 느낌 — 드리프트 속도 proximity 반응.
    const driftMult = 1 + (DUST_DRIFT_CLOSE_MULT - 1) * this.proximityFactor;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.x += p.vx * dt * driftMult;
      p.y += p.vy * dt * driftMult;
      p.ageMs += dt;
      // 4타일을 벗어났거나 수명 종료 → 에지에서 재생성.
      const depth = this.localDepth(p.x, p.y);
      if (p.ageMs >= p.lifeMs || depth > DUST_REACH || depth < -1) {
        this.particles[i] = this.makeParticle(false);
      }
    }
  }

  /** container-local 좌표를 "에지로부터 안쪽 깊이(px)"로 변환. */
  private localDepth(x: number, y: number): number {
    if (this.dir === 'right') return -x;
    if (this.dir === 'left')  return x;
    if (this.dir === 'down')  return -y;
    return y; // up
  }

  private drawDust(): void {
    const g = this.dustGfx;
    g.clear();
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const lifeT = p.ageMs / p.lifeMs;
      // 수명 앞/뒤 15%는 페이드인/아웃.
      let lifeAlpha: number;
      if (lifeT < 0.15) lifeAlpha = lifeT / 0.15;
      else if (lifeT > 0.85) lifeAlpha = (1 - lifeT) / 0.15;
      else lifeAlpha = 1;
      lifeAlpha = clamp01(lifeAlpha);
      // baseCount 이후의 예비 파티클은 proximity 에 비례해 페이드인 →
      // 멀리 있을 땐 기본 밀도, 가까워지면 DUST_DENSITY_BOOST 배까지 증가.
      const densityMask = i < this.baseCount ? 1 : this.proximityFactor;
      g.circle(p.x, p.y, p.r).fill({ color: DUST_COLOR, alpha: lifeAlpha * densityMask });
    }
  }

  // -------------------------------------------------------------------------
  // Main glow (fixed reach)
  // -------------------------------------------------------------------------

  private pointToSegmentDist(px: number, py: number): number {
    const dx = this.bx - this.ax;
    const dy = this.by - this.ay;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return Math.hypot(px - this.ax, py - this.ay);
    const t = clamp01(((px - this.ax) * dx + (py - this.ay) * dy) / len2);
    const cx = this.ax + t * dx;
    const cy = this.ay + t * dy;
    return Math.hypot(px - cx, py - cy);
  }

  private draw(baseAlpha: number): void {
    const g = this.gfx;
    g.clear();
    const step = GLOW_REACH / GLOW_BANDS;
    for (let i = 0; i < GLOW_BANDS; i++) {
      // Band 0 sits closest to the edge (brightest); band N-1 is the furthest
      // inward band (dimmest). Quadratic falloff reads as a soft gradient.
      const t = i / (GLOW_BANDS - 1 || 1);
      const bandAlpha = baseAlpha * (1 - t) * (1 - t);
      let rx = 0, ry = 0, rw = 0, rh = 0;
      if (this.dir === 'right') {
        rx = -step * (i + 1);
        ry = 0;
        rw = step;
        rh = this.span;
      } else if (this.dir === 'left') {
        rx = step * i;
        ry = 0;
        rw = step;
        rh = this.span;
      } else if (this.dir === 'down') {
        rx = 0;
        ry = -step * (i + 1);
        rw = this.span;
        rh = step;
      } else { // 'up'
        rx = 0;
        ry = step * i;
        rw = this.span;
        rh = step;
      }
      g.rect(rx, ry, rw, rh).fill({ color: GLOW_COLOR, alpha: bandAlpha });
    }
  }

  destroy(): void {
    if (this.container.parent) this.container.parent.removeChild(this.container);
    this.container.destroy({ children: true });
  }
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function randRange(lo: number, hi: number): number {
  return lo + Math.random() * (hi - lo);
}
