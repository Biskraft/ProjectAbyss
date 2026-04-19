/**
 * AnvilTether.ts
 *
 * Sacred Pickup — 첫 아이템 획득 후 LorePopup이 닫히면 플레이어 → 가장 가까운
 * 앵빌까지 점선(4px on / 3px off) tether를 그려 "다음 목적지"를 안내한다.
 *
 * 타이밍 (새 스펙):
 *   - LorePopup 닫힘 시 생성, FADE_IN(150ms)로 페이드 인.
 *   - 자동 HOLD/FADE_OUT 없음 — 플레이어가 앵빌에 도달해 `requestFadeOut()`
 *     호출 시까지 지속.
 *   - requestFadeOut 이후 FADE_OUT(250ms) 페이드 아웃 → isDone = true.
 *
 * 엔드포인트는 매 프레임 `setEndpoints(fromX, fromY, toX, toY)`로 갱신할 수 있다.
 */

import { Container, Graphics } from 'pixi.js';
import type { Rarity } from '@data/weapons';
import { RARITY_COLOR } from '@items/ItemInstance';

const DASH_ON = 4;
const DASH_OFF = 3;
const FADE_IN = 150;
const FADE_OUT = 250;
const LINE_WIDTH = 1;

type Phase = 'fade_in' | 'hold' | 'fade_out' | 'done';

export class AnvilTether {
  readonly container: Container;
  private gfx: Graphics;
  private color: number;
  private fromX: number;
  private fromY: number;
  private toX: number;
  private toY: number;
  private phase: Phase = 'fade_in';
  private phaseTimer = 0;
  private elapsed = 0;

  constructor(fromX: number, fromY: number, toX: number, toY: number, rarity: Rarity) {
    this.fromX = fromX;
    this.fromY = fromY;
    this.toX = toX;
    this.toY = toY;
    this.color = RARITY_COLOR[rarity];

    this.container = new Container();
    this.gfx = new Graphics();
    this.container.addChild(this.gfx);
    this.container.alpha = 0;
    this.draw(0);
  }

  get isDone(): boolean { return this.phase === 'done'; }

  /** 현재 라인의 양 끝점을 갱신. 프레임마다 호출되어 플레이어 이동을 반영한다. */
  setEndpoints(fromX: number, fromY: number, toX: number, toY: number): void {
    this.fromX = fromX;
    this.fromY = fromY;
    this.toX = toX;
    this.toY = toY;
  }

  /** 페이드 아웃을 요청. 이미 fade_out/done이면 무시. */
  requestFadeOut(): void {
    if (this.phase === 'fade_out' || this.phase === 'done') return;
    this.phase = 'fade_out';
    this.phaseTimer = 0;
  }

  update(dt: number): void {
    if (this.phase === 'done') return;
    this.elapsed += dt;
    this.phaseTimer += dt;

    let alpha = 1;
    if (this.phase === 'fade_in') {
      alpha = Math.min(1, this.phaseTimer / FADE_IN);
      if (this.phaseTimer >= FADE_IN) {
        this.phase = 'hold';
        this.phaseTimer = 0;
        alpha = 1;
      }
    } else if (this.phase === 'hold') {
      alpha = 1;
    } else if (this.phase === 'fade_out') {
      alpha = Math.max(0, 1 - this.phaseTimer / FADE_OUT);
      if (this.phaseTimer >= FADE_OUT) {
        this.phase = 'done';
        alpha = 0;
      }
    }
    this.container.alpha = alpha;
    this.draw(this.elapsed);
  }

  /**
   * Re-render the dash pattern. Manual dashes — iterate along the segment in
   * DASH_ON+DASH_OFF increments and draw each "on" segment as its own stroke.
   */
  private draw(t: number): void {
    const g = this.gfx;
    g.clear();

    const dx = this.toX - this.fromX;
    const dy = this.toY - this.fromY;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) return;

    const ux = dx / dist;
    const uy = dy / dist;
    const step = DASH_ON + DASH_OFF;

    // Animated offset so the dashes slowly march toward the anvil.
    const offset = (t * 0.03) % step;
    let d = -offset;
    while (d < dist) {
      const s = Math.max(0, d);
      const e = Math.min(dist, d + DASH_ON);
      if (e > s) {
        const sx = this.fromX + ux * s;
        const sy = this.fromY + uy * s;
        const ex = this.fromX + ux * e;
        const ey = this.fromY + uy * e;
        g.moveTo(sx, sy).lineTo(ex, ey)
          .stroke({ color: this.color, width: LINE_WIDTH, alpha: 0.85 });
      }
      d += step;
    }
  }

  destroy(): void {
    if (this.container.parent) this.container.parent.removeChild(this.container);
    this.container.destroy({ children: true });
  }
}
