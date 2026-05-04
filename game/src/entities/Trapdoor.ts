/**
 * Trapdoor.ts — DEC-039 트랩도어 침강 (Trapdoor Descent) 포탈.
 *
 * 보스 처치 직후 보스 룸 바닥에 spawn 되는 능동 인터랙트 포탈. 공격 키 입력
 * 시 ItemWorldScene 의 descent_fall 시퀀스를 트리거한다.
 *
 * 시각:
 *   - 오렌지 단조열(forge ember) 빛기둥. 폴리시 단계에서 PixelLab 스프라이트 + 셰이더로
 *     교체. 1차 구현은 Graphics 만으로 빛기둥 + 호흡 펄스 + ember 입자.
 *
 * 인터랙션:
 *   - proximity 검사 (isPlayerNear) 만 책임. KeyPrompt UI 는 ItemWorldScene 측이
 *     Anvil 표준 패턴 (KeyPrompt.createPrompt + uiContainer 추가 + world→screen 변환)
 *     으로 직접 관리.
 *   - 별도 인터랙트 키 신설 없음 — 기존 공격 키 (Anvil/ItemDrop 패턴 동일).
 *   - 한번 activate 되면 entity 비활성 (씬 측에서 destroy 결정).
 *
 * 비-충돌:
 *   - injectCollision 없음. 플레이어가 위에 서있을 수 있어야 한다 (proximity 진입).
 *
 * 디자인 참조:
 *   - DEC-039 §결정 사항 1 — Trapdoor 폴 다운 전이.
 *   - Documents/Design/Design_ItemWorld_DeepDive.md §5 안 D 룰 4 — 능동 포탈 인터랙트.
 *   - Documents/Design/Design_ItemWorld_Town_Shadow.md §5.4 — Boss 처치 후 D 활성.
 */

import { Container, Graphics } from 'pixi.js';
import { GlowFilter } from '@effects/GlowFilter';

const FORGE_EMBER_COLOR = 0xff8000;   // CLAUDE.md 토큰 — orange #FF8000
const EMBER_GLOW_COLOR = 0xffaa44;
const PILLAR_INNER_COLOR = 0xffd35a;  // 펄스 중심 — 단조열 핵
const DEFAULT_PROXIMITY = 120;        // px — 보스 룸 중앙 점유물. 공중 부유 보스에 대비해 넉넉하게.

interface EmberSpark {
  gfx: Graphics;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

const SPARK_INTERVAL_MS = 130;
const MAX_SPARKS = 12;

// KeyPrompt UI 는 ItemWorldScene 의 updateTrapdoor 가 anvilPrompt 패턴으로 직접
// 관리한다. Trapdoor 본체는 빛기둥/입자/proximity 검사만 책임.

export class Trapdoor {
  container: Container;
  /** Pivot bottom-center (entity 다른 룸 prop 과 정합). */
  x: number;
  y: number;
  width = 24;
  height = 32;

  /** True 일 때 인터랙트 가능. activate() 후 false. */
  active = true;
  /** activate 처리 완료 표식 — Scene 측에서 transitionState 시작 후 set. */
  consumed = false;

  private pillar: Graphics;
  private sparks: EmberSpark[] = [];
  private sparkTimer = 0;
  private timer = 0;
  private proximity = DEFAULT_PROXIMITY;

  /**
   * @param x bottom-center 픽셀 좌표 X
   * @param y bottom-center 픽셀 좌표 Y (보스 룸 floor 라인)
   */
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.container = new Container();
    this.container.x = x;
    this.container.y = y;

    this.pillar = new Graphics();
    // 빛기둥 GPU glow halo — 단조열 ember 윤곽으로 정체성 강화 (DEC-039 / pixijs-references P1).
    this.pillar.filters = [new GlowFilter({
      color: EMBER_GLOW_COLOR,
      radius: 12,
      intensity: 1.4,
      coreBoost: 0.6,
    })];
    this.container.addChild(this.pillar);
    this.drawIdle(0);
  }

  /** 호흡 펄스 + 빛기둥 — 매 프레임 갱신. */
  private drawIdle(tSec: number): void {
    const w = this.width;
    const h = this.height;
    this.pillar.clear();

    const pulse = 0.75 + Math.sin(tSec * Math.PI * 2 * 0.7) * 0.25;

    // 외곽 광채 — 부드러운 ember glow (alpha low)
    this.pillar.rect(-w / 2 - 4, -h - 12, w + 8, h + 14)
      .fill({ color: EMBER_GLOW_COLOR, alpha: 0.10 * pulse });

    // 빛기둥 본체 — 오렌지 단조열
    this.pillar.rect(-w / 2, -h, w, h)
      .fill({ color: FORGE_EMBER_COLOR, alpha: 0.55 * pulse });
    this.pillar.rect(-w / 2, -h, w, h)
      .stroke({ color: 0x5a3a1a, width: 1 });

    // 핵 — 중심 수직 라인 (가장 밝음)
    const coreW = 4;
    this.pillar.rect(-coreW / 2, -h + 2, coreW, h - 4)
      .fill({ color: PILLAR_INNER_COLOR, alpha: 0.85 * pulse });

    // 바닥 균열 — 침강 위치 표식 (정적)
    this.pillar.moveTo(-w / 2, -1).lineTo(-w / 4, -3).lineTo(0, -1).lineTo(w / 4, -4).lineTo(w / 2, -1)
      .stroke({ color: 0x3a2a14, width: 1 });
  }

  /** 입자 spawn — 빛기둥 내부에서 위로 부유하는 ember. */
  private spawnSpark(): void {
    if (this.sparks.length >= MAX_SPARKS) return;
    const gfx = new Graphics();
    gfx.circle(0, 0, 1).fill({ color: PILLAR_INNER_COLOR, alpha: 0.95 });
    const ox = (Math.random() - 0.5) * (this.width - 4);
    const oy = -2;
    gfx.x = ox;
    gfx.y = oy;
    this.container.addChild(gfx);
    const spark: EmberSpark = {
      gfx,
      vx: (Math.random() - 0.5) * 6,
      vy: -18 - Math.random() * 14,
      life: 700 + Math.random() * 400,
      maxLife: 1100,
    };
    this.sparks.push(spark);
  }

  private updateSparks(dt: number): void {
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.life -= dt;
      if (s.life <= 0) {
        if (s.gfx.parent) s.gfx.parent.removeChild(s.gfx);
        s.gfx.destroy();
        this.sparks.splice(i, 1);
        continue;
      }
      const dtSec = dt / 1000;
      s.gfx.x += s.vx * dtSec;
      s.gfx.y += s.vy * dtSec;
      s.gfx.alpha = Math.max(0, s.life / s.maxLife);
    }
  }

  update(dt: number): void {
    if (!this.active) return;
    this.timer += dt;
    this.drawIdle(this.timer / 1000);

    this.sparkTimer -= dt;
    if (this.sparkTimer <= 0) {
      this.spawnSpark();
      this.sparkTimer = SPARK_INTERVAL_MS;
    }
    this.updateSparks(dt);
  }

  /**
   * Player 가 proximity 안인지 검사. ItemWorldScene 가 매 프레임 호출.
   * @param px Player 중심 X
   * @param py Player 중심 Y
   */
  isPlayerNear(px: number, py: number): boolean {
    if (!this.active) return false;
    const cx = this.x;
    const cy = this.y - this.height / 2;
    const dx = px - cx;
    const dy = py - cy;
    return dx * dx + dy * dy <= this.proximity * this.proximity;
  }

  // setPromptVisible / buildPrompt 폐기 — KeyPrompt UI 는 ItemWorldScene 의
  // updateTrapdoor 가 anvilPrompt 패턴 (uiContainer 추가 + world→screen 변환)
  // 으로 직접 관리한다. Trapdoor 본체는 빛기둥/입자/proximity 검사만.

  /**
   * 인터랙트 — Scene 측에서 ATTACK isJustPressed + isPlayerNear 가 모두 true 일 때 호출.
   * 한번 activate 되면 prompt 영구 숨김 + active=false. Scene 가 transitionState
   * 를 'descent_fall' 로 전환하고 시퀀스를 시작하는 책임.
   */
  activate(): void {
    if (this.consumed) return;
    this.consumed = true;
    this.active = false;
  }

  /** AABB — 디버그/충돌 체크용. 실제 충돌은 주입하지 않는다. */
  getAABB(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.x - this.width / 2,
      y: this.y - this.height,
      width: this.width,
      height: this.height,
    };
  }

  destroy(): void {
    for (const s of this.sparks) {
      if (s.gfx.parent) s.gfx.parent.removeChild(s.gfx);
      s.gfx.destroy();
    }
    this.sparks.length = 0;
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
    this.container.destroy({ children: true });
  }
}
