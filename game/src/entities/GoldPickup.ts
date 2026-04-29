/**
 * GoldPickup.ts — Collectible gold currency.
 *
 * Once collected, saved permanently and never respawns.
 *
 * Denomination tiers (1 / 5 / 10 / 50 / 100) — visual size and color
 * differ per tier so a burst of mixed coins reads like cash spilling out.
 * Use `spawnBurst(x, y, totalAmount)` for confetti drops on kills/breaks.
 *
 * LDtk entity: GoldPickup (16x16 fixed, pivot bottom-left)
 * Fields:
 *  - Amount (Int): gold amount (default 10)
 */

import { Container, Graphics } from 'pixi.js';
import { isSolid } from '@core/Physics';

const GRAVITY = 720;        // px/s^2 — confetti fall rate
const AIR_FRICTION = 0.965; // per ~16ms tick
const BOB_AMPLITUDE = 2;
const TILE_SIZE = 16;
const SETTLE_VY = 55;       // |vy| below this on a bounce → consider stopping
const SETTLE_VX = 18;       // |vx| below this with floor contact → settle

interface TierVisual {
  size: number;   // outer circle radius (px)
  outer: number;  // outer fill color
  inner: number;  // inner highlight color
  rim: number;    // stroke color
}

/** Visual treatment per denomination. Color unified to gold; size differs per tier. */
const TIER_VISUALS: ReadonlyArray<readonly [number, TierVisual]> = [
  [100, { size: 7, outer: 0xFFD700, inner: 0xFFEE88, rim: 0xCC9900 }],
  [50,  { size: 6, outer: 0xFFD700, inner: 0xFFEE88, rim: 0xCC9900 }],
  [10,  { size: 5, outer: 0xFFD700, inner: 0xFFEE88, rim: 0xCC9900 }],
  [5,   { size: 4, outer: 0xFFD700, inner: 0xFFEE88, rim: 0xCC9900 }],
  [1,   { size: 3, outer: 0xFFD700, inner: 0xFFEE88, rim: 0xCC9900 }],
];

function tierFor(amount: number): TierVisual {
  for (const [threshold, v] of TIER_VISUALS) {
    if (amount >= threshold) return v;
  }
  return TIER_VISUALS[TIER_VISUALS.length - 1][1];
}

const DENOMS = [100, 50, 10, 5, 1] as const;
/** Max total coins per burst — overflow folds smaller denoms into larger ones. */
const MAX_BURST_COINS = 22;

/** Greedy split largest-first, then upconvert if over MAX_BURST_COINS. */
function splitDenominations(amount: number): Array<[number, number]> {
  const counts = new Map<number, number>();
  let remain = amount;
  for (const d of DENOMS) {
    if (remain <= 0) break;
    const n = Math.floor(remain / d);
    if (n > 0) {
      counts.set(d, n);
      remain -= n * d;
    }
  }
  let total = 0;
  for (const c of counts.values()) total += c;
  while (total > MAX_BURST_COINS) {
    let merged = false;
    for (let i = DENOMS.length - 1; i > 0; i--) {
      const small = DENOMS[i];
      const big = DENOMS[i - 1];
      const ratio = big / small;
      const cnt = counts.get(small) ?? 0;
      if (cnt >= ratio) {
        const groups = Math.floor(cnt / ratio);
        counts.set(small, cnt - groups * ratio);
        counts.set(big, (counts.get(big) ?? 0) + groups);
        total = total - groups * ratio + groups;
        merged = true;
        break;
      }
    }
    if (!merged) break;
  }
  const out: Array<[number, number]> = [];
  for (const d of DENOMS) {
    const c = counts.get(d) ?? 0;
    if (c > 0) out.push([d, c]);
  }
  return out;
}

export class GoldPickup {
  container: Container;
  x: number;
  y: number;
  width = 16;
  height = 16;
  amount: number;
  /** Bob center Y. World-space for normal pickups, builder-local for pickups
   *  reparented under GiantBuilder. */
  baseY: number;
  collected = false;

  // Confetti physics — non-zero physicsTimer puts update() in ballistic mode.
  // Settle happens when the coin lands on a solid tile (via roomData), not
  // when the timer expires — otherwise airborne coins freeze mid-air.
  vx = 0;
  vy = 0;
  physicsTimer = 0;
  /** Solid grid for floor + side-wall collision during burst flight. */
  roomData: number[][] | null = null;
  /** True when the coin has come to rest on a tile via burst physics.
   *  Floored coins skip the bob animation (idle hover is for fixed pickups). */
  private floored = false;

  private gfx: Graphics;
  private timer = 0;
  private tier: TierVisual;

  constructor(x: number, y: number, amount: number) {
    this.x = x;
    this.y = y - this.height;
    this.baseY = this.y;
    this.amount = amount;
    this.tier = tierFor(amount);

    this.container = new Container();
    this.container.x = this.x;
    this.container.y = this.y;

    this.gfx = new Graphics();
    this.draw();
    this.container.addChild(this.gfx);
  }

  private draw(): void {
    this.gfx.clear();
    const cx = this.width / 2;
    const cy = this.height / 2;
    const t = this.tier;
    // Spin around the circle's own center. Default pivot (0,0) coincides
    // with where the circles are drawn, so gfx.x/y simply offsets the
    // visual to the container's center.
    this.gfx.x = cx;
    this.gfx.y = cy;
    this.gfx.circle(0, 0, t.size).fill({ color: t.outer, alpha: 0.9 });
    this.gfx.circle(0, 0, Math.max(1, t.size - 2)).fill({ color: t.inner, alpha: 0.6 });
    this.gfx.circle(0, 0, t.size).stroke({ color: t.rim, width: 1 });
  }

  update(dt: number): void {
    if (this.collected) return;
    if (this.physicsTimer > 0) {
      const sec = dt / 1000;
      const halfW = this.width / 2;
      const halfH = this.height / 2;
      const r = this.tier.size;  // visual radius — used so coins rest *on* the tile

      this.vy += GRAVITY * sec;
      this.vx *= Math.pow(AIR_FRICTION, dt / 16);
      this.physicsTimer -= dt;
      this.gfx.rotation += dt * 0.014;

      // ---- X axis: move + side-wall collision (split-axis avoids tunneling). ----
      this.x += this.vx * sec;
      if (this.roomData) {
        const cyMid = Math.floor((this.y + halfH) / TILE_SIZE);
        if (this.vx > 0) {
          const rightX = this.x + halfW + r;
          const cxR = Math.floor(rightX / TILE_SIZE);
          if (isSolid(this.roomData[cyMid]?.[cxR] ?? 0)) {
            this.x = cxR * TILE_SIZE - r - halfW;
            this.vx = -this.vx * 0.45;
          }
        } else if (this.vx < 0) {
          const leftX = this.x + halfW - r;
          const cxL = Math.floor(leftX / TILE_SIZE);
          if (isSolid(this.roomData[cyMid]?.[cxL] ?? 0)) {
            this.x = (cxL + 1) * TILE_SIZE + r - halfW;
            this.vx = -this.vx * 0.45;
          }
        }
      }

      // ---- Y axis: move + floor collision using the visual bottom (center+r). ----
      this.y += this.vy * sec;
      if (this.roomData && this.vy > 0) {
        const cxMid = Math.floor((this.x + halfW) / TILE_SIZE);
        const visualBottom = this.y + halfH + r;
        const cyB = Math.floor(visualBottom / TILE_SIZE);
        if (isSolid(this.roomData[cyB]?.[cxMid] ?? 0)) {
          // Snap so the visual bottom sits exactly on the tile top.
          this.y = cyB * TILE_SIZE - halfH - r;
          this.vy = -this.vy * 0.42;
          this.vx *= 0.78;
          if (Math.abs(this.vy) < SETTLE_VY && Math.abs(this.vx) < SETTLE_VX) {
            this.physicsTimer = 0;
            this.floored = true;
          }
        }
      }

      // Burst window expired without contact — settle in place (no warp).
      if (this.physicsTimer <= 0) {
        this.physicsTimer = 0;
        this.vx = 0;
        this.vy = 0;
        this.baseY = this.y;
        this.gfx.rotation = 0;
        this.timer = 0;
      }

      this.container.x = this.x;
      this.container.y = this.y;
      return;
    }
    // Floored burst coins stay perfectly still (no idle bob).
    if (this.floored) {
      this.container.x = this.x;
      this.container.y = this.y;
      this.gfx.alpha = 1;
      return;
    }
    this.timer += dt;
    this.container.y = this.baseY + Math.sin(this.timer * 0.003) * BOB_AMPLITUDE;
    this.gfx.alpha = 0.7 + Math.sin(this.timer * 0.005) * 0.3;
  }

  collect(): void {
    this.collected = true;
    this.container.visible = false;
  }

  destroy(): void {
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
  }

  /**
   * Splits `totalAmount` into 1/5/10/50/100 denomination coins and returns
   * them with random upward burst velocities (confetti style). Each coin's
   * visual matches its denomination tier. Caller adds them to the scene's
   * gold list and entity layer.
   */
  static spawnBurst(x: number, y: number, totalAmount: number): GoldPickup[] {
    if (totalAmount <= 0) return [];
    const breakdown = splitDenominations(totalAmount);
    const coins: GoldPickup[] = [];
    for (const [denom, count] of breakdown) {
      for (let i = 0; i < count; i++) {
        const coin = new GoldPickup(x, y, denom);
        // Upward cone: -Math.PI/2 ± ~85°, biased upward.
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.95;
        const speed = 160 + Math.random() * 160;
        coin.vx = Math.cos(angle) * speed;
        coin.vy = Math.sin(angle) * speed;
        coin.physicsTimer = 700 + Math.random() * 350;
        coins.push(coin);
      }
    }
    return coins;
  }
}
