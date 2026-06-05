/**
 * ArcTether.ts
 *
 * 무기 Ego(검)가 컨테이너에 뻗는 절연 아크 — 원격 GRAB 의 시각 통합.
 *
 * 3단계 상태머신:
 *   - hover : 락온된 컨테이너 위에 작은 spark 2~4개가 호기심처럼 튀어다님.
 *             (KeyPrompt 와 병행. 검이 흥미를 가진다는 신호)
 *   - pull  : 검에서 컨테이너로 jagged lightning (segment 6) 강하게 spawn.
 *             컨테이너가 어깨로 가속 보간되는 동안 풀 강도로 유지.
 *   - hold  : 픽업 완료 후 thin tether + 호흡 펄스. "검과 연결됐다" 시그널.
 *
 * 페르소나 정합:
 *   - Spark 기질(흰빛·호기심) 단색 시그니처 — 흰 코어 + Spark 노랑(#FFE033)
 *   - ChargedCrate / ChargedCell 잡을 때 boosted=true : 굵기 +50% / 분기 +1.
 *
 * Graphics 기반 procedural — 자산 0개. 매 프레임 clear+redraw.
 */

import { Container, Graphics } from 'pixi.js';
import { destroyDisplayObject } from '../scenes/shared/DisplayObjectLifecycleHelpers';

export type ArcPhase = 'hover' | 'pull' | 'hold';

interface ArcEndpoint { x: number; y: number; }

const SPARK_CORE = 0xffffff;
const SPARK_EDGE = 0xffe033;

export class ArcTether {
  readonly container = new Container();
  private gfx = new Graphics();
  private phase: ArcPhase = 'hover';
  private elapsed = 0;
  private boosted = false;
  private active = false;

  constructor() {
    this.container.addChild(this.gfx);
  }

  getPhase(): ArcPhase { return this.phase; }
  isVisible(): boolean { return this.active; }

  setHover(boosted: boolean): void {
    if (this.phase !== 'hover') this.elapsed = 0;
    this.phase = 'hover';
    this.boosted = boosted;
    this.active = true;
  }

  startPull(boosted: boolean): void {
    this.phase = 'pull';
    this.elapsed = 0;
    this.boosted = boosted;
    this.active = true;
  }

  setHold(boosted: boolean): void {
    if (this.phase !== 'hold') this.elapsed = 0;
    this.phase = 'hold';
    this.boosted = boosted;
    this.active = true;
  }

  hide(): void {
    this.active = false;
    this.gfx.clear();
  }

  /** Per-frame update — caller passes player anchor and target center. */
  update(dtMs: number, from: ArcEndpoint, to: ArcEndpoint): void {
    if (!this.active) { this.gfx.clear(); return; }
    this.elapsed += dtMs;
    this.gfx.clear();
    switch (this.phase) {
      case 'hover': this.drawHover(to); break;
      case 'pull':  this.drawPull(from, to); break;
      case 'hold':  this.drawHold(from, to); break;
    }
  }

  destroy(): void {
    destroyDisplayObject(this.container, { children: true });
  }

  // ── draw routines ────────────────────────────────────────────────────────

  /** Hover — small drifting sparks above the target. No tether line. */
  private drawHover(to: ArcEndpoint): void {
    const count = this.boosted ? 4 : 3;
    const phase = this.elapsed * 0.012;
    for (let i = 0; i < count; i++) {
      const seed = i * 1.7 + phase;
      const sx = to.x + Math.sin(seed * 2.3) * 10;
      const sy = to.y - 10 + Math.cos(seed * 1.7) * 4;
      const a = 0.45 + Math.sin(phase * 3.1 + i) * 0.35;
      const alpha = Math.max(0.1, Math.min(1, a));
      this.gfx.rect(sx - 1, sy - 1, 2, 2).fill({ color: SPARK_CORE, alpha });
      this.gfx.rect(sx, sy, 1, 1).fill({ color: SPARK_EDGE, alpha });
    }
  }

  /** Pull — strong jagged lightning from sword to target. */
  private drawPull(from: ArcEndpoint, to: ArcEndpoint): void {
    // Halo (outer noise) → core (bright white). Order matters for blending.
    this.drawJaggedArc(from, to, 4.5, SPARK_EDGE, 0.45);
    this.drawJaggedArc(from, to, 2.5, SPARK_CORE, 0.95);
    if (this.boosted) {
      // Extra branch — slight offset jitter on the same path.
      this.drawJaggedArc(from, to, 3.5, SPARK_EDGE, 0.55);
    }
    // Endpoint spark cluster on container.
    this.drawEndpointBurst(to, this.boosted ? 5 : 3);
  }

  /** Hold — thin pulsing tether + faint container spark crawl. */
  private drawHold(from: ArcEndpoint, to: ArcEndpoint): void {
    const pulse = 0.55 + Math.sin(this.elapsed * 0.008) * 0.25;
    this.drawJaggedArc(from, to, 2.0, SPARK_EDGE, 0.32 * pulse);
    this.drawJaggedArc(from, to, 1.0, SPARK_CORE, 0.6 * pulse);
    // Tiny crawl spark on container outline.
    const phase = this.elapsed * 0.014;
    const sx = to.x + Math.sin(phase * 2.7) * 12;
    const sy = to.y + Math.cos(phase * 2.1) * 8;
    this.gfx.rect(sx - 1, sy - 1, 2, 2).fill({ color: SPARK_CORE, alpha: 0.5 * pulse });
  }

  private drawEndpointBurst(p: ArcEndpoint, count: number): void {
    const phase = this.elapsed * 0.06;
    for (let i = 0; i < count; i++) {
      const a = phase + (i / count) * Math.PI * 2;
      const r = 4 + Math.sin(phase * 1.7 + i) * 2;
      const sx = p.x + Math.cos(a) * r;
      const sy = p.y + Math.sin(a) * r;
      this.gfx.rect(sx - 1, sy - 1, 2, 2).fill({ color: SPARK_CORE, alpha: 0.85 });
      this.gfx.rect(sx, sy, 1, 1).fill({ color: SPARK_EDGE, alpha: 0.9 });
    }
  }

  /**
   * Jagged segmented line from `from` to `to`. Each segment is perturbed
   * along the perpendicular axis by a procedural noise function so the
   * arc reads as living electricity rather than a straight beam.
   */
  private drawJaggedArc(
    from: ArcEndpoint,
    to: ArcEndpoint,
    width: number,
    color: number,
    alpha: number,
  ): void {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy);
    if (len < 1) return;
    const nx = -dy / len;
    const ny = dx / len;
    // Jitter scales with length but capped — long arcs don't get absurdly wide.
    const jitter = Math.min(10, len * 0.18);
    const segCount = 6;
    const phase = this.elapsed * 0.05;
    let prevX = from.x;
    let prevY = from.y;
    for (let i = 1; i <= segCount; i++) {
      const t = i / segCount;
      let cx = from.x + dx * t;
      let cy = from.y + dy * t;
      if (i < segCount) {
        const off = (Math.sin(phase + i * 1.7) + Math.cos(phase * 0.6 + i * 2.1)) * 0.5 * jitter;
        cx += nx * off;
        cy += ny * off;
      }
      this.gfx.moveTo(prevX, prevY).lineTo(cx, cy).stroke({ color, width, alpha });
      prevX = cx;
      prevY = cy;
    }
  }
}
